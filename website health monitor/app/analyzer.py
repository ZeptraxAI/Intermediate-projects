import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.storage import get_logs_df

def get_site_statistics(site_id: str) -> Dict[str, Any]:
    """
    Computes advanced telemetry statistics for a specific site using NumPy.
    """
    df = get_logs_df()
    if df.empty:
        return {}
    
    # Filter for this specific site
    site_df = df[df["site_id"] == site_id]
    if site_df.empty:
        return {}
    
    # Extract columns as NumPy arrays
    uptime_array = site_df["is_up"].to_numpy(dtype=bool)
    latency_array = site_df["response_time_ms"].to_numpy(dtype=float)
    status_array = site_df["status_code"].to_numpy(dtype=int)
    
    # 1. Uptime calculations
    total_checks = len(uptime_array)
    successful_checks = np.sum(uptime_array)
    uptime_pct = (successful_checks / total_checks) * 100.0 if total_checks > 0 else 100.0
    
    # 2. Latency calculations (only for successful checks or all check response times)
    # We'll calculate metrics on all attempts, but standard DevOps focuses on successful checks
    success_latencies = latency_array[uptime_array]
    
    if len(success_latencies) == 0:
        avg_latency = 0.0
        median_latency = 0.0
        p95_latency = 0.0
        std_latency = 0.0
        min_latency = 0.0
        max_latency = 0.0
    else:
        avg_latency = float(np.mean(success_latencies))
        median_latency = float(np.median(success_latencies))
        p95_latency = float(np.percentile(success_latencies, 95))
        std_latency = float(np.std(success_latencies))
        min_latency = float(np.min(success_latencies))
        max_latency = float(np.max(success_latencies))
        
    # 3. Latency Outlier Detection using Z-score or IQR
    # We define an outlier as anything greater than mean + 2 * std deviation (or a fixed high latency)
    outliers = []
    if len(success_latencies) > 3 and std_latency > 0:
        threshold = avg_latency + (2.0 * std_latency)
        outlier_indices = np.where(success_latencies > threshold)[0]
        # Map indices back to timestamps in the original data
        success_df = site_df[site_df["is_up"] == True]
        for idx in outlier_indices:
            row = success_df.iloc[idx]
            outliers.append({
                "timestamp": row["timestamp"],
                "latency_ms": float(row["response_time_ms"]),
                "threshold_ms": float(threshold)
            })
            
    # 4. Hourly patterns (which hour has the highest latency?)
    # Parse timestamps
    site_df = site_df.copy()
    site_df["hour"] = pd.to_datetime(site_df["timestamp"]).dt.hour
    hourly_stats = {}
    for hour in range(24):
        hour_data = site_df[site_df["hour"] == hour]
        if not hour_data.empty:
            hour_latencies = hour_data["response_time_ms"].to_numpy()
            hourly_stats[hour] = {
                "avg_latency": float(np.mean(hour_latencies)),
                "uptime": float(np.mean(hour_data["is_up"].to_numpy()) * 100)
            }

    return {
        "site_id": site_id,
        "site_name": site_df["site_name"].iloc[0],
        "url": site_df["url"].iloc[0],
        "total_checks": int(total_checks),
        "uptime_percentage": round(uptime_pct, 2),
        "avg_latency_ms": round(avg_latency, 2),
        "median_latency_ms": round(median_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "std_dev_ms": round(std_latency, 2),
        "min_latency_ms": round(min_latency, 2),
        "max_latency_ms": round(max_latency, 2),
        "outliers_detected": outliers,
        "hourly_performance": hourly_stats
    }

def get_all_sites_statistics() -> List[Dict[str, Any]]:
    """
    Computes stats for all sites.
    """
    df = get_logs_df()
    if df.empty:
        return []
    
    unique_sites = df["site_id"].unique()
    stats_list = []
    for site_id in unique_sites:
        stats = get_site_statistics(site_id)
        if stats:
            stats_list.append(stats)
    return stats_list
