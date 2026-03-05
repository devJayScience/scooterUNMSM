import React, { useEffect, useState } from 'react';
import { Cpu, Navigation, Zap, Radio, Activity } from 'lucide-react';
import { Scooter3D } from './3d/Scooter3D';

interface IoTSimulationProps {
    scooter: any;
    destinationName: string;
    eta: number;
}

export const IoTSimulation: React.FC<IoTSimulationProps> = ({ scooter, destinationName, eta }) => {
    const [ultrasonicDist, setUltrasonicDist] = useState(250);

    // Simular el sensor ultrasónico rebotando libremente
    useEffect(() => {
        const interval = setInterval(() => {
            setUltrasonicDist(150 + Math.floor(Math.random() * 150));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full h-full bg-[#050505] overflow-hidden flex flex-col items-center justify-center font-sans">

            {/* ESCENA 3D PROFESIONAL (R3F) */}
            <div className="absolute inset-0 z-0">
                <Scooter3D scooter={scooter} proximity={ultrasonicDist} />
            </div>

            {/* --- HUD MINIMALISTA GLASSMORPHISM (OVERLAY) --- */}
            <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between z-50">

                {/* Header HUD: Glassmorphism Ultra-Premium */}
                <div className="flex justify-between items-start animate-fade-in">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex gap-5 items-center">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#b30000] rounded-2xl flex items-center justify-center text-white shadow-lg border border-white/20">
                            <Activity className="animate-pulse w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-white/90 font-black tracking-[0.2em] text-xs uppercase mb-1">Telemetry Stream</h2>
                            <div className="text-[#fde047] font-black text-xl italic tracking-tighter leading-none">
                                {destinationName}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] text-right min-w-[140px]">
                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-1">ETA</div>
                        <div className="text-5xl font-black text-white tracking-tighter tabular-nums leading-none">
                            {eta}<span className="text-sm text-white/40 ml-1">M</span>
                        </div>
                    </div>
                </div>

                {/* Footer HUD: Integración elegante */}
                <div className="flex justify-between items-end gap-10">
                    {/* BATERIA: Minimalist bar */}
                    <div className="flex-1 max-w-md">
                        <div className="flex justify-between items-end mb-2 px-1">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Power Reserve</span>
                            <span className="text-sm font-black text-white">{scooter.battery}%</span>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full border border-white/10 p-[2px] backdrop-blur-md overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-500 to-[#800000] rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                style={{ width: `${scooter.battery}%` }}></div>
                        </div>
                    </div>

                    {/* GPS: Glass Block */}
                    <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-5 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] min-w-[240px]">
                        <div className="text-[10px] text-[#fde047] font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2">
                            <Navigation size={14} /> Global Positioning
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="text-2xl font-bold text-white font-mono tracking-tighter tabular-nums flex justify-between">
                                <span className="text-white/20 font-sans text-xs">LAT</span> {scooter.lat.toFixed(6)}
                            </div>
                            <div className="text-2xl font-bold text-white font-mono tracking-tighter tabular-nums flex justify-between">
                                <span className="text-white/20 font-sans text-xs">LNG</span> {scooter.lng.toFixed(6)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Micro-Paneles Flotantes: Minimalist Edge Design */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-none">
                {[
                    { label: 'Proximity', val: `${ultrasonicDist}cm`, icon: <Radio size={14} />, color: 'text-amber-400' },
                    { label: 'Hub Motor', val: 'BTS-ACTIVE', icon: <Zap size={14} />, color: 'text-red-400' },
                    { label: 'Esp-Core', val: 'S3-ACTIVE', icon: <Cpu size={14} />, color: 'text-emerald-400' }
                ].map((item, i) => (
                    <div key={i} className="group bg-white/5 backdrop-blur-lg border-l-4 border-l-[#800000] border-y border-r border-white/10 p-4 rounded-2xl shadow-xl flex flex-col gap-2 w-44 animate-in slide-in-from-left duration-700" style={{ animationDelay: `${i * 150}ms` }}>
                        <div className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest ${item.color}`}>
                            {item.icon} {item.label}
                        </div>
                        <div className="text-sm text-white font-mono font-black italic tracking-tighter">{item.val}</div>
                        <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full animate-[loading_3s_linear_infinite] ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: '30%' }} />
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};
