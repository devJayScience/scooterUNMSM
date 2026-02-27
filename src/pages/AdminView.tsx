import React, { useState } from 'react';
import { useAppStore } from '../context/useAppStore';
import { LogOut, LayoutDashboard, Map as MapIcon, Database, Battery, CheckCircle2, Play, Menu, X, Plus, Trash2 } from 'lucide-react';
import { CampusMap } from '../components/Map/CampusMap';
import { ScooterMarker } from '../components/Map/ScooterMarker';
import { supabase } from '../services/supabase';

export const AdminView: React.FC = () => {
    const { setRole, scooters, setScooters } = useAppStore();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'inventory' | 'history'>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    // Estados para CRUD
    const [isAddingScooter, setIsAddingScooter] = useState(false);
    const [newScooterForm, setNewScooterForm] = useState({ id: '', name: '', battery: 100, lat: -12.0560, lng: -77.0840 });
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    React.useEffect(() => {
        // Cargar Scooters Iniciales (si no se cargaron)
        const loadScooters = async () => {
            const { data, error } = await supabase.from('scooters').select('*');
            if (data && !error) {
                setScooters(data);
            }
        };

        if (scooters.length === 0) {
            loadScooters();
        }

        // Cargar Historial de Viajes Real
        const loadHistory = async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (data && !error) {
                setHistory(data);
            }
        };

        loadHistory();
    }, [scooters.length, setScooters]);

    // HANDLERS CRUD
    const handleAddScooter = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction('add');
        const scToInsert = { ...newScooterForm, status: 'available' };

        const { data, error } = await supabase.from('scooters').insert(scToInsert).select();

        if (error) {
            alert('Error al añadir Scooter (Quizás el ID ya existe o problema de red): ' + error.message);
        } else if (data) {
            setScooters([...scooters, data[0]]);
            setIsAddingScooter(false);
            setNewScooterForm({ id: '', name: '', battery: 100, lat: -12.0560, lng: -77.0840 });
        }
        setLoadingAction(null);
    };

    const handleDeleteScooter = async (id: string) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar permanentemente el scooter ${id}?`)) return;

        setLoadingAction(`delete-${id}`);
        const { error } = await supabase.from('scooters').delete().eq('id', id);

        if (error) {
            alert('Error al eliminar scooter: ' + error.message);
        } else {
            setScooters(scooters.filter(s => s.id !== id));
        }
        setLoadingAction(null);
    };

    const handleUpdateStatus = async (id: string, currentStatus: string, newStatus: string) => {
        if (currentStatus === newStatus) return;

        setLoadingAction(`status-${id}`);
        const { error } = await supabase.from('scooters').update({ status: newStatus }).eq('id', id);

        if (error) {
            alert('Error al actualizar estado: ' + error.message);
        } else {
            setScooters(scooters.map(s => s.id === id ? { ...s, status: newStatus } : s));
        }
        setLoadingAction(null);
    };

    // Métricas
    const total = scooters.length;
    const actives = scooters.filter(s => s.status === 'occupied').length;
    const available = scooters.filter(s => s.status === 'available').length;
    const avgBattery = total > 0 ? Math.round(scooters.reduce((acc, s) => acc + s.battery, 0) / total) : 0;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
            {/* Overlay para cerrar en responsive */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Modal Añadir Scooter */}
            {isAddingScooter && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="p-4 bg-[var(--color-unmsm-guinda)] text-white flex justify-between items-center">
                            <h2 className="font-bold flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                Añadir Nuevo Scooter
                            </h2>
                            <button onClick={() => setIsAddingScooter(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddScooter} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Código ID Único</label>
                                <input required type="text" placeholder="Ej: sc-051" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-unmsm-guinda)] outline-none"
                                    value={newScooterForm.id} onChange={e => setNewScooterForm({ ...newScooterForm, id: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                                <input required type="text" placeholder="Ej: Scooter Gen-51" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-unmsm-guinda)] outline-none"
                                    value={newScooterForm.name} onChange={e => setNewScooterForm({ ...newScooterForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Batería (%)</label>
                                <input required type="number" min="0" max="100" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-unmsm-guinda)] outline-none"
                                    value={newScooterForm.battery} onChange={e => setNewScooterForm({ ...newScooterForm, battery: Number(e.target.value) })} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Latitud</label>
                                    <input required type="number" step="0.0000001" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-unmsm-guinda)] outline-none"
                                        value={newScooterForm.lat} onChange={e => setNewScooterForm({ ...newScooterForm, lat: Number(e.target.value) })} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Longitud</label>
                                    <input required type="number" step="0.0000001" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-unmsm-guinda)] outline-none"
                                        value={newScooterForm.lng} onChange={e => setNewScooterForm({ ...newScooterForm, lng: Number(e.target.value) })} />
                                </div>
                            </div>
                            <button disabled={loadingAction === 'add'} type="submit" className="w-full mt-4 bg-[var(--color-unmsm-guinda)] text-white py-3 rounded-lg font-bold hover:bg-[#600000] transition-colors disabled:opacity-50">
                                {loadingAction === 'add' ? 'Registrando...' : 'Registrar Vehículo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <aside className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out w-64 bg-[var(--color-unmsm-guinda)] text-white flex flex-col shadow-2xl z-30`}>
                <div className="p-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--color-unmsm-dorado)]">Admin Panel</h1>
                        <p className="text-sm text-white/70">UNMSM Scooters</p>
                    </div>
                    <button className="md:hidden text-white/70 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <button
                        onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                    >
                        <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-[var(--color-unmsm-dorado)]' : 'opacity-70'}`} />
                        Dashboard
                    </button>
                    <button
                        onClick={() => { setActiveTab('map'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'map' ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                    >
                        <MapIcon className={`w-5 h-5 ${activeTab === 'map' ? 'text-[var(--color-unmsm-dorado)]' : 'opacity-70'}`} />
                        Mapa en Vivo
                    </button>
                    <button
                        onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'inventory' ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                    >
                        <Database className={`w-5 h-5 ${activeTab === 'inventory' ? 'text-[var(--color-unmsm-dorado)]' : 'opacity-70'}`} />
                        Inventario
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'history' ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
                    >
                        <CheckCircle2 className={`w-5 h-5 ${activeTab === 'history' ? 'text-[var(--color-unmsm-dorado)]' : 'opacity-70'}`} />
                        Historial
                    </button>
                </nav>

                <div className="p-4 mt-auto border-t border-white/10">
                    <button
                        onClick={() => setRole(null)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto w-full relative">
                <header className="bg-white px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-center sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-3">
                        <button
                            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mr-1"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 capitalize truncate max-w-[140px] sm:max-w-none">
                            {activeTab === 'map' ? 'Mapa en Vivo' : activeTab}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">Sistema Online</span>
                    </div>
                </header>

                <div className="p-4 sm:p-8">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Tarjetas de Métricas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1">Total Flota</p>
                                        <p className="text-3xl font-bold text-gray-900">{total}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Database className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1">Scooters Disponibles</p>
                                        <p className="text-3xl font-bold text-green-600">{available}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1">En Viaje (Ocupados)</p>
                                        <p className="text-3xl font-bold text-[var(--color-unmsm-guinda)]">{actives}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-50 text-[var(--color-unmsm-guinda)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play className="w-6 h-6 ml-1" />
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1">Batería Promedio</p>
                                        <p className="text-3xl font-bold text-[var(--color-unmsm-dorado)]">{avgBattery}%</p>
                                    </div>
                                    <div className="w-12 h-12 bg-orange-50 text-[var(--color-unmsm-dorado)] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Battery className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>

                            {/* Vista Previa del Mapa (Mini) */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-gray-800">Ubicaciones Recientes</h3>
                                    <button onClick={() => setActiveTab('map')} className="text-sm text-[var(--color-unmsm-guinda)] font-semibold hover:underline">Ver mapa completo</button>
                                </div>
                                <div className="h-[400px] w-full relative bg-gray-100">
                                    <CampusMap>
                                        {scooters.map(scooter => (
                                            <ScooterMarker key={scooter.id} scooter={scooter} onClick={() => { }} />
                                        ))}
                                    </CampusMap>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'map' && (
                        <div className="h-[calc(100vh-160px)] rounded-2xl overflow-hidden shadow-lg border border-gray-200 animate-in fade-in duration-500">
                            <CampusMap>
                                {scooters.map(scooter => (
                                    <ScooterMarker key={`full-${scooter.id}`} scooter={scooter} onClick={() => { }} />
                                ))}
                            </CampusMap>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Vehículos Registrados</h3>
                                    <p className="text-sm text-gray-500">Gestión física y electrónica de la red de scooters</p>
                                </div>
                                <button onClick={() => setIsAddingScooter(true)} className="flex items-center gap-2 bg-[var(--color-unmsm-guinda)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#600000] transition-colors">
                                    <Plus className="w-4 h-4" />
                                    Añadir Scooter
                                </button>
                            </div>

                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                                                <th className="p-4 font-semibold">ID</th>
                                                <th className="p-4 font-semibold">Nombre</th>
                                                <th className="p-4 font-semibold">Estado</th>
                                                <th className="p-4 font-semibold">Batería</th>
                                                <th className="p-4 font-semibold">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {scooters.map((s) => (
                                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 text-gray-500 font-mono text-sm">{s.id}</td>
                                                    <td className="p-4 font-medium text-gray-900">{s.name}</td>
                                                    <td className="p-4">
                                                        <select
                                                            value={s.status}
                                                            onChange={(e) => handleUpdateStatus(s.id, s.status, e.target.value)}
                                                            disabled={loadingAction === `status-${s.id}`}
                                                            className={`text-xs font-bold outline-none cursor-pointer rounded-full px-3 py-1 border shadow-sm
                                                        ${s.status === 'available' ? 'bg-green-50 text-green-800 border-green-200 focus:ring-2 focus:ring-green-400' :
                                                                    s.status === 'occupied' ? 'bg-red-50 text-red-800 border-red-200 focus:ring-2 focus:ring-red-400' :
                                                                        'bg-yellow-50 text-yellow-800 border-yellow-200 focus:ring-2 focus:ring-yellow-400'}`}
                                                        >
                                                            <option value="available">Disponible</option>
                                                            <option value="occupied">En Uso</option>
                                                            <option value="maintenance">Mantenimiento</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <Battery className={`w-4 h-4 ${s.battery > 20 ? 'text-green-500' : 'text-red-500'}`} />
                                                            <span className="text-gray-700 font-medium">{s.battery}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-end gap-3 pr-4">
                                                            <button
                                                                disabled={loadingAction === `delete-${s.id}`}
                                                                onClick={() => handleDeleteScooter(s.id)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                                                title="Eliminar del sistema"
                                                            >
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-800">Últimas 50 transacciones</h3>
                                <p className="text-sm text-gray-500">Historial completo de viajes de estudiantes</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-sm uppercase tracking-wider">
                                            <th className="p-4 font-semibold">Cód. Orden</th>
                                            <th className="p-4 font-semibold">Usuario</th>
                                            <th className="p-4 font-semibold">Scooter Utilizado</th>
                                            <th className="p-4 font-semibold">Fecha</th>
                                            <th className="p-4 font-semibold">Resolución</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {history.length > 0 ? history.map((h, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-mono text-sm font-medium text-gray-900">{h.order_code}</td>
                                                <td className="p-4 text-gray-600">Estudiante Anon.</td>
                                                <td className="p-4 text-gray-500 font-mono text-sm">{h.scooter_id}</td>
                                                <td className="p-4 text-gray-500">{new Date(h.created_at).toLocaleString()}</td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold 
                                                        ${h.status === 'Completada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {h.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">No hay viajes registrados en la Base de Datos.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
