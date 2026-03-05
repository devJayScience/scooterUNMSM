import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/useAppStore';
import { LogOut, Navigation2, Clock, Battery, X, Loader2, History } from 'lucide-react';
import { CampusMap } from '../components/Map/CampusMap';
import { ScooterMarker, type ScooterData } from '../components/Map/ScooterMarker';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { CAMPUS_NODES, type Node } from '../config/mapNodes';
import { getOSRMRoute } from '../services/routing';
import { supabase } from '../services/supabase';
import { IoTSimulation } from '../components/IoTSimulation';

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

    // Estados para modales de viaje
    const [showArrivalModal, setShowArrivalModal] = useState(false);
    const [showFinishModal, setShowFinishModal] = useState({ show: false, destination: '' });

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
    const [show3D, setShow3D] = useState<boolean>(false);

    useEffect(() => {
        // Mostrar simulación 3D al solicitar viaje, máximo 10 segundos
        if (tripPhase === 'calling') {
            setShow3D(true);
            const timer = setTimeout(() => {
                setShow3D(false);

                // 1. Mover estudiante al destino
                if (selectedDestination) {
                    setStudentPos([selectedDestination.lat, selectedDestination.lng]);
                }

                // 2. Mostrar modal de fin de recorrido
                setShowFinishModal({
                    show: true,
                    destination: selectedDestination?.name || 'Destino'
                });

                // 3. Liberar el scooter en la base de datos
                if (activeTrip) {
                    supabase.from('scooters').update({ status: 'available' }).eq('id', activeTrip.scooterId).then(() => {
                        // Actualizar localmente también
                        const sc = scooters.find(s => s.id === activeTrip.scooterId);
                        if (sc) updateScooter({ ...sc, status: 'available' });
                    });
                }

                // 4. Resetear estado del viaje
                loadHistory();
                setTripPhase('idle');
                setActiveTrip(null);
                setSelectedDestination(null);
            }, 10000);
            return () => clearTimeout(timer);
        } else if (tripPhase === 'idle') {
            setShow3D(false);
        }
    }, [tripPhase]);

    useEffect(() => {
        // En lugar de spawnear aleatorio, seteamos la misma coordenada dura del Mock de Python
        // para asegurar que el punto A físico coincida matemáticamente con la ruta del backend
        const randomSpawn = SPAWN_POINTS[0]; // (-12.0598148, -77.0842696)
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

    // Gemelo Digital - Observador en Tiempo Real
    useEffect(() => {
        if (!activeTrip) return;

        const rentedScooter = scooters.find(s => s.id === activeTrip.scooterId);
        if (!rentedScooter) return;

        // Si el estado regresó a available o completada, el viaje terminó (Python Script)
        // GUARD: Solo procesamos si no fue ya manejado por el timer de la simulación 3D
        if (rentedScooter.status === 'available' && activeTrip) {
            // Si show3D está activo, ignoramos — el timer del 3D se encargará
            if (show3D) return;

            loadHistory();
            setTripPhase('idle');

            if (selectedDestination) {
                setStudentPos([selectedDestination.lat, selectedDestination.lng]);
            } else {
                setStudentPos([rentedScooter.lat, rentedScooter.lng]);
            }

            // Solo mostrar modal si no hay uno ya visible
            if (!showFinishModal.show) {
                setShowFinishModal({
                    show: true,
                    destination: selectedDestination?.name || 'Destino'
                });
            }

            setActiveTrip(null);
            setSelectedDestination(null);
            return;
        }

        if (rentedScooter.status === 'maintenance') {
            // Un obstáculo reportado por sensor cancela el viaje
            setTripPhase('idle');
            setActiveTrip(null);
            setSelectedDestination(null);
            return;
        }

        // Calcular distancia al estudiante
        if (tripPhase === 'calling') {
            const dist = Math.sqrt(Math.pow(rentedScooter.lat - studentPos[0], 2) + Math.pow(rentedScooter.lng - studentPos[1], 2));
            if (dist < 0.00015 && !showArrivalModal) { // Llegó al punto de estudiante
                setShowArrivalModal(true); // Mostrar modal de llegada
                // No pasamos a 'riding' aún, esperamos el click en el botón del modal
                if (selectedDestination) {
                    getOSRMRoute(studentPos, [selectedDestination.lat, selectedDestination.lng]).then(routeToDest => {
                        setActiveTrip(prev => prev ? {
                            ...prev,
                            path: routeToDest ? routeToDest.path : [studentPos, [selectedDestination.lat, selectedDestination.lng]] as [number, number][],
                            eta: Math.ceil((routeToDest ? routeToDest.duration : 120) / 60)
                        } : null);
                    });
                }
            }
        } else if (tripPhase === 'riding') {
            // Animamos la posición del estudiante PARA QUE VIAJE en el scooter
            setStudentPos([rentedScooter.lat, rentedScooter.lng]);
        }
    }, [scooters]);

    // Polling súper agresivo para asegurar actualización GPS (Bypass de restricción de Supabase Realtime)
    useEffect(() => {
        if (!activeTrip) return;
        const interval = setInterval(async () => {
            const { data } = await supabase.from('scooters').select('lat, lng, status, battery').eq('id', activeTrip.scooterId).single();
            if (data) {
                updateScooter({ ...scooters.find(s => s.id === activeTrip.scooterId), ...data });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [activeTrip]);

    const handleRequestScooter = async () => {
        if (!selectedScooter || !selectedDestination) {
            alert("Por favor selecciona un destino.");
            return;
        }

        setIsRequesting(true);

        // 1. Reservar el scooter (RPC existente)
        const success = await requestScooterRPC(selectedScooter.id);
        if (!success) {
            alert("Error al reservar el scooter.");
            setIsRequesting(false);
            return;
        }

        // --- NUEVO BLOQUE: REGISTRAR EL VIAJE EN LA BASE DE DATOS ---
        const { error: tripError } = await supabase
            .from('trips')
            .insert([{
                order_code: `TRIP-${Math.floor(Math.random() * 10000)}`,
                scooter_id: selectedScooter.id,
                origin: "Puerta 1", // Debería venir de studentPos o un nodo cercano
                destination: selectedDestination.name,
                status: 'Completada', // O 'En curso' si manejas estados dinámicos
                user_id: null // O el ID del usuario si usas Auth
            }]);

        if (tripError) {
            console.error("Error al crear registro de viaje:", tripError);
        }
        // -----------------------------------------------------------

        const updated = { ...selectedScooter, status: 'occupied' as const };
        updateScooter(updated);

        const routeToStudent = await getOSRMRoute([updated.lat, updated.lng], studentPos);

        setIsRequesting(false);
        setTripPhase('calling');
        setSelectedScooter(null);

        let path = routeToStudent ? routeToStudent.path : [[updated.lat, updated.lng], studentPos] as [number, number][];
        const approximatedETA = Math.ceil((routeToStudent ? routeToStudent.duration : 60) / 60);

        setActiveTrip({
            scooterId: updated.id,
            eta: approximatedETA,
            path: path
        });
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

            <main className="flex-1 relative flex bg-sky-200">
                {activeTrip && show3D ? (
                    <div className="flex-1 w-full h-full relative z-[200]">
                        <IoTSimulation
                            scooter={scooters.find(s => s.id === activeTrip.scooterId) || scooters[0]}
                            destinationName={selectedDestination?.name || "Desconocido"}
                            eta={activeTrip.eta}
                        />
                    </div>
                ) : (
                    <div className="flex-1 w-full h-full overflow-hidden relative z-10">
                        <CampusMap centerPos={studentPos}>
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
                        </CampusMap>
                    </div>
                )}

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

                {/* Panel de Solicitud Activa (Viaje en curso) - Oculto durante simulación 3D para evitar traslapes */}
                {activeTrip && tripPhase !== 'idle' && !showArrivalModal && !showFinishModal.show && !scooters.find(s => s.id === activeTrip.scooterId) && (
                    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md bg-white rounded-2xl shadow-2xl z-[2500] border-2 border-[var(--color-unmsm-guinda)] overflow-hidden animate-in slide-in-from-bottom-10">
                        <div className={`p-3 text-white text-center font-bold transition-colors ${tripPhase === 'riding' ? 'bg-[var(--color-unmsm-dorado)] text-black' : 'bg-[var(--color-unmsm-guinda)]'}`}>
                            {tripPhase === 'calling' ? '🛴 Scooter en camino...' : '🎒 Estas viajando en el Scooter'}
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

                {/* Modal de Llegada de Scooter al Estudiante */}
                {showArrivalModal && (
                    <div className="absolute inset-0 z-[4000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <Navigation2 className="w-10 h-10 text-green-600 animate-bounce" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">¡Tu Scooter llegó!</h2>
                            <p className="text-gray-600 font-medium mb-6">Sube al scooter. Iniciando trayecto hacia tu paradero destino...</p>
                            <button
                                onClick={() => {
                                    setShowArrivalModal(false);
                                    setTripPhase('riding'); // Cambiar a 'riding' solo al hacer clic
                                }}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-colors"
                            >
                                ¡Vamos!
                            </button>
                        </div>
                    </div>
                )}

                {/* Modal de Fin de Recorrido */}
                {showFinishModal.show && (
                    <div className="absolute inset-0 z-[4000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 text-center animate-in zoom-in-95">
                            <div className="w-20 h-20 bg-[var(--color-unmsm-dorado)] rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg">
                                <LogOut className="w-10 h-10 text-[var(--color-unmsm-guinda)] translate-x-1" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">¡Fin del Recorrido!</h2>
                            <p className="text-gray-600 font-medium mb-6">Has llegado a <span className="font-bold text-[var(--color-unmsm-guinda)]">{showFinishModal.destination}</span>. ¡Gracias por usar Scooters UNMSM!</p>
                            <button
                                onClick={() => setShowFinishModal({ show: false, destination: '' })}
                                className="w-full py-3 bg-[var(--color-unmsm-guinda)] hover:bg-[#600000] text-white rounded-xl font-bold shadow-lg transition-colors"
                            >
                                Aceptar
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
