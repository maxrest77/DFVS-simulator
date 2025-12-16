import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Cpu, Zap, Thermometer } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen pt-20 px-6 overflow-hidden">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto py-20 relative">
                {/* Background Glows */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] -z-10 animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] -z-10 animate-pulse delay-1000" />

                <div className="text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-block px-4 py-1.5 mb-6 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 font-mono text-sm"
                    >
                        v1.0.0 Now Available
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-6xl md:text-8xl font-bold mb-8 tracking-tight bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent"
                    >
                        Master the Art of <br />
                        <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">Power Scaling</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-xl/relaxed text-slate-400 mb-10 max-w-2xl mx-auto"
                    >
                        Experience Dynamic Voltage and Frequency Scaling (DVFS) in a real-time,
                        interactive simulator. Understand how modern processors manage power, heat, and performance.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center"
                    >
                        <Link
                            to="/simulation"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl font-semibold transition-all shadow-[0_0_40px_-10px_rgba(6,182,212,0.5)] hover:shadow-[0_0_60px_-15px_rgba(6,182,212,0.6)]"
                        >
                            Launch Simulator
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            to="/learn"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold border border-slate-700 transition-all"
                        >
                            Learn the Theory
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="max-w-7xl mx-auto py-20 border-t border-slate-800">
                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={Zap}
                        title="Energy Efficiency"
                        desc="Visualize how voltage scaling quadratically effects power consumption."
                        color="text-yellow-400"
                    />
                    <FeatureCard
                        icon={Thermometer}
                        title="Thermal Throttling"
                        desc="Watch real-time protection mechanisms kick in as temperatures rise."
                        color="text-red-400"
                    />
                    <FeatureCard
                        icon={Cpu}
                        title="Performance Metrics"
                        desc="Analyze Performance per Watt (PPW) and optimize system efficiency."
                        color="text-green-400"
                    />
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon: Icon, title, desc, color }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors"
        >
            <div className={`p-3 rounded-lg bg-slate-800 w-fit mb-4 ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
            <p className="text-slate-400">{desc}</p>
        </motion.div>
    );
}
