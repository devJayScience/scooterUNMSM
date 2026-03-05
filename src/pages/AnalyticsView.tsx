import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Text } from 'recharts';

const dataRendimiento = [
  { ruta: 'Sistemas ➔ Comedor', scooter: 5, caminando: 20 },
  { ruta: 'Letras ➔ Puerta 3', scooter: 8, caminando: 25 },
  { ruta: 'Medicina ➔ Clínica', scooter: 12, caminando: 35 },
  { ruta: 'Economía ➔ Biblioteca', scooter: 6, caminando: 22 },
];

const dataDestinos = [
  { name: 'Comedor Central', value: 400, color: '#9b111e' },
  { name: 'Biblioteca Central', value: 300, color: '#003366' },
  { name: 'Puerta 3', value: 200, color: '#006633' },
  { name: 'Facultad Sistemas', value: 150, color: '#cc9900' },
];

// Componente para saltos de línea en etiquetas largas
const CustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, value, name, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.35; // Aumentar radio para alejar las etiquetas
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Dividir el nombre si tiene más de una palabra y es muy largo
  const words = name.split(' ');
  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text x={x} y={y} fill="#374151" textAnchor={textAnchor} dominantBaseline="central" fontSize="12" fontWeight="600">
      {words.map((word: string, index: number) => (
        <tspan x={x} dy={index === 0 ? -12 : 14} key={index}>{word}</tspan>
      ))}
      <tspan x={x} dy="14" fill="#6B7280" fontSize="11" fontWeight="400">({(percent * 100).toFixed(0)}%)</tspan>
    </text>
  );
};

export const AnalyticsView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Rendimiento del Sistema (Eficiencia)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <BarChart data={dataRendimiento}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ruta" tick={{fontSize: 11}} />
              <YAxis />
              <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
              <Legend />
              <Bar dataKey="scooter" fill="#9b111e" name="En Scooter" radius={[4, 4, 0, 0]} />
              <Bar dataKey="caminando" fill="#d1d5db" name="Caminando" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de pastel clásica con salto de línea estético en etiquetas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Frecuencia de Destinos</h3>
          <div className="h-[400px] w-full flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataDestinos}
                  cx="50%"
                  cy="50%"
                  outerRadius={125} // Gráfico más grande
                  fill="#8884d8"
                  dataKey="value"
                  label={<CustomLabel />}
                  stroke="white"
                  strokeWidth={2}
                >
                  {dataDestinos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} viajes`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla de alto contraste */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Resumen de Frecuencia</h3>
          <div className="space-y-3">
            {dataDestinos.map((dest, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: dest.color }}></div>
                  <span className="font-semibold text-gray-800">{dest.name}</span>
                </div>
                <span className="bg-white px-4 py-1.5 rounded-full text-sm font-bold text-gray-900 border border-gray-200 shadow-sm">
                  {dest.value} viajes
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};