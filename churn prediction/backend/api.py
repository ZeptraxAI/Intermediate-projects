from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import pickle
import os
import shap
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import boto3
from dotenv import load_dotenv

load_dotenv()

# Load model and metadata
# Resolve paths relative to this file so they work both locally and in Docker
import pathlib
_BASE = pathlib.Path(__file__).parent
MODEL_PATH = str(_BASE / 'model' / 'churn_model.pkl')
METADATA_PATH = str(_BASE / 'model' / 'metadata.pkl')

if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
    raise RuntimeError("Model or metadata not found. Run train_model.py first.")

with open(MODEL_PATH, 'rb') as f:
    model_pipeline = pickle.load(f)

with open(METADATA_PATH, 'rb') as f:
    metadata = pickle.load(f)

# Database Setup
SQLALCHEMY_DATABASE_URL = f"sqlite:///{_BASE / 'churn_history.db'}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PredictionRecord(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    tenure = Column(Integer)
    monthly_charges = Column(Float)
    contract = Column(String)
    prediction = Column(String)
    probability = Column(Float)

Base.metadata.create_all(bind=engine)

# FastAPI App
app = FastAPI(title="Customer Churn Prediction API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input Schema
class CustomerData(BaseModel):
    gender: str
    SeniorCitizen: int
    Partner: str
    Dependents: str
    tenure: int
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    MonthlyCharges: float
    TotalCharges: float

@app.get("/")
def read_root():
    return {"message": "Customer Churn Prediction API is running", "model": metadata['model_name']}

@app.post("/predict")
def predict(data: CustomerData):
    try:
        # Convert input to DataFrame
        df_input = pd.DataFrame([data.dict()])
        
        # Prediction
        prob = model_pipeline.predict_proba(df_input)[0][1]
        prediction = "Churn" if prob > 0.5 else "Stay"
        
        # SHAP calculation
        # Note: SHAP with Pipeline/LogisticRegression
        # For LogisticRegression, we use LinearExplainer on the transformed data
        preprocessor = model_pipeline.named_steps['preprocessor']
        classifier = model_pipeline.named_steps['classifier']
        
        transformed_data = preprocessor.transform(df_input)
        
        # Get feature names after transformation
        # This is tricky with OneHotEncoder in older sklearn, but easier in newer ones
        # We'll use a simplified approach or try to get feature names
        try:
            feature_names = preprocessor.get_feature_names_out()
        except:
            feature_names = [f"f{i}" for i in range(transformed_data.shape[1])]
            
        explainer = shap.Explainer(classifier, transformed_data) # LinearExplainer
        shap_values = explainer(transformed_data)
        
        # Prepare importance for UI
        # We'll take the top 5 contributing features
        contributions = []
        for i, val in enumerate(shap_values.values[0]):
            contributions.append({
                "feature": str(feature_names[i]),
                "impact": float(val)
            })
        
        # Sort by absolute impact
        contributions = sorted(contributions, key=lambda x: abs(x['impact']), reverse=True)[:5]
        
        # Save to DB
        db = SessionLocal()
        record = PredictionRecord(
            tenure=data.tenure,
            monthly_charges=data.MonthlyCharges,
            contract=data.Contract,
            prediction=prediction,
            probability=float(prob * 100)
        )
        db.add(record)
        db.commit()
        db.close()
        
        return {
            "prediction": prediction,
            "probability": round(prob * 100, 2),
            "contributions": contributions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics-data")
def get_analytics_data():
    db = SessionLocal()
    records = db.query(PredictionRecord).all()
    db.close()
    
    if not records:
        return {"contractData": [], "tenureData": [], "chargesData": []}
        
    df = pd.DataFrame([{
        "tenure": r.tenure,
        "monthly_charges": r.monthly_charges,
        "contract": r.contract,
        "prediction": r.prediction,
        "probability": r.probability
    } for r in records])
    
    # Contract Data
    contract_data = []
    for contract in df['contract'].unique():
        subset = df[df['contract'] == contract]
        total = len(subset)
        if total == 0: continue
        churn_count = len(subset[subset['prediction'] == 'Churn'])
        stay_count = total - churn_count
        contract_data.append({
            "name": contract,
            "churn": round((churn_count / total) * 100, 1),
            "stay": round((stay_count / total) * 100, 1)
        })
        
    # Tenure Data
    bins = [0, 12, 24, 36, 48, 60, 72, 1000]
    labels = ['0-12', '13-24', '25-36', '37-48', '49-60', '61-72', '72+']
    df['tenure_bin'] = pd.cut(df['tenure'], bins=bins, labels=labels, right=True, include_lowest=True)
    tenure_data = []
    for bin_label in labels:
        subset = df[df['tenure_bin'] == bin_label]
        if len(subset) > 0:
            churn_count = len(subset[subset['prediction'] == 'Churn'])
            rate = round((churn_count / len(subset)) * 100, 1)
            tenure_data.append({
                "months": bin_label,
                "rate": rate
            })
            
    # Charges Data (Replacing Internet Service)
    charge_bins = [0, 40, 80, 10000]
    charge_labels = ['Low (<$40)', 'Medium ($40-$80)', 'High (>$80)']
    df['charge_bin'] = pd.cut(df['monthly_charges'], bins=charge_bins, labels=charge_labels, right=True, include_lowest=True)
    charges_data = []
    for bin_label in charge_labels:
        subset = df[df['charge_bin'] == bin_label]
        if len(subset) > 0:
            churn_count = len(subset[subset['prediction'] == 'Churn'])
            charges_data.append({
                "name": bin_label,
                "churn": churn_count
            })
            
    return {
        "contractData": contract_data,
        "tenureData": tenure_data,
        "chargesData": charges_data
    }

@app.get("/history")
def get_history():
    db = SessionLocal()
    records = db.query(PredictionRecord).order_by(PredictionRecord.timestamp.desc()).limit(10).all()
    db.close()
    return records

@app.get("/model-stats")
def get_stats():
    # Get model modification time for training_date
    try:
        mod_time = os.path.getmtime(MODEL_PATH)
        training_date = datetime.datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d %H:%M')
    except Exception:
        training_date = "2024-05-13"
        
    return {
        "model_name": metadata.get('model_name', 'Unknown'),
        "roc_auc": metadata.get('roc_auc', 0),
        "accuracy_score": metadata.get('accuracy', 0),
        "precision": metadata.get('precision', 0),
        "f1_score": metadata.get('f1_score', 0),
        "confusion_matrix": metadata.get('confusion_matrix', {'tn': 0, 'fp': 0, 'fn': 0, 'tp': 0}),
        "training_date": training_date
    }

@app.post("/upload-to-s3")
async def upload_file(file: UploadFile = File(...)):
    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "eu-north-1")
        )
        bucket_name = os.getenv("S3_BUCKET_NAME")
        if not bucket_name:
            raise ValueError("S3_BUCKET_NAME environment variable not set")
            
        s3_client.upload_fileobj(file.file, bucket_name, file.filename)
        return {"message": f"File {file.filename} uploaded to S3 successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
