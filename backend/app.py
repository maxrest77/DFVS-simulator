# app.py
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dvfs_logic import simulate_tick
from db import init_db, log_state
import pandas as pd
import sqlite3

app = Flask(__name__)
CORS(app)

# Separate states for DVFS and Fixed mode to maintain independent temperature histories
state_dvfs = {"freq": 1.2, "volt": 0.8, "power": 0.5, "temp": 40.0, "ppw": 0, "thermal_efficiency": 0, "system_mode": "Balanced"}
state_fixed = {"freq": 1.2, "volt": 0.8, "power": 0.5, "temp": 40.0, "ppw": 0, "thermal_efficiency": 0, "system_mode": "Balanced"}

@app.route('/tick', methods=['POST'])
def tick():
    data = request.json
    workload = float(data.get("workload", 0.5))
    ambient = float(data.get("ambient", 25.0))
    dvfs_enabled = data.get("dvfs_enabled", True)
    
    # Use separate states for DVFS and Fixed mode
    if dvfs_enabled:
        global state_dvfs
        state_dvfs = simulate_tick(state_dvfs, workload, ambient, dvfs_enabled)
        log_state(state_dvfs)
        return jsonify(state_dvfs)
    else:
        global state_fixed
        state_fixed = simulate_tick(state_fixed, workload, ambient, dvfs_enabled)
        # Don't log fixed mode to avoid polluting the database
        return jsonify(state_fixed)

@app.route('/export', methods=['GET'])
def export_csv():
    conn = sqlite3.connect("dvfs_logs.db")
    df = pd.read_sql("SELECT * FROM logs", conn)
    conn.close()
    return Response(
        df.to_csv(index=False),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=dvfs_logs.csv"}
    )

@app.route('/summary', methods=['GET'])
def summary():
    conn = sqlite3.connect("dvfs_logs.db")
    df = pd.read_sql("SELECT * FROM logs", conn)
    conn.close()
    
    if df.empty:
        return jsonify({
            "avg_power": 0,
            "max_temp": 0,
            "total_energy": 0,
            "efficiency": 0
        })
    
    return jsonify({
        "avg_power": round(df["power"].mean(), 3),
        "max_temp": round(df["temp"].max(), 2),
        "total_energy": round((df["power"].sum() * 0.1), 2),
        "efficiency": round((df["freq"].mean() / df["power"].mean()), 2) if df["power"].mean() > 0 else 0
    })

if __name__ == '__main__':
    init_db()
    app.run(debug=True)



