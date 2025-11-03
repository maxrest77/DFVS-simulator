import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

function App() {
  const [workload, setWorkload] = useState(0.5);
  const [ambient, setAmbient] = useState(25);
  const [showComparison, setShowComparison] = useState(false);
  const [data, setData] = useState([]);
  const [fixedData, setFixedData] = useState([]);
  const [state, setState] = useState({ 
    freq: 1.2, volt: 0.8, power: 0.5, temp: 40, 
    ppw: 0, thermal_efficiency: 0, system_mode: "Balanced" 
  });
  const [summary, setSummary] = useState({ avg_power: 0, max_temp: 0, total_energy: 0, efficiency: 0 });
  const [activeTab, setActiveTab] = useState("frequency");
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [stats, setStats] = useState({ peakFreq: 0, lowestPower: 999, throttledTime: 0, avgEfficiency: 0 });
  const [energySavings, setEnergySavings] = useState(0);
  const [batteryLife, setBatteryLife] = useState({ dvfs: 0, fixed: 0 });
  const [alerts, setAlerts] = useState([]);
  const previousModeRef = useRef(state.system_mode);

  // Fetch summary every 10 seconds
  useEffect(() => {
    const summaryInterval = setInterval(() => {
      axios.get("http://127.0.0.1:5000/summary")
        .then(res => setSummary(res.data))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(summaryInterval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      // Always fetch DVFS mode (main data)
      axios.post("http://127.0.0.1:5000/tick", { workload, ambient, dvfs_enabled: true })
        .then(res => {
          setState(res.data);
          setData(prev => {
            const newData = [...prev.slice(-50), { time: prev.length, ...res.data }];
            // Calculate statistics
            const peakFreq = Math.max(...newData.map(d => d.freq || 0));
            const lowestPower = Math.min(...newData.map(d => d.power || 999));
            const throttledCount = newData.filter(d => d.system_mode === "Throttled").length;
            const avgEfficiency = newData.reduce((sum, d) => sum + (d.ppw || 0), 0) / newData.length;
            setStats({
              peakFreq,
              lowestPower,
              throttledTime: (throttledCount / newData.length) * 100,
              avgEfficiency
            });
            return newData;
          });
        })
        .catch(() => {});

      // Also fetch fixed mode for comparison (always track, show when comparison enabled)
      axios.post("http://127.0.0.1:5000/tick", { workload, ambient, dvfs_enabled: false })
        .then(res => {
          setFixedData(prev => {
            const newFixed = [...prev.slice(-50), { time: prev.length, ...res.data }];
            // Calculate energy savings
            if (data.length > 0 && newFixed.length > 0) {
              const dvfsEnergy = data.reduce((sum, d) => sum + (d.power || 0), 0);
              const fixedEnergy = newFixed.reduce((sum, d) => sum + (d.power || 0), 0);
              const savings = fixedEnergy > 0 ? ((fixedEnergy - dvfsEnergy) / fixedEnergy) * 100 : 0;
              setEnergySavings(savings);
              
              // Calculate battery life (assuming 5000mAh battery @ 3.7V)
              const batteryCapacity = 18.5; // Wh
              const dvfsHours = batteryCapacity / (dvfsEnergy / data.length / 3600);
              const fixedHours = batteryCapacity / (fixedEnergy / newFixed.length / 3600);
              setBatteryLife({ dvfs: dvfsHours, fixed: fixedHours });
            }
            return newFixed;
          });
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(interval);
  }, [workload, ambient]);

  // Detect mode changes and add alerts
  useEffect(() => {
    if (state.system_mode && state.system_mode !== previousModeRef.current) {
      addAlert(`System mode changed to: ${state.system_mode}`, state.system_mode === "Throttled" ? "error" : "info");
      previousModeRef.current = state.system_mode;
    }
    if (state.temp >= 75 && state.temp < 80) {
      addAlert("⚠️ Approaching thermal limit!", "warning");
    }
    if (state.temp >= 80) {
      addAlert("🔥 THERMAL THROTTLING ACTIVE!", "error");
    }
  }, [state.system_mode, state.temp]);

  const addAlert = (message, type) => {
    const alert = { id: Date.now(), message, type };
    setAlerts(prev => [...prev, alert]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
    }, 3000);
  };

  const handlePreset = (preset) => {
    if (preset === "idle") {
      setWorkload(0.2);
      setAmbient(25);
    } else if (preset === "balanced") {
      setWorkload(0.5);
      setAmbient(27);
    } else if (preset === "stress") {
      setWorkload(1.0);
      setAmbient(35);
    } else if (preset === "video") {
      setWorkload(0.6);
      setAmbient(30);
    } else if (preset === "gaming") {
      setWorkload(0.95);
      setAmbient(35);
    } else if (preset === "web") {
      setWorkload(0.2);
      setAmbient(25);
    } else if (preset === "battery") {
      setWorkload(0.15);
      setAmbient(20);
    }
  };

  const handleExport = () => {
    axios.get("http://127.0.0.1:5000/export", { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'dvfs_logs.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => {});
  };

  const getModeColor = (mode) => {
    switch(mode) {
      case "Eco": return "text-green-400";
      case "Performance": return "text-yellow-400";
      case "Throttled": return "text-red-400";
      default: return "text-blue-400";
    }
  };

  const getAlertColor = (type) => {
    switch(type) {
      case "error": return "bg-red-500/90 border-red-400";
      case "warning": return "bg-yellow-500/90 border-yellow-400";
      case "success": return "bg-green-500/90 border-green-400";
      default: return "bg-blue-500/90 border-blue-400";
    }
  };

  const workloadPercent = (state.workload || workload) * 100;
  const gaugeColor = workloadPercent > 80 ? "#ef4444" : workloadPercent > 50 ? "#f59e0b" : "#10b981";

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return;
      switch(e.key) {
        case '1': handlePreset("idle"); break;
        case '2': handlePreset("balanced"); break;
        case '3': handlePreset("stress"); break;
        case '4': handlePreset("video"); break;
        case '5': handlePreset("gaming"); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      {/* Alert Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-96">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className={`p-4 rounded-lg shadow-xl border ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{alert.type === "error" ? "🔥" : alert.type === "warning" ? "⚠️" : "ℹ️"}</span>
                <span className="font-semibold text-sm">{alert.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-6 text-center bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent"
      >
        DVFS Simulator Dashboard
      </motion.h1>

      {/* Energy Savings Badge */}
      <AnimatePresence>
        {energySavings > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto mb-6 bg-gradient-to-r from-green-600/30 to-emerald-600/30 border border-green-500 rounded-xl p-4 backdrop-blur-lg"
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl">⚡</span>
              <div>
                <div className="text-2xl font-bold text-green-400">{energySavings.toFixed(1)}%</div>
                <div className="text-sm text-gray-300">Energy Saved vs Fixed Mode</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Section with Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl"
        >
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Controls</h2>
          
          <div className="mb-4">
            <label className="block mb-2 text-sm text-gray-300">
              Workload: {(workload * 100).toFixed(0)}%
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={workload}
              onChange={e => setWorkload(parseFloat(e.target.value))} 
              className="w-full accent-cyan-400" 
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 text-sm text-gray-300">
              Ambient Temp: {ambient}°C
            </label>
            <input 
              type="range" 
              min="15" 
              max="40" 
              step="1" 
              value={ambient}
              onChange={e => setAmbient(parseFloat(e.target.value))} 
              className="w-full accent-cyan-400" 
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("idle")}
              className="px-2 py-2 bg-green-600/30 hover:bg-green-600/50 border border-green-500 rounded-lg text-xs transition-colors"
              title="Press 1"
            >
              💤 Idle
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("balanced")}
              className="px-2 py-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500 rounded-lg text-xs transition-colors"
              title="Press 2"
            >
              ⚙️ Balanced
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("stress")}
              className="px-2 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-500 rounded-lg text-xs transition-colors"
              title="Press 3"
            >
              🔥 Stress
            </motion.button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("video")}
              className="px-2 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500 rounded-lg text-xs transition-colors"
              title="Press 4"
            >
              📱 Video
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("gaming")}
              className="px-2 py-2 bg-orange-600/30 hover:bg-orange-600/50 border border-orange-500 rounded-lg text-xs transition-colors"
              title="Press 5"
            >
              🎮 Gaming
            </motion.button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("web")}
              className="px-2 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500 rounded-lg text-xs transition-colors"
            >
              📧 Web
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset("battery")}
              className="px-2 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500 rounded-lg text-xs transition-colors"
            >
              🔋 Battery
            </motion.button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <label className="text-sm text-gray-300">Show Comparison Mode</label>
            <button
              onClick={() => setShowComparison(!showComparison)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                showComparison ? 'bg-cyan-500' : 'bg-gray-600'
              }`}
            >
              <motion.div
                className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full"
                animate={{ x: showComparison ? 24 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExport}
            className="w-full px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500 rounded-lg text-sm transition-colors"
          >
            💾 Download CSV
          </motion.button>
        </motion.div>

        {/* Live Metrics */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl"
        >
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Live Metrics</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-300">Frequency:</span>
              <span className="font-mono text-cyan-400">{state.freq} GHz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Voltage:</span>
              <span className="font-mono text-cyan-400">{state.volt} V</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Power:</span>
              <span className="font-mono text-yellow-400">{state.power.toFixed(3)} W</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Temperature:</span>
              <span className="font-mono text-red-400">{state.temp} °C</span>
            </div>
            <hr className="border-slate-700" />
            <div className="flex justify-between">
              <span className="text-gray-300">PPW:</span>
              <span className="font-mono text-green-400">{state.ppw?.toFixed(2) || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Thermal Eff:</span>
              <span className="font-mono text-green-400">{state.thermal_efficiency?.toFixed(4) || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">System Mode:</span>
              <span className={`font-semibold ${getModeColor(state.system_mode)}`}>
                {state.system_mode || "Balanced"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* CPU Core Gauge */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl flex items-center justify-center"
        >
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-full h-full">
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-700"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="80"
                stroke={gaugeColor}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 80}`}
                strokeDashoffset={2 * Math.PI * 80 * (1 - workloadPercent / 100)}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 2 * Math.PI * 80 }}
                animate={{ 
                  strokeDashoffset: 2 * Math.PI * 80 * (1 - workloadPercent / 100),
                  filter: workloadPercent > 80 ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.8))" : "drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))"
                }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ color: gaugeColor }}>
                {workloadPercent.toFixed(0)}%
              </span>
              <span className="text-sm text-gray-400 mt-1">CPU Load</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Statistics Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl mb-6"
      >
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">📊 Performance Statistics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl mb-1">🏆</div>
            <div className="text-2xl font-bold text-yellow-400">{stats.peakFreq.toFixed(2)} GHz</div>
            <div className="text-xs text-gray-400 mt-1">Peak Frequency</div>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl mb-1">💚</div>
            <div className="text-2xl font-bold text-green-400">{stats.lowestPower.toFixed(3)} W</div>
            <div className="text-xs text-gray-400 mt-1">Lowest Power</div>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-red-400">{stats.throttledTime.toFixed(1)}%</div>
            <div className="text-xs text-gray-400 mt-1">Time Throttled</div>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-2xl font-bold text-cyan-400">{stats.avgEfficiency.toFixed(1)}</div>
            <div className="text-xs text-gray-400 mt-1">Avg Efficiency</div>
          </div>
        </div>
      </motion.div>

      {/* Battery Life Comparison */}
      {batteryLife.dvfs > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl mb-6"
        >
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">🔋 Battery Life Comparison</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{batteryLife.dvfs.toFixed(1)} hrs</div>
              <div className="text-sm text-gray-300 mt-2">With DVFS</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-red-600/20 to-pink-600/20 border border-red-500 rounded-lg">
              <div className="text-3xl font-bold text-red-400">{batteryLife.fixed.toFixed(1)} hrs</div>
              <div className="text-sm text-gray-300 mt-2">Fixed Mode</div>
            </div>
          </div>
          <div className="mt-4 text-center text-green-400 font-semibold">
            +{((batteryLife.dvfs / batteryLife.fixed - 1) * 100).toFixed(1)}% longer battery life
          </div>
        </motion.div>
      )}

      {/* Charts with Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl mb-6"
      >
        <div className="flex gap-2 mb-4 border-b border-slate-700 flex-wrap">
          {[
            { key: "frequency", label: "Frequency vs Time" },
            { key: "power", label: "Power vs Time" },
            { key: "ppw", label: "PPW vs Time" },
            { key: "freq-temp", label: "Frequency vs Temperature" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? "bg-cyan-500/30 text-cyan-400 border-b-2 border-cyan-400"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ResponsiveContainer width="100%" height={350}>
              {activeTab === "frequency" && (
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <Line 
                    type="monotone" 
                    dataKey="freq" 
                    stroke="#06b6d4" 
                    name="DVFS Mode (GHz)" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#06b6d4" }}
                  />
                  {showComparison && (
                    <Line 
                      type="monotone" 
                      dataKey="freq" 
                      data={fixedData}
                      stroke="#ef4444" 
                      name="Fixed Mode 3.0 GHz" 
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={false}
                      activeDot={{ r: 6, fill: "#ef4444" }}
                    />
                  )}
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af" 
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5, style: { fill: '#9ca3af' } }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    domain={[0, 4.5]}
                    label={{ value: 'Frequency (GHz)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                    tickFormatter={(value) => `${value.toFixed(1)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                    formatter={(value) => [`${value.toFixed(2)} GHz`, '']}
                  />
                  <Legend />
                </LineChart>
              )}
              
              {activeTab === "power" && (
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <Line 
                    type="monotone" 
                    dataKey="power" 
                    stroke="#f59e0b" 
                    name="DVFS Mode (W)" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#f59e0b" }}
                  />
                  {showComparison && (
                    <Line 
                      type="monotone" 
                      dataKey="power" 
                      data={fixedData}
                      stroke="#ef4444" 
                      name="Fixed Mode (W)" 
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={false}
                      activeDot={{ r: 6, fill: "#ef4444" }}
                    />
                  )}
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5, style: { fill: '#9ca3af' } }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    domain={[0, 'dataMax + 0.1']}
                    label={{ value: 'Power (Watts)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                    tickFormatter={(value) => `${value.toFixed(3)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                    formatter={(value) => [`${value.toFixed(3)} W`, '']}
                  />
                  <Legend />
                </LineChart>
              )}
              
              {activeTab === "ppw" && (
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <Line 
                    type="monotone" 
                    dataKey="ppw" 
                    stroke="#10b981" 
                    name="DVFS Mode PPW" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#10b981" }}
                  />
                  {showComparison && (
                    <Line 
                      type="monotone" 
                      dataKey="ppw" 
                      data={fixedData}
                      stroke="#ef4444" 
                      name="Fixed Mode PPW" 
                      strokeWidth={3}
                      strokeDasharray="8 4"
                      dot={false}
                      activeDot={{ r: 6, fill: "#ef4444" }}
                    />
                  )}
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5, style: { fill: '#9ca3af' } }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    domain={[0, 'dataMax + 10']}
                    label={{ value: 'Performance per Watt', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
                    tickFormatter={(value) => `${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                    formatter={(value) => [`${value.toFixed(2)} GHz/W`, '']}
                  />
                  <Legend />
                </LineChart>
              )}
              
              {activeTab === "freq-temp" && (
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <Line 
                    type="monotone" 
                    dataKey="freq" 
                    stroke="#06b6d4" 
                    name="Frequency (GHz)" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#06b6d4" }}
                    yAxisId="freq"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temp" 
                    stroke="#f59e0b" 
                    name="Temperature (°C)" 
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, fill: "#f59e0b" }}
                    yAxisId="temp"
                  />
                  {showComparison && (
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="freq" 
                        data={fixedData}
                        stroke="#ef4444" 
                        name="Fixed Mode Freq (GHz)" 
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        dot={false}
                        activeDot={{ r: 6, fill: "#ef4444" }}
                        yAxisId="freq"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="temp" 
                        data={fixedData}
                        stroke="#ec4899" 
                        name="Fixed Mode Temp (°C)" 
                        strokeWidth={3}
                        strokeDasharray="8 4"
                        dot={false}
                        activeDot={{ r: 6, fill: "#ec4899" }}
                        yAxisId="temp"
                      />
                    </>
                  )}
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#9ca3af"
                    label={{ value: 'Time (seconds)', position: 'insideBottom', offset: -5, style: { fill: '#9ca3af' } }}
                  />
                  <YAxis 
                    yAxisId="freq"
                    stroke="#06b6d4" 
                    domain={[0, 4.5]}
                    label={{ value: 'Frequency (GHz)', angle: -90, position: 'insideLeft', style: { fill: '#06b6d4' } }}
                    tickFormatter={(value) => `${value.toFixed(1)}`}
                  />
                  <YAxis 
                    yAxisId="temp"
                    orientation="right"
                    stroke="#f59e0b" 
                    domain={[0, 100]}
                    label={{ value: 'Temperature (°C)', angle: 90, position: 'insideRight', style: { fill: '#f59e0b' } }}
                    tickFormatter={(value) => `${value.toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569', 
                      borderRadius: '8px',
                      color: '#fff'
                    }} 
                    formatter={(value, name) => {
                      if (name.includes('Frequency') || name.includes('Freq')) {
                        return [`${value.toFixed(2)} GHz`, name];
                      } else {
                        return [`${value.toFixed(1)} °C`, name];
                      }
                    }}
                  />
                  <Legend />
                </LineChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* System Summary Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl mb-6"
      >
        <h2 className="text-xl font-semibold mb-4 text-cyan-400">System Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{summary.avg_power} W</div>
            <div className="text-sm text-gray-400 mt-1">Average Power</div>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{summary.max_temp} °C</div>
            <div className="text-sm text-gray-400 mt-1">Max Temperature</div>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{summary.total_energy} J</div>
            <div className="text-sm text-gray-400 mt-1">Total Energy</div>
          </div>
          <div className="text-center p-4 bg-slate-900/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{summary.efficiency}</div>
            <div className="text-sm text-gray-400 mt-1">Efficiency (freq/power)</div>
          </div>
        </div>
      </motion.div>

      {/* Theoretical Insights Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 p-6 rounded-2xl shadow-xl"
      >
        <button
          onClick={() => setInsightsExpanded(!insightsExpanded)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-xl font-semibold text-cyan-400">🧠 Theoretical Insights</h2>
          <motion.span
            animate={{ rotate: insightsExpanded ? 180 : 0 }}
            className="text-2xl"
          >
            ▼
          </motion.span>
        </button>
        
        <AnimatePresence>
          {insightsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-4 space-y-4"
            >
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-400 mb-2">Power Law: P ∝ V²f</h3>
                <p className="text-gray-300 text-sm">
                  Power consumption is proportional to the square of voltage multiplied by frequency. 
                  This is why reducing voltage has a significant impact on power savings. 
                  For example, halving voltage reduces power by 4x.
                </p>
              </div>
              
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-red-400 mb-2">Thermal Throttling</h3>
                <p className="text-gray-300 text-sm">
                  When temperature exceeds 80°C, the CPU automatically reduces frequency (×0.7) and voltage (×0.9) 
                  to prevent overheating. This protects the hardware but reduces performance.
                </p>
              </div>
              
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-400 mb-2">Energy–Performance Tradeoff</h3>
                <p className="text-gray-300 text-sm">
                  Higher frequencies provide better performance but consume exponentially more power. 
                  DVFS dynamically adjusts frequency and voltage based on workload to optimize the balance 
                  between performance and energy efficiency.
                </p>
              </div>
              
              <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-400 mb-2">System Modes</h3>
                <p className="text-gray-300 text-sm">
                  <span className="text-green-400">Eco:</span> Low power mode (P &lt; 0.3W) for idle tasks. 
                  <span className="text-blue-400"> Balanced:</span> Normal operation. 
                  <span className="text-yellow-400"> Performance:</span> High frequency (&gt; 3.5 GHz) for demanding tasks. 
                  <span className="text-red-400"> Throttled:</span> Thermal protection active (T &gt; 80°C).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default App;