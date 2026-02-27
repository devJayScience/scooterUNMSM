import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Battery, MapPin } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

export interface ScooterData {
    id: string;
    name: string;
    lat: number;
    lng: number;
    battery: number;
    status: 'available' | 'occupied' | 'maintenance';
}

interface ScooterMarkerProps {
    scooter: ScooterData;
    onClick: (scooter: ScooterData) => void;
}

const createCustomIcon = (status: ScooterData['status']) => {
    const color = status === 'available' ? '#22c55e' : status === 'occupied' ? '#ef4444' : '#eab308';

    const iconMarkup = renderToStaticMarkup(
        <div style={{
            backgroundColor: color,
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            border: '3px solid white',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
            <MapPin color="white" size={18} />
        </div>
    );

    return L.divIcon({
        html: iconMarkup,
        className: 'custom-scooter-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });
};

export const ScooterMarker: React.FC<ScooterMarkerProps> = ({ scooter, onClick }) => {
    const icon = createCustomIcon(scooter.status);

    return (
        <Marker
            position={[scooter.lat, scooter.lng]}
            icon={icon}
            eventHandlers={{
                click: () => onClick(scooter),
            }}
        >
            <Popup closeButton={false} className="scooter-popup">
                <div className="font-sans">
                    <p className="font-bold text-gray-800 mb-1">{scooter.name}</p>
                    <div className="flex items-center text-xs text-gray-600 gap-1 mt-1">
                        <Battery size={14} className={scooter.battery > 20 ? "text-green-500" : "text-red-500"} />
                        <span>{scooter.battery}%</span>
                        <span className="mx-1">•</span>
                        <span className={scooter.status === 'available' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {scooter.status === 'available' ? 'Disponible' : scooter.status === 'occupied' ? 'Ocupado' : 'Mantenimiento'}
                        </span>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
};
