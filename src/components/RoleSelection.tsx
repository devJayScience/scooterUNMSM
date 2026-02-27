import React from 'react';
import { useAppStore } from '../context/useAppStore';
import { User, ShieldUser, Scooter, Lock, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export const RoleSelection: React.FC = () => {
    const setRole = useAppStore((state) => state.setRole);
    const [showLogin, setShowLogin] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            // Verificar si el usuario realmente tiene rol admin en la DB
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', data.user.id)
                .single();

            if (roleError || roleData?.role !== 'admin') {
                await supabase.auth.signOut();
                throw new Error('No tienes permisos de administrador.');
            }

            setRole('admin');
        } catch (err: any) {
            setErrorMsg(err.message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-unmsm-crema)] flex flex-col items-center justify-center p-4">
            <div className="text-center mb-12">
                <div className="flex justify-center mb-4">
                    <div className="bg-[var(--color-unmsm-guinda)] p-4 rounded-2xl shadow-lg shadow-[var(--color-unmsm-guinda)]/20">
                        <Scooter className="w-16 h-16 text-white" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-[#333333] mb-2 tracking-tight">UNMSM Movilidad</h1>
                <p className="text-gray-600 font-medium">Sistema de Scooters Universitarios</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
                {/* Student Card */}
                <button
                    onClick={() => setRole('student')}
                    className="group relative overflow-hidden bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-[var(--color-unmsm-guinda)]/30 text-left flex flex-col"
                >
                    <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <User className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#333333] mb-2">Soy Estudiante</h2>
                    <p className="text-gray-500 mb-6 flex-grow">
                        Encuentra scooters disponibles en el campus y movilízate rápidamente entre facultades.
                    </p>
                    <div className="flex items-center text-[var(--color-unmsm-guinda)] font-semibold text-sm">
                        Ingresar como estudiante
                        <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                </button>

                {/* Admin Card / Login Form */}
                <div className="relative overflow-hidden bg-[var(--color-unmsm-guinda)] text-white rounded-2xl shadow-md transition-all duration-300 flex flex-col">
                    {!showLogin ? (
                        <button
                            onClick={() => setShowLogin(true)}
                            className="group p-8 h-full w-full text-left flex flex-col hover:shadow-[var(--color-unmsm-guinda)]/40 hover:shadow-xl"
                        >
                            <div className="w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <ShieldUser className="w-6 h-6" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Soy Administrador</h2>
                            <p className="text-white/80 mb-6 flex-grow">
                                Monitorea el estado de la flota, batería y rutas en tiempo real. Se requiere autenticación segura.
                            </p>
                            <div className="flex items-center text-[var(--color-unmsm-dorado)] font-semibold text-sm">
                                Ingresar al sistema
                                <span className="ml-2 transform group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </button>
                    ) : (
                        <div className="p-8 h-full flex flex-col justify-center animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--color-unmsm-dorado)]">
                                <Lock className="w-5 h-5" />
                                Acceso Autorizado
                            </h2>
                            {errorMsg && (
                                <div className="bg-red-500/20 text-red-100 p-3 rounded-lg text-sm mb-4 border border-red-500/50">
                                    {errorMsg}
                                </div>
                            )}
                            <form onSubmit={handleAdminLogin} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">Correo Electrónico</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-unmsm-dorado)]"
                                            placeholder="admin@unmsm.edu.pe"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-1">Contraseña</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-unmsm-dorado)]"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowLogin(false)}
                                        className="flex-1 py-2 px-4 rounded-lg font-medium text-sm text-white bg-white/10 hover:bg-white/20 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 py-2 px-4 rounded-lg font-bold text-sm text-[var(--color-unmsm-guinda)] bg-[var(--color-unmsm-dorado)] hover:bg-yellow-400 transition-colors flex items-center justify-center"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ingresar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-16 text-center text-sm text-gray-500">
                <p>Desarrollado para la Universidad Nacional Mayor de San Marcos</p>
            </div>
        </div>
    );
};
