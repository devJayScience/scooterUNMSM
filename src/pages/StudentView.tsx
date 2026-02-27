import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/useAppStore';
import { LogOut, Navigation2, Clock, Battery, X, Loader2, History } from 'lucide-react';
import { CampusMap } from '../components/Map/CampusMap';
import { ScooterMarker, type ScooterData } from '../components/Map/ScooterMarker';
import { Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import { CAMPUS_NODES, type Node } from '../config/mapNodes';
import { getOSRMRoute, interpolatePath } from '../services/routing';
import { supabase } from '../services/supabase';

const SPAWN_POINTS: [number, number][] = [
    [-12.0598148, -77.0842696],
    [-12.0595109, -77.0817623],
    [-12.0570514, -77.0815065],
    [-12.0549612, -77.0844253],
    [-12.0535495, -77.0871548],
    [-12.0567407, -77.0871330],
    [-12.0567526, -77.0871495]
];

export const StudentView: React.FC = () => {
    const { setRole, scooters, setScooters, updateScooter, initRealtime, requestScooterRPC } = useAppStore();
    const [selectedScooter, setSelectedScooter] = useState<ScooterData | null>(null);
    const [selectedDestination, setSelectedDestination] = useState<Node | null>(null);
    const [isRequesting, setIsRequesting] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Cargar Historial real del Estudiante
    const loadHistory = async () => {
        const { data, error } = await supabase
            .from('trips')
            .select('*')
            // Podríamos filtrar con .eq('user_id', myId), pero permitimos todo RLS o todos locales
            .order('created_at', { ascending: false })
            .limit(10);

        if (data && !error) {
            setHistory(data);
        }
    };

    // Trip states
    const [tripPhase, setTripPhase] = useState<'idle' | 'calling' | 'riding'>('idle');
    const [activeTrip, setActiveTrip] = useState<{ scooterId: string, eta: number, path: [number, number][] } | null>(null);
    const [studentPos, setStudentPos] = useState<[number, number]>(SPAWN_POINTS[0]);

    useEffect(() => {
        // Spawnear aleatoriamente al estudiante en uno de los puntos
        const randomSpawn = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
        setStudentPos(randomSpawn);
        // Cargar Scooters Iniciales (si no se han cargado)
        const loadScooters = async () => {
            const { data, error } = await supabase.from('scooters').select('*');
            if (data && !error) {
                setScooters(data);
            }
        };

        if (scooters.length === 0) {
            loadScooters();
        }

        // Inicializar subscripción Realtime
        const cleanup = initRealtime();
        loadHistory();
        return () => {
            cleanup();
        };
    }, []);

    const handleRequestScooter = async () => {
        if (!selectedScooter || !selectedDestination) {
            alert("Por favor selecciona un destino.");
            return;
        }

        setIsRequesting(true);

        const success = await requestScooterRPC(selectedScooter.id);
        if (!success) {
            alert("Error: No se pudo reservar el scooter en este momento.");
            setIsRequesting(false);
            return;
        }

        const updated = { ...selectedScooter, status: 'occupied' as const };
        updateScooter(updated);

        // Fase 1: Scooter llegando al estudiante
        const routeToStudent = await getOSRMRoute([updated.lat, updated.lng], studentPos);

        setIsRequesting(false);
        setTripPhase('calling');
        setSelectedScooter(null); // Cerrar sidebar

        let path = routeToStudent ? routeToStudent.path : [[updated.lat, updated.lng], studentPos] as [number, number][];
        // Interpolar para que sea fluido. Un frame por cada 200ms aprox (10 seg = 50 frames)
        const frameCount = 30; // 30 pasos para llegar
        const smoothPath = interpolatePath(path, frameCount);

        const approximatedETA = Math.ceil((routeToStudent ? routeToStudent.duration : 60) / 60); // ETA en mins

        setActiveTrip({
            scooterId: updated.id,
            eta: approximatedETA,
            path: smoothPath
        });

        // Animar al scooter
        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            if (currentStep >= smoothPath.length) {
                clearInterval(interval);
                handleRidingPhase(updated);
            } else {
                updateScooter({ ...updated, lat: smoothPath[currentStep][0], lng: smoothPath[currentStep][1] });
                setActiveTrip(prev => prev ? { ...prev, eta: Math.max(0, approximatedETA - Math.floor(currentStep / (frameCount / approximatedETA))) } : null);
            }
        }, 150); // 150ms * 30 frames = 4.5 segundos físicos en UI
    };

    const handleRidingPhase = async (scooter: ScooterData) => {
        setTripPhase('riding');
        if (!selectedDestination) return; // Fallback typecheck

        // Fase 2: Viajando al destino
        const routeToDest = await getOSRMRoute(studentPos, [selectedDestination.lat, selectedDestination.lng]);
        let path = routeToDest ? routeToDest.path : [studentPos, [selectedDestination.lat, selectedDestination.lng]] as [number, number][];

        const frameCount = 40;
        const smoothPath = interpolatePath(path, frameCount);
        const approximatedETA = Math.ceil((routeToDest ? routeToDest.duration : 120) / 60);

        setActiveTrip({
            scooterId: scooter.id,
            eta: approximatedETA,
            path: smoothPath
        });

        let currentStep = 0;
        const interval = setInterval(async () => {
            currentStep++;
            if (currentStep >= smoothPath.length) {
                clearInterval(interval);
                // Llamada a RPC para liberar el scooter sin requerir privilegios de Admin,
                // reubicándolo en las nuevas coordenadas
                await supabase.rpc('terminar_viaje', {
                    _scooter_id: scooter.id,
                    _lat: selectedDestination.lat,
                    _lng: selectedDestination.lng
                });

                // Actualización UI local anticipada
                updateScooter({ ...scooter, lat: selectedDestination.lat, lng: selectedDestination.lng, status: 'available' });

                // Guardar el viaje completado en Supabase (historial de Trips)
                const newOrderCode = `ORD-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                await supabase.from('trips').insert({
                    order_code: newOrderCode,
                    scooter_id: scooter.id,
                    destination: selectedDestination.name,
                    status: 'Completada'
                });

                // Recargar el historial local del estudiante
                loadHistory();

                setStudentPos([selectedDestination.lat, selectedDestination.lng]);
                setTripPhase('idle');
                setActiveTrip(null);
                setSelectedDestination(null);
            } else {
                const nextPos = smoothPath[currentStep];
                // Movemos a ambos juntos
                updateScooter({ ...scooter, lat: nextPos[0], lng: nextPos[1] });
                setStudentPos(nextPos);
            }
        }, 150);
    };

    return (
        <div className="h-screen w-full flex flex-col bg-[var(--color-unmsm-crema)] relative overflow-hidden">
            <header className="bg-[var(--color-unmsm-guinda)] text-white p-4 shadow-md flex justify-between items-center z-10 w-full relative">
                <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <span className="hidden sm:inline">Scooters UNMSM</span>
                    <span className="sm:hidden">UNMSM</span>
                    <span className="text-[10px] sm:text-xs bg-green-500 px-2 py-1 rounded-full text-white font-medium uppercase tracking-wider">Estudiante</span>
                </h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowHistory(true)}
                        className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 transition-colors px-3 py-1.5 rounded-lg"
                    >
                        <History className="w-4 h-4" />
                        Historial
                    </button>
                    <button
                        onClick={() => setRole(null)}
                        className="flex items-center gap-2 text-sm bg-black/20 hover:bg-black/40 transition-colors px-3 py-1.5 rounded-lg border border-white/10"
                    >
                        <LogOut className="w-4 h-4" />
                        Salir
                    </button>
                </div>
            </header>

            <main className="flex-1 relative flex">
                <div className="flex-1 relative">
                    <CampusMap centerPos={studentPos}>
                        {/* Ubicación del estudiante georeferenciada */}
                        <Marker
                            position={studentPos}
                            icon={new L.DivIcon({
                                html: `<div class="relative flex items-center justify-center w-8 h-8"><div class="absolute w-16 h-16 bg-blue-500/20 rounded-full animate-ping"></div><div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-xl relative z-10"></div></div>`,
                                className: '',
                                iconSize: [32, 32],
                                iconAnchor: [16, 16]
                            })}
                            zIndexOffset={1000}
                        />

                        {scooters.map(scooter => (
                            <ScooterMarker
                                key={scooter.id}
                                scooter={scooter}
                                onClick={(s) => {
                                    if (s.status === 'available' && tripPhase === 'idle') setSelectedScooter(s);
                                }}
                            />
                        ))}

                        {/* Polyline del viaje activo (OSRM Path) */}
                        {activeTrip && (
                            <Polyline positions={activeTrip.path} color={tripPhase === 'riding' ? "var(--color-unmsm-dorado)" : "var(--color-unmsm-guinda)"} weight={5} dashArray={tripPhase === 'riding' ? "" : "8,8"}>
                            </Polyline>
                        )}
                    </CampusMap>

                    {/* Indicador de ETAs sobre el mapa si hay viaje activo */}
                    {activeTrip && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white text-[var(--color-unmsm-guinda)] px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 border-2 border-[var(--color-unmsm-guinda)] animate-pulse">
                            <Clock className="w-5 h-5" />
                            Tu scooter llegará en {activeTrip.eta} min
                        </div>
                    )}
                </div>

                {/* Sidebar de Solicitud */}
                <div className={`absolute right-0 top-0 bottom-0 w-full sm:w-80 bg-white shadow-2xl z-[2000] transform transition-transform duration-300 ease-in-out flex flex-col ${selectedScooter ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-4 bg-[var(--color-unmsm-guinda)] text-white flex justify-between items-center">
                        <h2 className="font-bold">Detalles del Vehículo</h2>
                        <button onClick={() => setSelectedScooter(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {selectedScooter && (
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="text-center mb-6">
                                <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center border-4 border-[var(--color-unmsm-dorado)] shadow-inner mb-4">
                                    <Navigation2 className="w-10 h-10 text-[var(--color-unmsm-guinda)]" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800">{selectedScooter.name}</h3>
                                <p className="text-sm text-gray-500 font-medium mt-1">ID: {selectedScooter.id}</p>
                            </div>

                            <div className="space-y-4 mb-4">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Battery className="w-5 h-5 text-green-500" />
                                        <span className="font-medium text-gray-700">Batería</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{selectedScooter.battery}%</span>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">¿A dónde te diriges?</label>
                                    <select
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white font-medium text-gray-700 focus:outline-none focus:border-[var(--color-unmsm-guinda)] transition-colors"
                                        value={selectedDestination?.id || ''}
                                        onChange={(e) => {
                                            const node = CAMPUS_NODES.find(n => n.id === e.target.value);
                                            setSelectedDestination(node || null);
                                        }}
                                    >
                                        <option value="" disabled>Selecciona un paradero...</option>
                                        {CAMPUS_NODES.map(node => (
                                            <option key={node.id} value={node.id}>{node.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={handleRequestScooter}
                                    disabled={isRequesting || !selectedDestination}
                                    className="w-full bg-[var(--color-unmsm-guinda)] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-[#600000] hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isRequesting ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                            Calculando ruta...
                                        </>
                                    ) : (
                                        'Solicitar Viaje'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel de Solicitud Activa (Viaje en curso) */}
                {activeTrip && tripPhase !== 'idle' && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md bg-white rounded-2xl shadow-2xl z-[2500] border-2 border-[var(--color-unmsm-guinda)] overflow-hidden animate-in slide-in-from-bottom-10">
                        <div className={`p-3 text-white text-center font-bold transition-colors ${tripPhase === 'riding' ? 'bg-[var(--color-unmsm-dorado)] text-black' : 'bg-[var(--color-unmsm-guinda)]'}`}>
                            {tripPhase === 'calling' ? '🛴 Scooter en camino...' : '🎒 Estás viajando en el Scooter'}
                        </div>
                        <div className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center animate-pulse">
                                    <Clock className="w-8 h-8 text-[var(--color-unmsm-guinda)]" />
                                </div>
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Llegada estimada en</p>
                                    <p className="text-2xl sm:text-3xl font-black text-gray-900">{activeTrip.eta} <span className="text-lg text-gray-500 font-bold">min</span></p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-800">Orden activa</p>
                                <p className="text-xs text-gray-500">#{activeTrip.scooterId}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Historial */}
                {showHistory && (
                    <div className="absolute inset-0 z-[3000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-4 bg-[var(--color-unmsm-guinda)] text-white flex justify-between items-center">
                                <h2 className="font-bold flex items-center gap-2">
                                    <History className="w-5 h-5" />
                                    Mis Viajes
                                </h2>
                                <button onClick={() => setShowHistory(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4 overflow-y-auto">
                                <div className="space-y-4">
                                    {history.length > 0 ? history.map((h, i) => (
                                        <div key={i} className="border border-gray-100 bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-gray-900">{h.destination}</p>
                                                    <p className="text-sm text-gray-500 font-medium">Viaje en Campus • {new Date(h.created_at).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${h.status === 'Completada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {h.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-100">
                                                <Navigation2 className="w-4 h-4 text-[var(--color-unmsm-guinda)]" />
                                                <span>{h.scooter_id}</span>
                                                <span className="ml-auto text-xs text-gray-400 font-mono">ID: {h.order_code}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-8 text-gray-500 font-medium">No has realizado viajes aún.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
