# dvfs_logic.py
import numpy as np

# Capacitance constant for power calculation (increased for better visualization)
C = 25e-9  # Increased to make power and thermal effects more visible
K_HEAT = 20  # Increased heat generation coefficient for better temperature dynamics
COOL_RATE = 0.18
TEMP_LIMIT = 80

def simulate_tick(state, workload, ambient, dvfs_enabled=True):
    f_min, f_max = 1.2, 4.2
    v_min, v_max = 0.8, 1.2

    if dvfs_enabled:
        freq = f_min + (f_max - f_min) * workload
        volt = v_min + (v_max - v_min) * workload
    else:
        # Fixed frequency mode
        freq = 3.0
        volt = 1.1

    power = C * (volt**2) * (freq * 1e9) * 1e-3
    temp = state["temp"] + K_HEAT * power - COOL_RATE * (state["temp"] - ambient)

    # Thermal throttling
    if temp > TEMP_LIMIT:
        freq *= 0.7
        volt *= 0.9
        power = C * (volt**2) * (freq * 1e9) * 1e-3

    # Calculate efficiency metrics
    ppw = freq / power if power > 0 else 0
    thermal_efficiency = freq / temp if temp > 0 else 0
    
    # Determine system mode
    if power < 0.3:
        system_mode = "Eco"
    elif freq > 3.5:
        system_mode = "Performance"
    elif temp > 80:
        system_mode = "Throttled"
    else:
        system_mode = "Balanced"

    state.update({
        "freq": round(freq, 2),
        "volt": round(volt, 2),
        "power": round(power, 2),
        "temp": round(temp, 1),
        "ppw": round(ppw, 2),
        "thermal_efficiency": round(thermal_efficiency, 4),
        "system_mode": system_mode,
        "workload": workload
    })
    return state



