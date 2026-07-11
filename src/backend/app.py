import os
import pandas as pd
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Allow cross-origin requests from React frontend

# Paths to datasets
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PRICES_PATH = os.path.join(BASE_DIR, "data", "BrentOilPrices.csv")
EVENTS_PATH = os.path.join(BASE_DIR, "data", "events.csv")

def load_prices_df():
    """Load and clean Brent oil prices."""
    if not os.path.exists(PRICES_PATH):
        raise FileNotFoundError(f"Prices file not found at {PRICES_PATH}")
    df = pd.read_csv(PRICES_PATH)
    df['Date'] = pd.to_datetime(df['Date'], format='mixed')
    df = df.sort_values('Date').reset_index(drop=True)
    return df

def load_events_df():
    """Load and clean events data."""
    if not os.path.exists(EVENTS_PATH):
        raise FileNotFoundError(f"Events file not found at {EVENTS_PATH}")
    df = pd.read_csv(EVENTS_PATH)
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').reset_index(drop=True)
    return df

@app.route("/api/prices", methods=["GET"])
def get_prices():
    try:
        df = load_prices_df()
        
        # Get resampling frequency from request (daily, weekly, monthly)
        freq = request.args.get("downsample", "weekly").lower()
        
        # Resample data
        if freq == "weekly" or freq == "w":
            df_resampled = df.set_index("Date").resample("W").mean().reset_index()
        elif freq == "monthly" or freq == "m" or freq == "me":
            df_resampled = df.set_index("Date").resample("ME").mean().reset_index()
        else:
            df_resampled = df # daily (no downsampling)
            
        # Format for JSON response
        data = []
        for _, row in df_resampled.iterrows():
            if not pd.isna(row['Price']):
                data.append({
                    "date": row['Date'].strftime("%Y-%m-%d"),
                    "price": round(float(row['Price']), 2)
                })
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/events", methods=["GET"])
def get_events():
    try:
        prices_df = load_prices_df()
        events_df = load_events_df()
        
        # Sort prices to query before/after windows
        prices_df = prices_df.set_index("Date")
        
        events_data = []
        for _, row in events_df.iterrows():
            event_date = row['Date']
            
            # Find the closest trading date in prices_df to the event date
            idx = prices_df.index.get_indexer([event_date], method="nearest")[0]
            closest_date = prices_df.index[idx]
            
            # Calculate price change 30 days before and after
            before_date = closest_date - pd.Timedelta(days=30)
            after_date = closest_date + pd.Timedelta(days=30)
            
            # Find closest trading dates for before and after windows
            idx_before = prices_df.index.get_indexer([before_date], method="nearest")[0]
            idx_after = prices_df.index.get_indexer([after_date], method="nearest")[0]
            
            closest_before = prices_df.index[idx_before]
            closest_after = prices_df.index[idx_after]
            
            price_event = float(prices_df.loc[closest_date, 'Price'])
            price_before = float(prices_df.loc[closest_before, 'Price'])
            price_after = float(prices_df.loc[closest_after, 'Price'])
            
            price_change = price_after - price_before
            price_change_pct = (price_change / price_before) * 100 if price_before > 0 else 0
            
            events_data.append({
                "date": event_date.strftime("%Y-%m-%d"),
                "event": row['Event'],
                "category": row['Category'],
                "description": row['Description'],
                "price_at_event": round(price_event, 2),
                "price_before_30d": round(price_before, 2),
                "price_after_30d": round(price_after, 2),
                "price_change": round(price_change, 2),
                "price_change_pct": round(price_change_pct, 2)
            })
            
        return jsonify(events_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/changepoints", methods=["GET"])
def get_changepoints():
    # Return Bayesian change point model outputs
    # These are extracted from notebooks/change_point_analysis.ipynb or reports/change_point_summary.txt
    data = {
        "change_point_date": "2005-03-31",
        "mu_1": 21.50, # Mean price before change point
        "mu_2": 75.69, # Mean price after change point
        "sigma": 18.58, # Model noise
        "shift_amount": 54.19,
        "shift_pct": 252.05,
        "description": "The Bayesian model detects a major structural shift in early 2005, splitting Brent Crude oil prices into two distinct regimes: a low-price regime averaging $21.50/barrel and a high-price regime averaging $75.69/barrel. This shift correlates with the onset of the commodity supercycle driven by rapid industrial growth in emerging markets (China/India) and low OPEC spare capacity."
    }
    return jsonify(data)

@app.route("/api/metrics", methods=["GET"])
def get_metrics():
    try:
        df = load_prices_df()
        
        # Basic price statistics
        prices = df['Price'].values
        avg_price = float(np.mean(prices))
        max_price = float(np.max(prices))
        min_price = float(np.min(prices))
        
        # Calculate latest 30-day annualized rolling volatility
        df['Log_Return'] = np.log(df['Price']).diff()
        latest_vol = float(df['Log_Return'].tail(30).std() * np.sqrt(252))
        
        metrics = {
            "average_price": round(avg_price, 2),
            "max_price": round(max_price, 2),
            "min_price": round(min_price, 2),
            "latest_volatility_annualized": round(latest_vol * 100, 2), # as percentage
            "data_records_count": len(df),
            "min_date": df['Date'].min().strftime("%Y-%m-%d"),
            "max_date": df['Date'].max().strftime("%Y-%m-%d")
        }
        return jsonify(metrics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
