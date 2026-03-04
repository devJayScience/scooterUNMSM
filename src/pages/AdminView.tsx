import React, { useState } from 'react';
import { useAppStore } from '../context/useAppStore';
import { LogOut, LayoutDashboard, Database, Battery, CheckCircle2, Play, Menu, X, Plus, Trash2, BarChart3, BrainCircuit } from 'lucide-react';
import { CampusMap } from '../components/Map/CampusMap';
import { ScooterMarker } from '../components/Map/ScooterMarker';
import { supabase } from '../services/supabase';

import { AnalyticsView } from './AnalyticsView';
import { PredictionsView } from './PredictionsView';

export const AdminView: React.FC = () => {
    const { setRole, scooters, setScooters } = useAppStore();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'inventory' | 'history' | 'analytics' | 'predictions'>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

    const [isAddingScooter, setIsAddingScooter] = useState(false);
    const [newScooterForm, setNewScooterForm] = useState({ id: '', name: '', battery: 100, lat: -12.0560, lng: -77.0840 });
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    React.useEffect(() => {
        const loadScooters = async () => {
            const { data, error } = await supabase.from('scooters').select('*');
            if (data && !error) setScooters(data);
        };
        if (scooters.length === 0) loadScooters();

        const loadHistory = async () => {
            const { data, error } = await supabase
                .from('trips')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (data && !error) setHistory(data);
        };
        loadHistory();
    }, [scooters.length, setScooters]);

    const handleAddScooter = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction('add');
        const scToInsert = { ...newScooterForm, status: 'available' };
        const { data, error } = await supabase.from('scooters').insert(scToInsert).select();
        if (error) {
            alert('Error: ' + error.message);
        } else if (data) {
            setScooters([...scooters, data[0]]);
            setIsAddingScooter(false);
            setNewScooterForm({ id: '', name: '', battery: 100, lat: -12.0560, lng: -77.0840 });
        }
        setLoadingAction(null);
    };

    const handleDeleteScooter = async (id: string) => {
        if (!confirm(`¿Eliminar scooter ${id}?`)) return;
        setLoadingAction(`delete-${id}`);
        const { error } = await supabase.from('scooters').delete().eq('id', id);
        if (!error) setScooters(scooters.filter(s => s.id !== id));
        setLoadingAction(null);
    };

    const handleUpdateStatus = async (id: string, currentStatus: string, newStatus: string) => {
        if (currentStatus === newStatus) return;
        setLoadingAction(`status-${id}`);
        const { error } = await supabase.from('scooters').update({ status: newStatus }).eq('id', id);
        if (!error) setScooters(scooters.map(s => s.id === id ? { ...s, status: newStatus } : s));
        setLoadingAction(null);
    };

    const total = scooters.length;
    const available = scooters.filter(s => s.status === 'available').length;
    const actives = scooters.filter(s => s.status === 'occupied').length;
    const avgBattery = total > 0 ? Math.round(scooters.reduce((acc, s) => acc + s.battery, 0) / total) : 0;

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
            {/* Modal Añadir Scooter */}
            {isAddingScooter && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 bg-[var(--color-unmsm-guinda)] text-white flex justify-between items-center">
                            <h2 className="font-bold">Añadir Nuevo Scooter</h2>
                            <button onClick={() => setIsAddingScooter(false)}><X /></button>
                        </div>
                        <form onSubmit={handleAddScooter} className="p-6 space-y-4 text-sm">
                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">ID (ej: sc-001)</label>
                                <input className="w-full p-2 border rounded" value={newScooterForm.id} onChange={e => setNewScooterForm({...newScooterForm, id: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">Nombre</label>
                                <input className="w-full p-2 border rounded" value={newScooterForm.name} onChange={e => setNewScooterForm({...newScooterForm, name: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-semibold mb-1">% Batería</label>
                                <input type="number" className="w-full p-2 border rounded" value={newScooterForm.battery} onChange={e => setNewScooterForm({...newScooterForm, battery: Number(e.target.value)})} required />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-gray-700 font-semibold mb-1">Latitud</label>
                                    <input type="number" step="any" className="w-full p-2 border rounded" value={newScooterForm.lat} onChange={e => setNewScooterForm({...newScooterForm, lat: Number(e.target.value)})} required />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-gray-700 font-semibold mb-1">Longitud</label>
                                    <input type="number" step="any" className="w-full p-2 border rounded" value={newScooterForm.lng} onChange={e => setNewScooterForm({...newScooterForm, lng: Number(e.target.value)})} required />
                                </div>
                            </div>
                            <button type="submit" disabled={loadingAction === 'add'} className="w-full bg-[var(--color-unmsm-guinda)] text-white p-3 rounded-lg font-bold">
                                {loadingAction === 'add' ? 'Registrando...' : 'Registrar Vehículo'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <aside className="w-64 bg-[var(--color-unmsm-guinda)] text-white flex flex-col shadow-2xl z-30">
                <div className="p-6 font-bold text-xl text-[var(--color-unmsm-dorado)]">Admin Panel</div>
                <nav className="flex-1 px-4 space-y-2">
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'dashboard' ? 'bg-white/15' : 'hover:bg-white/5'}`}><LayoutDashboard className="w-5 h-5"/> Dashboard</button>
                    <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'inventory' ? 'bg-white/15' : 'hover:bg-white/5'}`}><Database className="w-5 h-5"/> Inventario</button>
                    <button onClick={() => setActiveTab('history')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'history' ? 'bg-white/15' : 'hover:bg-white/5'}`}><CheckCircle2 className="w-5 h-5"/> Historial</button>
                    <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'analytics' ? 'bg-white/15' : 'hover:bg-white/5'}`}><BarChart3 className="w-5 h-5 text-[var(--color-unmsm-dorado)]"/> Análisis</button>
                    <button onClick={() => setActiveTab('predictions')} className={`w-full flex items-center gap-3 p-3 rounded-xl ${activeTab === 'predictions' ? 'bg-white/15' : 'hover:bg-white/5'}`}><BrainCircuit className="w-5 h-5 text-[var(--color-unmsm-dorado)]"/> Predicciones</button>
                </nav>

                {/* --- BOTÓN CERRAR SESIÓN (AÑADIDO AQUÍ) --- */}
                <div className="p-4 border-t border-white/10">
                    <button 
                        onClick={() => setRole(null)} 
                        className="flex items-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-y-auto">
                <header className="bg-white p-5 border-b sticky top-0 z-10 flex justify-between items-center font-bold text-2xl text-gray-800">
                    <span className="capitalize">{activeTab}</span>
                </header>

                <div className="p-8">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1">Total Flota</p>
                                        <p className="text-3xl font-bold text-gray-900">{total}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                                        <Database className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1 text-green-600">Disponibles</p>
                                        <p className="text-3xl font-bold">{available}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1 text-red-600">En Viaje</p>
                                        <p className="text-3xl font-bold">{actives}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-50 text-[var(--color-unmsm-guinda)] rounded-full flex items-center justify-center">
                                        <Play className="w-6 h-6 ml-1" />
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 font-medium mb-1 text-orange-500">Batería Promedio</p>
                                        <p className="text-3xl font-bold">{avgBattery}%</p>
                                    </div>
                                    <div className="w-12 h-12 bg-orange-50 text-[var(--color-unmsm-dorado)] rounded-full flex items-center justify-center">
                                        <Battery className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border h-[450px] overflow-hidden">
                                <CampusMap>
                                    {scooters.map(s => <ScooterMarker key={s.id} scooter={s} onClick={() => {}} />)}
                                </CampusMap>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inventory' && (
                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h3 className="text-lg font-bold">Vehículos Registrados</h3>
                                <button onClick={() => setIsAddingScooter(true)} className="bg-[var(--color-unmsm-guinda)] text-white px-4 py-2 rounded-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Añadir Scooter</button>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                    <tr><th className="p-4">ID</th><th className="p-4">Nombre</th><th className="p-4">Estado</th><th className="p-4">Batería</th><th className="p-4">Acciones</th></tr>
                                </thead>
                                <tbody className="divide-y text-sm">
                                    {scooters.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono">{s.id}</td>
                                            <td className="p-4 font-medium">{s.name}</td>
                                            <td className="p-4">
                                                <select value={s.status} onChange={(e) => handleUpdateStatus(s.id, s.status, e.target.value)} className="border rounded p-1 text-xs font-bold outline-none">
                                                    <option value="available">Disponible</option>
                                                    <option value="occupied">Ocupado</option>
                                                    <option value="maintenance">Mantenimiento</option>
                                                </select>
                                            </td>
                                            <td className="p-4">{s.battery}%</td>
                                            <td className="p-4"><button onClick={() => handleDeleteScooter(s.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden animate-in fade-in">
                            <div className="p-6 border-b font-bold">Historial de Viajes</div>
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr><th className="p-4">Cód. Orden</th><th className="p-4">Usuario</th><th className="p-4">Scooter</th><th className="p-4">Fecha</th><th className="p-4">Resolución</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.length > 0 ? history.map((h, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-4 font-mono font-medium">{h.order_code}</td>
                                            <td className="p-4 text-gray-600">Estudiante Anon.</td>
                                            <td className="p-4 font-mono">{h.scooter_id}</td>
                                            <td className="p-4 text-gray-500">{new Date(h.created_at).toLocaleString()}</td>
                                            <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${h.status === 'Completada' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{h.status}</span></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-500">No hay registros</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'analytics' && <AnalyticsView />}
                    {activeTab === 'predictions' && <PredictionsView />}
                </div>
            </main>
        </div>
    );
};