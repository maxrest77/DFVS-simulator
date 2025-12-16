import { motion } from "framer-motion";
import { Cpu, Zap, Thermometer, Battery } from "lucide-react";

export default function LearnPage() {
    const sections = [
        {
            id: "intro",
            title: "What is DVFS?",
            icon: Cpu,
            content: (
                <>
                    <p className="mb-4">
                        <strong>Dynamic Voltage and Frequency Scaling (DVFS)</strong> is a power management
                        technique used in modern processors to dynamically adjust the operating voltage
                        and clock frequency of the CPU based on current workload demands.
                    </p>
                    <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 my-6">
                        <h4 className="text-cyan-400 font-mono mb-2">Core Equation</h4>
                        <code className="text-lg text-white">P = C × V² × f</code>
                        <ul className="mt-4 space-y-2 text-sm text-slate-400">
                            <li>• <strong>P</strong> = Power Consumption</li>
                            <li>• <strong>C</strong> = Capacitance (Constant)</li>
                            <li>• <strong>V</strong> = Voltage (Has quadratic impact!)</li>
                            <li>• <strong>f</strong> = Frequency</li>
                        </ul>
                    </div>
                </>
            )
        },
        {
            id: "voltage",
            title: "Why Scale Voltage?",
            icon: Zap,
            content: (
                <>
                    <p className="mb-4">
                        Clock frequency is linear to power, but voltage is <strong>quadratic</strong>.
                        This means reducing voltage has a massive impact on power savings.
                    </p>
                    <p>
                        However, transistors need a certain minimum voltage to switch at higher frequencies.
                        So, when we lower frequency, we can safely lower voltage too, multiplying the savings.
                    </p>
                </>
            )
        },
        {
            id: "thermal",
            title: "Thermal Management",
            icon: Thermometer,
            content: (
                <>
                    <p className="mb-4">
                        Processors generate heat relative to the power they consume. If heat isn't dissipated
                        fast enough, the temperature rises.
                    </p>
                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <h4 className="font-bold text-red-400 mb-1">Thermal Throttling</h4>
                        <p className="text-sm">
                            When T &gt; 80°C, the system forcibly reduces frequency and voltage to prevent hardware damage.
                            You can observe this behavior in the simulator by maxing out the workload.
                        </p>
                    </div>
                </>
            )
        }
    ];

    return (
        <div className="min-h-screen pt-24 pb-20 px-6 max-w-5xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-12 text-center"
            >
                <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    Understanding DVFS
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Deep dive into the theoretical foundations of processor power management.
                </p>
            </motion.div>

            <div className="grid gap-8">
                {sections.map((section, index) => (
                    <motion.div
                        key={section.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-slate-800/50 backdrop-blur border border-slate-700 p-8 rounded-2xl md:flex gap-8 items-start"
                    >
                        <div className={`p-4 rounded-xl bg-slate-700/50 text-cyan-400 mb-4 md:mb-0 shrink-0`}>
                            <section.icon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-white">{section.title}</h2>
                            <div className="text-slate-300 leading-relaxed">
                                {section.content}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
