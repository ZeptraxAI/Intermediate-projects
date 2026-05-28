import math
from datetime import datetime, timedelta

def predict_price_trends(history_data):
    """
    Analyzes historical price data and predicts price behavior for the next 7 days.
    
    Args:
        history_data (list): List of dicts, e.g. [{"price": 12000.0, "timestamp": "2026-05-20 12:00:00"}, ...]
        
    Returns:
        dict: Detailed statistics, 7-day forecast, and price drop probability.
    """
    if not history_data or len(history_data) < 2:
        return {
            "current_price": history_data[-1]["price"] if history_data else 0,
            "min_price": history_data[-1]["price"] if history_data else 0,
            "max_price": history_data[-1]["price"] if history_data else 0,
            "avg_price": history_data[-1]["price"] if history_data else 0,
            "volatility": 0.0,
            "price_drop_prob": 0,
            "forecast": [],
            "status": "Insufficient data (need at least 2 historical price points)"
        }
        
    # Parse timestamps and sort by them
    parsed_history = []
    for item in history_data:
        price = float(item["price"])
        ts_str = item["timestamp"]
        ts = datetime.strptime(ts_str, "%Y-%m-%d %H:%M:%S")
        parsed_history.append((ts, price, ts_str))
        
    parsed_history.sort(key=lambda x: x[0])
    
    # Extract arrays
    prices = [item[1] for item in parsed_history]
    current_price = prices[-1]
    min_price = min(prices)
    max_price = max(prices)
    avg_price = sum(prices) / len(prices)
    
    # Calculate price volatility (std dev of percentage daily change)
    pct_changes = []
    for i in range(1, len(prices)):
        prev = prices[i-1]
        curr = prices[i]
        if prev > 0:
            pct_changes.append((curr - prev) / prev)
        else:
            pct_changes.append(0.0)
            
    if len(pct_changes) > 1:
        mean_change = sum(pct_changes) / len(pct_changes)
        variance = sum((x - mean_change) ** 2 for x in pct_changes) / (len(pct_changes) - 1)
        volatility = math.sqrt(variance)
        if math.isnan(volatility):
            volatility = 0.0
    else:
        volatility = 0.0
        
    # Prepare features for Linear Regression: days elapsed
    start_date = parsed_history[0][0]
    days_elapsed = []
    for ts, _, _ in parsed_history:
        diff_seconds = (ts - start_date).total_seconds()
        days_elapsed.append(diff_seconds / (24 * 3600))
        
    N = len(days_elapsed)
    sum_x = sum(days_elapsed)
    sum_y = sum(prices)
    sum_xx = sum(x * x for x in days_elapsed)
    sum_xy = sum(x * y for x, y in zip(days_elapsed, prices))
    
    # Solve simple linear regression y = mx + c analytically
    denom = N * sum_xx - sum_x * sum_x
    if abs(denom) < 1e-9:
        slope = 0.0
        intercept = avg_price
    else:
        slope = (N * sum_xy - sum_x * sum_y) / denom
        intercept = (sum_y - slope * sum_x) / N
        
    # Predict for the next 7 days
    last_day = days_elapsed[-1]
    last_date = parsed_history[-1][0]
    
    forecast = []
    for day in range(1, 8):
        future_day = last_day + day
        pred_price = slope * future_day + intercept
        
        # Add standard bounds (cannot drop below 40% of current price or exceed 150%)
        pred_price = max(pred_price, current_price * 0.40)
        pred_price = min(pred_price, current_price * 1.50)
        
        future_date = last_date + timedelta(days=day)
        forecast.append({
            "date": future_date.strftime("%Y-%m-%d"),
            "price": round(pred_price, 2)
        })
        
    # Calculate price drop probability
    # Criteria:
    # 1. Slope of linear regression (if negative, trend is downwards)
    # 2. Distance from max price (if near max, more room to drop)
    # 3. Volatility (higher volatility increases likelihood of price changes)
    
    # Base probability on slope trend
    if slope < 0:
        base_prob = 50 + min(abs(slope) / current_price * 1000, 30) # cap trend contribution at 30%
    else:
        base_prob = 20 - min(slope / current_price * 1000, 15) # upwards trend lowers probability
        
    # Add contribution of distance from max price
    price_range = max_price - min_price
    if price_range > 0:
        dist_from_max_pct = (max_price - current_price) / price_range
        peak_adjustment = (1 - dist_from_max_pct) * 20  # up to +20% if we are at the very peak
        base_prob += peak_adjustment
    
    # Volatility adjustment
    volatility_adjustment = min(volatility * 100, 15)
    base_prob += volatility_adjustment
    
    # Clamp probability to [5, 95]
    price_drop_prob = int(max(5, min(95, base_prob)))
    
    return {
        "current_price": round(current_price, 2),
        "min_price": round(min_price, 2),
        "max_price": round(max_price, 2),
        "avg_price": round(avg_price, 2),
        "volatility": round(volatility, 4),
        "price_drop_prob": price_drop_prob,
        "forecast": forecast,
        "status": "Success"
    }
