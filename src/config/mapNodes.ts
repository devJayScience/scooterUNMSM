export interface Node {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

// Puntos estratégicos de la UNMSM normalizados con la Base de Datos
export const CAMPUS_NODES: Node[] = [
    { id: 'p1', name: 'Puerta 1', lat: -12.0609378, lng: -77.0855789 },
    { id: 'p2', name: 'Puerta 2', lat: -12.0594641, lng: -77.0796490 },
    { id: 'p7', name: 'Puerta 7', lat: -12.0539200, lng: -77.0844977 },
    { id: 'p8', name: 'Puerta 8', lat: -12.0519892, lng: -77.0875718 },
    { id: 'comedor', name: 'Comedor Universitario', lat: -12.0592626, lng: -77.0831223 },
    { id: 'biblioteca', name: 'Biblioteca Central', lat: -12.0558121, lng: -77.0858696 },
    { id: 'f_matematicas', name: 'Fac. Ciencias Matemáticas', lat: -12.0603379, lng: -77.0820690 },
    { id: 'f_industrial', name: 'Fac. Ing. Industrial', lat: -12.0602500, lng: -77.0808691 },
    { id: 'clinica', name: 'Clínica Universitaria', lat: -12.0556163, lng: -77.0820048 },
    { id: 'f_educacion', name: 'Fac. Educación', lat: -12.0545032, lng: -77.0847398 },
    { id: 'f_odontologia', name: 'Fac. Odontología', lat: -12.0538685, lng: -77.0860165 },
    // CAMBIO CLAVE: Nombre idéntico al de Analytics y Base de Datos
    { id: 'f_sistemas', name: 'Facultad de Sistemas (FISI)', lat: -12.0536365, lng: -77.0857319 }
];

// Rutas de conexión (Edges) - Se mantienen los IDs pero los nombres en el menú cambiarán
export const ROUTE_EDGES: [string, string][] = [
    ['p1', 'f_matematicas'], ['f_matematicas', 'comedor'], ['comedor', 'p2'],
    ['p1', 'biblioteca'], ['biblioteca', 'f_educacion'], ['f_educacion', 'p7'],
    ['p7', 'f_sistemas'], ['f_sistemas', 'f_odontologia'], ['f_odontologia', 'p8'],
    ['biblioteca', 'clinica']
];

export const getRoutePath = (startId: string, endId: string): [number, number][] => {
    const start = CAMPUS_NODES.find(n => n.id === startId);
    const end = CAMPUS_NODES.find(n => n.id === endId);
    if (!start || !end) return [];
    return [
        [start.lat, start.lng],
        [end.lat, end.lng]
    ];
};