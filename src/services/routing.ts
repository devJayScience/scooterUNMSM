export interface RouteResult {
    path: [number, number][]; // Array of [lat, lng]
    distance: number; // in meters
    duration: number; // in seconds
}

export const getOSRMRoute = async (
    start: [number, number],
    end: [number, number]
): Promise<RouteResult | null> => {
    try {
        // OSRM expects coordinates in "lng,lat" order
        const startStr = `${start[1]},${start[0]}`;
        const endStr = `${end[1]},${end[0]}`;

        // Uso de la API pública gratuita de OSRM foot (peatonal)
        const url = `https://router.project-osrm.org/route/v1/foot/${startStr};${endStr}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.error("OSRM failed:", data);
            return null;
        }

        const route = data.routes[0];
        // OSRM returns coordinates as [lng, lat], we map it to [lat, lng] for Leaflet
        const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as [number, number]);

        return {
            path: coordinates,
            distance: route.distance, // in meters
            duration: route.duration // in seconds
        };

    } catch (error) {
        console.error("Error fetching OSRM route:", error);
        return null; // Fallback will be a straight line handled by the UI
    }
};

/**
 * Interpola puntos adicionales a lo largo de un path para lograr un movimiento suave
 * @param path Ruta base de coordenadas
 * @param speed velocidad en metros por segundo
 * @param tickRate cuantas veces por segundo se actualiza (ej 30 -> 30fps)
 */
export const interpolatePath = (path: [number, number][], frameCount: number): [number, number][] => {
    if (path.length < 2) return path;

    // Simplificación: Para no complicar con algoritmos geográficos estrictos si no es requerido,
    // podemos usar un generador basado en distancia Haversine, pero podemos interpolar linealmente 
    // basados en % para un MVP.

    let totalDist = 0;
    const segmentDists = [];

    const dist = (p1: [number, number], p2: [number, number]) => {
        const dx = p1[0] - p2[0];
        const dy = p1[1] - p2[1];
        return Math.sqrt(dx * dx + dy * dy);
    };

    for (let i = 0; i < path.length - 1; i++) {
        const d = dist(path[i], path[i + 1]);
        segmentDists.push(d);
        totalDist += d;
    }

    const newPath: [number, number][] = [];
    newPath.push(path[0]);

    for (let f = 1; f < frameCount; f++) {
        const targetD = (f / frameCount) * totalDist;
        let dAccum = 0;
        let p1 = path[0], p2 = path[1];
        let localPct = 0;

        for (let i = 0; i < segmentDists.length; i++) {
            if (dAccum + segmentDists[i] >= targetD) {
                p1 = path[i];
                p2 = path[i + 1];
                localPct = (targetD - dAccum) / segmentDists[i];
                break;
            }
            dAccum += segmentDists[i];
        }

        const lat = p1[0] + (p2[0] - p1[0]) * localPct;
        const lng = p1[1] + (p2[1] - p1[1]) * localPct;
        newPath.push([lat, lng]);
    }

    newPath.push(path[path.length - 1]);
    return newPath;
};
