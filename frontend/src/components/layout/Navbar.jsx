import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { Cpu, Activity, BookOpen, Home } from "lucide-react";

export function Navbar() {
    const location = useLocation();

    const links = [
        { name: "Home", path: "/", icon: Home },
        { name: "Simulation", path: "/simulation", icon: Activity },
        { name: "Learn", path: "/learn", icon: BookOpen },
    ];

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
        >
            <div className="max-w-7xl mx-auto">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl px-6 py-3 flex items-center justify-between shadow-2xl shadow-cyan-900/10">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg group-hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-shadow duration-300">
                            <Cpu className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-cyan-400 transition-all duration-300">
                            DVFS Sim
                        </span>
                    </Link>

                    <div className="flex items-center gap-1">
                        {links.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname === link.path;

                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={cn(
                                        "relative px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300",
                                        isActive
                                            ? "text-cyan-400"
                                            : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="navbar-indicator"
                                            className="absolute inset-0 bg-cyan-950/50 border border-cyan-800/50 rounded-xl"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10 font-medium">{link.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.nav>
    );
}
