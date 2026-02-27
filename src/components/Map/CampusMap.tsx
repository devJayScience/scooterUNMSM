import React from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los íconos de Leaflet en React (problema conocido)
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
});

interface CampusMapProps {
    children?: React.ReactNode;
    centerPos?: [number, number];
}

export const CampusMap: React.FC<CampusMapProps> = ({ children, centerPos = [-12.0565, -77.0850] }) => {


    return (
        <MapContainer
            center={centerPos}
            zoom={15}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            <ZoomControl position="bottomright" />



            {/* Render children like ScooterMarkers and User location */}
            {children}
        </MapContainer>
    );
};
