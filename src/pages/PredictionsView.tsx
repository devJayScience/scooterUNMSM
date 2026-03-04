import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrainCircuit, AlertTriangle } from 'lucide-react';

const EVENTS = [
  { date: '2026-03-07', name: 'Examen de Admisión (Día 1)', factor: 3.0 },
  { date: '2026-03-08', name: 'Examen de Admisión (Día 2)', factor: 3.1 },
  { date: '2026-03-14', name: 'Examen de Admisión (Día 3)', factor: 3.25 }, // Suele ser el de mayor afluencia
  { date: '2026-03-15', name: 'Examen de Admisión (Día 4)', factor: 3.5 },
  { date: '2026-05-12', name: 'Aniversario UNMSM', factor: 2.0 },
];

const generateData = () => {
  const data = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const event = EVENTS.find(e => e.date === dateStr);
    data.push({
      fecha: dateStr.split('-').slice(1).join('/'),
      demanda: event ? Math.round(25 * event.factor) : Math.floor(Math.random() * 10) + 20
    });
  }
  return data;
};

export const PredictionsView: React.FC = () => {
  const data = useMemo(() => generateData(), []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-2xl text-white">
          <div className="flex items-center gap-3 mb-2">
            <BrainCircuit />
            <h3 className="font-bold">IA Predictiva</h3>
          </div>
          <p className="text-3xl font-bold">Activa</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border">
        <h3 className="text-lg font-bold mb-6">Pronóstico de Demanda (14 días)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="fecha" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="demanda" stroke="#8b5cf6" strokeWidth={3} name="Viajes Proyectados" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-amber-800">
        <AlertTriangle className="flex-shrink-0" />
        <p className="text-sm"><strong>Aviso:</strong> Se espera alta demanda por Examen de Admisión el 15/03.</p>
      </div>
    </div>
  );
};