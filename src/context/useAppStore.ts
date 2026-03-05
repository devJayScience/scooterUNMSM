import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type Role = 'student' | 'admin' | null;

export interface AppState {
    role: Role;
    setRole: (role: Role) => void;
    scooters: any[];
    setScooters: (scooters: any[]) => void;
    updateScooter: (scooter: any) => void;
    initRealtime: () => () => void;
    requestScooterRPC: (scooterId: string) => Promise<boolean>;
}

export const useAppStore = create<AppState>((set, get) => ({
    role: null,
    setRole: (role) => set({ role }),
    scooters: [], // Se inicializarán desde la UI si están vacíos
    setScooters: (scooters) => set({ scooters }),
    updateScooter: (updatedScooter) => set((state) => ({
        scooters: state.scooters.map((s) => s.id === updatedScooter.id ? updatedScooter : s)
    })),

    initRealtime: () => {
        // Suscripción a cambios en la tabla 'scooters' de Supabase
        const subscription = supabase
            .channel('public:scooters')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scooters' }, (payload) => {
                const { eventType, new: newRec, old: oldRec } = payload;
                const currentScooters = get().scooters;

                if (eventType === 'UPDATE') {
                    get().updateScooter(newRec);
                } else if (eventType === 'INSERT') {
                    set({ scooters: [...currentScooters, newRec] });
                } else if (eventType === 'DELETE') {
                    set({ scooters: currentScooters.filter(s => s.id !== oldRec.id) });
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    },

    requestScooterRPC: async (scooterId: string) => {
        try {
            // Llamada a Procedimiento Almacenado en Supabase (Fallback a update directo)
            let { data, error } = await supabase.rpc('reservar_scooter', { _scooter_id: scooterId });

            if (error) {
                console.warn("RPC reservar_scooter falló, usando UPDATE directo:", error);
                const { error: updateError } = await supabase.from('scooters').update({ status: 'occupied' }).eq('id', scooterId);
                return !updateError;
            }
            return true;
        } catch (err) {
            console.error("Excepción al reservar:", err);
            return false;
        }
    }
}));
