"""
Customer Churn S3 Pipeline DAG
================================
This Airflow DAG monitors your AWS S3 bucket every 2 minutes for new CSV files.
When a new file is detected, it:
  1. Downloads the CSV from S3
  2. Runs the XGBoost churn prediction model on every row
  3. Saves all predictions to the SQLite database
  4. Archives the processed file in S3 (moves it to an 'archive/' folder)
"""

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.models import Variable
from datetime import datetime, timedelta
import logging

# Default arguments for all tasks in this DAG
default_args = {
    'owner': 'ChurnAI',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=1),
}


def check_and_process_s3(**context):
    """
    Core task: Scans S3 for new CSV files, runs predictions, saves to DB.
    """
    import os
    import boto3
    import pandas as pd
    import pickle
    import datetime as dt
    from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
    from sqlalchemy.orm import sessionmaker, declarative_base

    # ── Configuration ──────────────────────────────────────────────────────────
    AWS_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID")
    AWS_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
    AWS_REGION     = os.environ.get("AWS_REGION", "eu-north-1")
    BUCKET_NAME    = os.environ.get("S3_BUCKET_NAME")

    MODEL_PATH = "/opt/airflow/backend/model/churn_model.pkl"
    DB_PATH    = "sqlite:////opt/airflow/backend/churn_history.db"

    # ── Database Setup ──────────────────────────────────────────────────────────
    Base = declarative_base()

    class PredictionRecord(Base):
        __tablename__ = "predictions"
        id               = Column(Integer, primary_key=True, index=True)
        timestamp        = Column(DateTime, default=dt.datetime.utcnow)
        tenure           = Column(Integer)
        monthly_charges  = Column(Float)
        contract         = Column(String)
        prediction       = Column(String)
        probability      = Column(Float)

    engine       = create_engine(DB_PATH, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # ── Load ML Model ───────────────────────────────────────────────────────────
    with open(MODEL_PATH, 'rb') as f:
        model_pipeline = pickle.load(f)

    # ── Connect to S3 ───────────────────────────────────────────────────────────
    s3 = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION
    )

    # ── Scan for new CSV files (ignore already-archived files) ──────────────────
    response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix='')
    new_files_processed = 0

    for obj in response.get('Contents', []):
        file_key = obj['Key']

        # Skip files that are already archived or not CSV
        if not file_key.endswith('.csv') or file_key.startswith('archive/'):
            continue

        logging.info(f"[ChurnAI] New file detected in S3: {file_key}")

        # ── Download and Parse ──────────────────────────────────────────────────
        file_obj = s3.get_object(Bucket=BUCKET_NAME, Key=file_key)
        df = pd.read_csv(file_obj['Body'])

        if 'customerID' in df.columns:
            df = df.drop('customerID', axis=1)

        df['TotalCharges'] = pd.to_numeric(df['TotalCharges'], errors='coerce').fillna(0)

        # ── Run Predictions ─────────────────────────────────────────────────────
        probs = model_pipeline.predict_proba(df)[:, 1]
        db    = SessionLocal()

        for i, row in df.iterrows():
            prob       = float(probs[i])
            prediction = "Churn" if prob > 0.5 else "Stay"
            record     = PredictionRecord(
                tenure          = int(row.get('tenure', 0)),
                monthly_charges = float(row.get('MonthlyCharges', 0)),
                contract        = str(row.get('Contract', 'Unknown')),
                prediction      = prediction,
                probability     = round(prob * 100, 2)
            )
            db.add(record)

        db.commit()
        db.close()
        logging.info(f"[ChurnAI] Processed {len(df)} records from {file_key}")

        # ── Archive the processed file in S3 ────────────────────────────────────
        archive_key = f"archive/{file_key}"
        s3.copy_object(Bucket=BUCKET_NAME, CopySource={'Bucket': BUCKET_NAME, 'Key': file_key}, Key=archive_key)
        s3.delete_object(Bucket=BUCKET_NAME, Key=file_key)
        logging.info(f"[ChurnAI] Archived {file_key} → {archive_key}")
        new_files_processed += 1

    if new_files_processed == 0:
        logging.info("[ChurnAI] No new files found in S3 bucket. Waiting for next run...")

    return f"Processed {new_files_processed} file(s)."


# ── DAG Definition ──────────────────────────────────────────────────────────────
with DAG(
    dag_id='churn_s3_pipeline',
    description='Monitors S3 for new customer CSV files and runs AI churn predictions',
    default_args=default_args,
    schedule_interval=timedelta(minutes=2),
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=['churn', 's3', 'ml', 'pipeline'],
) as dag:

    process_s3_files = PythonOperator(
        task_id='check_and_process_s3_files',
        python_callable=check_and_process_s3,
        provide_context=True,
    )

    # Future tasks can be added here and chained with >>
    # e.g. process_s3_files >> send_email_notification
