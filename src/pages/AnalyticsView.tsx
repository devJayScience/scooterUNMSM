import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../services/supabase';
import { Clock, ArrowRightLeft } from 'lucide-react';

// 1. CONFIGURACIÓN MANUAL DE COLORES POR DESTINO
const DESTINATION_COLORS: Record<string, string> = {
  'Comedor Universitario': '#15803d',     // Verde
  'Biblioteca Central': '#1d4ed8',        // Azul
  'Facultad de Sistemas (FISI)': '#9b111e', // Guinda
  'Clínica Universitaria': '#d97706',     // Ámbar
  'Puerta 1 - Venezuela': '#7e22ce',      // Violeta
  'Estadio San Marcos': '#0891b2',        // Cian
  'Otros': '#64748b'
};

// 2. BENCHMARK DE CAMINATA POR RUTA (Tiempos estimados en minutos)
const WALKING_BENCHMARK: Record<string, number> = {
  'Puerta 1 - Venezuela ➔ Facultad de Sistemas (FISI)': 12,
  'Biblioteca Central ➔ Comedor Universitario': 10,
  'Estadio San Marcos ➔ Facultad de Sistemas (FISI)': 25,
  'Facultad de Sistemas (FISI) ➔ Biblioteca Central': 8,
  'Estadio San Marcos ➔ Comedor Universitario': 28,
  'Puerta 1 - Venezuela ➔ Clínica Universitaria': 20,
};

// COMPONENTE: Etiquetas horizontales en 2 líneas para el eje X
const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const text = payload.value;
  const parts = text.split(' ➔ ');

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={5} // Reducido de 15 a 5 para subir el texto
        textAnchor="middle"
        fill="#4b5563"
        fontSize="10" // Un punto más pequeño ayuda a compactar
        fontWeight="600"
      >
        <tspan x="0" dy="1.1em">{parts[0]}</tspan>
        {parts[1] && (
          <tspan x="0" dy="1.2em" fontSize="9" fill="#6b7280" fontWeight="400">
            ➔ {parts[1]}
          </tspan>
        )}
      </text>
    </g>
  );
};

// COMPONENTE: Etiquetas inteligentes para el gráfico circular
const CustomPieLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  const isNameLong = name.length > 15;
  const words = name.split(' ');
  const textAnchor = x > cx ? 'start' : 'end';

  return (
    <text x={x} y={y} fill="#374151" textAnchor={textAnchor} dominantBaseline="central" fontSize="11" fontWeight="600">
      {isNameLong ? (
        <>
          <tspan x={x} dy="-10">{words.slice(0, Math.ceil(words.length / 2)).join(' ')}</tspan>
          <tspan x={x} dy="14">{words.slice(Math.ceil(words.length / 2)).join(' ')}</tspan>
        </>
      ) : (
        <tspan>{name}</tspan>
      )}
      <tspan x={x} dy="16" fill="#6B7280" fontSize="10" fontWeight="400">({(percent * 100).toFixed(0)}%)</tspan>
    </text>
  );
};

export const AnalyticsView: React.FC = () => {
  const [destData, setDestData] = useState<any[]>([]);
  const [rendimientoData, setRendimientoData] = useState<any[]>([]);
  const [totalAhorrado, setTotalAhorrado] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Obtener datos de Supabase
      const { data, error } = await supabase
        .from('trips')
        .select('origin, destination')
        .not('destination', 'eq', 'Dummy')
        .not('destination', 'is', null);
      
      if (data && !error) {
        // --- PROCESAMIENTO PIE CHART (Destinos) ---
        const destCounts = data.reduce((acc: any, curr: any) => {
          acc[curr.destination] = (acc[curr.destination] || 0) + 1;
          return acc;
        }, {});

        const formattedDest = Object.keys(destCounts).map((key) => ({
          name: key,
          value: destCounts[key],
          color: DESTINATION_COLORS[key] || DESTINATION_COLORS['Otros']
        })).sort((a, b) => b.value - a.value).slice(0, 6);

        setDestData(formattedDest);

        // --- PROCESAMIENTO BAR CHART (Rutas) ---
        const routeMap: Record<string, { count: number }> = {};
        
        data.forEach(trip => {
          const originName = trip.origin || "Campus";
          const routeKey = `${originName} ➔ ${trip.destination}`;
          
          if (!routeMap[routeKey]) {
            routeMap[routeKey] = { count: 0 };
          }
          routeMap[routeKey].count += 1;
        });

        let ahorroAcumuladoMinutos = 0;
        const efficiency = Object.keys(routeMap).map(key => {
          const viajes = routeMap[key].count;
          const tCaminando = WALKING_BENCHMARK[key] || 20; 
          const tScooter = Math.round(tCaminando * 0.35);
          
          ahorroAcumuladoMinutos += (tCaminando - tScooter) * viajes;

          return {
            ruta: key,
            scooter: tScooter,
            caminando: tCaminando
          };
        });

        setRendimientoData(efficiency);
        setTotalAhorrado(Math.round(ahorroAcumuladoMinutos / 60)); 
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Tarjeta de Ahorro Total */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-600 to-emerald-800 p-6 rounded-2xl text-white shadow-lg relative group">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-xl"><Clock className="w-8 h-8" /></div>
            <div>
              <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Tiempo Total Ahorrado</p>
              <p className="text-4xl font-black">{totalAhorrado} Horas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras con Etiquetas Horizontales en 2 Líneas */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4"> {/* mb-6 a mb-4 */}
          <ArrowRightLeft className="text-[#9b111e] w-5 h-5" />
          <h3 className="text-xl font-bold text-gray-800">Eficiencia por Ruta</h3>
        </div>
        
        <div className="w-full overflow-x-auto pb-2 custom-scrollbar"> {/* pb-4 a pb-2 */}
          {/* Reducimos el alto total del div de 420px a 350px */}
          <div style={{ minWidth: Math.max(rendimientoData.length * 200, 800), height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={rendimientoData} 
                margin={{ bottom: 40, left: 10, right: 10, top: 10 }} // Bottom de 80 a 40
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="ruta" 
                  height={50} // Reducido de 90 a 50
                  interval={0}
                  tick={<CustomXAxisTick />}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis hide /> {/* Opcional: puedes ocultar el YAxis si las barras son lo bastante claras para ganar más espacio */}
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                <Bar dataKey="scooter" fill="#9b111e" name="Scooter" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="caminando" fill="#4b5563" name="Caminata" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Gráfico Circular y Resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4 text-center">Frecuencia de Destinos (BD Real)</h3>
          <div className="h-[400px] w-full flex justify-center items-center">
            {destData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={destData} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={<CustomPieLabel />} stroke="white" strokeWidth={2}>
                    {destData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-400 italic">Cargando datos...</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-gray-800 mb-6 text-center">Resumen de Destinos</h3>
          <div className="space-y-3">
            {destData.map((dest, i) => (
              <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white hover:shadow-md transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: dest.color }}></div>
                  <span className="font-semibold text-gray-700">{dest.name}</span>
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