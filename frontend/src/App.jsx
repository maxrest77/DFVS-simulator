import { Routes, Route } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import LandingPage from "./pages/LandingPage";
import SimulationPage from "./pages/SimulationPage";
import LearnPage from "./pages/LearnPage";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/simulation" element={<SimulationPage />} />
        <Route path="/learn" element={<LearnPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;