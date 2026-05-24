import pandas as pd
import numpy as np
import pickle
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score, precision_score, f1_score, confusion_matrix

# Ensure directories exist
os.makedirs('backend/model', exist_ok=True)

def load_and_preprocess():
    print("Loading data...")
    df = pd.read_csv('backend/data/churn.csv')
    
    # Data Cleaning
    # TotalCharges has some empty strings instead of NaN
    df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce')
    df['TotalCharges'] = df['TotalCharges'].fillna(0)
    
    # Drop customerID
    df = df.drop('customerID', axis=1)
    
    # Encode target
    df['Churn'] = df['Churn'].apply(lambda x: 1 if x == 'Yes' else 0)
    
    X = df.drop('Churn', axis=1)
    y = df['Churn']
    
    # Identify feature types
    numeric_features = ['tenure', 'MonthlyCharges', 'TotalCharges']
    categorical_features = [col for col in X.columns if col not in numeric_features]
    
    return X, y, numeric_features, categorical_features

def train():
    X, y, numeric_features, categorical_features = load_and_preprocess()
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Preprocessing pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)
        ]
    )
    
    models = {
        'LogisticRegression': LogisticRegression(max_iter=1000),
        'RandomForest': RandomForestClassifier(n_estimators=100, random_state=42),
        'XGBoost': XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
    }
    
    best_model = None
    best_score = 0
    best_model_name = ""
    
    results = {}

    for name, model in models.items():
        print(f"Training {name}...")
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])
        
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        score = roc_auc_score(y_test, pipeline.predict_proba(X_test)[:, 1])
        
        print(f"{name} ROC-AUC: {score:.4f}")
        results[name] = score
        
        if score > best_score:
            best_score = score
            best_model = pipeline
            best_model_name = name
            
    print(f"\nBest Model: {best_model_name} with ROC-AUC: {best_score:.4f}")
    
    # Save the best model
    with open('backend/model/churn_model.pkl', 'wb') as f:
        pickle.dump(best_model, f)
        
    # Calculate additional metrics for the best model
    y_pred_best = best_model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred_best)
    precision = precision_score(y_test, y_pred_best)
    f1 = f1_score(y_test, y_pred_best)
    cm = confusion_matrix(y_test, y_pred_best)
    tn, fp, fn, tp = cm.ravel()

    # Save feature names and metadata for the API
    metadata = {
        'model_name': best_model_name,
        'roc_auc': best_score,
        'accuracy': accuracy,
        'precision': precision,
        'f1_score': f1,
        'confusion_matrix': {
            'tn': int(tn),
            'fp': int(fp),
            'fn': int(fn),
            'tp': int(tp)
        },
        'features': X.columns.tolist(),
        'numeric_features': numeric_features,
        'categorical_features': categorical_features
    }
    with open('backend/model/metadata.pkl', 'wb') as f:
        pickle.dump(metadata, f)
        
    print("Model and metadata saved successfully.")

if __name__ == "__main__":
    train()
