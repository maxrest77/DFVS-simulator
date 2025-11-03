# db.py
import sqlite3
from datetime import datetime

DB_FILE = "dvfs_logs.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS logs (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 timestamp TEXT,
                 freq REAL,
                 volt REAL,
                 power REAL,
                 temp REAL,
                 ppw REAL,
                 thermal_efficiency REAL,
                 system_mode TEXT)''')
    
    # Migrate existing databases by adding new columns if they don't exist
    try:
        c.execute("ALTER TABLE logs ADD COLUMN ppw REAL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        c.execute("ALTER TABLE logs ADD COLUMN thermal_efficiency REAL DEFAULT 0")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    try:
        c.execute("ALTER TABLE logs ADD COLUMN system_mode TEXT DEFAULT 'Balanced'")
    except sqlite3.OperationalError:
        pass  # Column already exists
    
    conn.commit()
    conn.close()

def log_state(state):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""INSERT INTO logs (timestamp, freq, volt, power, temp, ppw, thermal_efficiency, system_mode) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
              (datetime.now().isoformat(), 
               state.get("freq", 0), 
               state.get("volt", 0), 
               state.get("power", 0), 
               state.get("temp", 0),
               state.get("ppw", 0),
               state.get("thermal_efficiency", 0),
               state.get("system_mode", "Balanced")))
    conn.commit()
    conn.close()

def export_csv():
    import pandas as pd
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query("SELECT * FROM logs", conn)
    file = "simulation_output.csv"
    df.to_csv(file, index=False)
    conn.close()
    return file



