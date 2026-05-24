import os
import time
import boto3
import pandas as pd
import pickle
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from api import PredictionRecord, Base
from dotenv import load_dotenv

load_dotenv()

# AWS Configuration
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./backend/churn_history.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Load model
with open('backend/model/churn_model.pkl', 'rb') as f:
    model_pipeline = pickle.load(f)

def process_file(df):
    """Runs prediction on a dataframe and saves to DB"""
    db = SessionLocal()
    
    # Pre-process numeric types if needed
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce').fillna(0)
    
    # Run Batch Prediction
    probs = model_pipeline.predict_proba(df)[:, 1]
    
    for i, row in df.iterrows():
        prob = float(probs[i])
        prediction = "Churn" if prob > 0.5 else "Stay"
        
        record = PredictionRecord(
            tenure=int(row['tenure']),
            monthly_charges=float(row['MonthlyCharges']),
            contract=row['Contract'],
            prediction=prediction,
            probability=round(prob * 100, 2)
        )
        db.add(record)
    
    db.commit()
    db.close()
    print(f"Processed batch of {len(df)} records.")

def start_pipeline():
    if not AWS_ACCESS_KEY or not BUCKET_NAME:
        print("AWS Credentials missing. Running in SIMULATION MODE...")
        # Simulation: Read from local data periodically
        df_full = pd.read_csv('backend/data/churn.csv').drop('customerID', axis=1)
        while True:
            # Pick 10 random rows to simulate "new data" arriving
            sample = df_full.sample(10)
            process_file(sample)
            print("Simulation: 10 new records added from 'S3'. Waiting 30s...")
            time.sleep(30)
    else:
        print(f"Connecting to S3 Bucket: {BUCKET_NAME}")
        s3 = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION
        )
        
        processed_files = set()
        
        while True:
            try:
                response = s3.list_objects_v2(Bucket=BUCKET_NAME)
                for obj in response.get('Contents', []):
                    file_key = obj['Key']
                    if file_key.endswith('.csv') and file_key not in processed_files:
                        print(f"New file detected: {file_key}")
                        
                        # Download and process
                        file_obj = s3.get_object(Bucket=BUCKET_NAME, Key=file_key)
                        df = pd.read_csv(file_obj['Body'])
                        
                        # Data validation (drop ID if present)
                        if 'customerID' in df.columns:
                            df = df.drop('customerID', axis=1)
                        
                        process_file(df)
                        processed_files.add(file_key)
                        
                time.sleep(60) # Wait 1 minute before next scan
            except Exception as e:
                print(f"Pipeline Error: {e}")
                time.sleep(60)

if __name__ == "__main__":
    start_pipeline()
