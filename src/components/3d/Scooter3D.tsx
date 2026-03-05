import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
    PerspectiveCamera,
    OrbitControls,
    Environment,
    ContactShadows,
    MeshTransmissionMaterial,
    Html,
    Sky,
} from '@react-three/drei';
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing';
import { Suspense } from 'react';
import * as THREE from 'three';

// ── Module-level constants: pre-allocated to avoid per-frame GC ──
// World X axis = wheel axle direction
const _ROLL_AXIS = new THREE.Vector3(1, 0, 0);
const _qRoll = new THREE.Quaternion();

interface Scooter3DProps {
    scooter: any;
    proximity: number;
}

// ─── MATERIAL CONSTANTS (Callout design) ───
const MAT = {
    CARBON: '#121214',
    SILVER: '#c4c8d0',
    WHITE: '#e6e8eb',
    RUBBER: '#0e0e0e',
    ORANGE: '#bf5200',
    DARK: '#18181a',
    GRIP: '#2a2a2c',
};

// ═══════════════════════════════
//  CALLOUT 1 — Aero Carbon Frame
//  CALLOUT 9 — Battery Deck
// ═══════════════════════════════
const Deck: React.FC = () => (
    <group>
        {/* Main sealed deck — carbon fiber battery compartment (callout 9) */}
        <mesh position={[0, 0.185, 0.05]} castShadow receiveShadow>
            <boxGeometry args={[0.47, 0.055, 1.95]} />
            <meshStandardMaterial color={MAT.CARBON} metalness={0.5} roughness={0.6} />
        </mesh>
        {/* Grip-tape surface */}
        <mesh position={[0, 0.214, 0.05]}>
            <boxGeometry args={[0.45, 0.01, 1.9]} />
            <meshStandardMaterial color={MAT.GRIP} roughness={1} metalness={0} />
        </mesh>
        {/* Brushed aluminum side rails */}
        {([-0.24, 0.24] as number[]).map((x) => (
            <mesh key={x} position={[x, 0.185, 0.05]} castShadow>
                <boxGeometry args={[0.012, 0.06, 1.9]} />
                <meshStandardMaterial color={MAT.SILVER} metalness={0.95} roughness={0.1} />
            </mesh>
        ))}
    </group>
);

// ═══════════════════════════════
//  CALLOUT 4 — Ultrasonic Sensors
// ═══════════════════════════════
const UltrasonicSensors: React.FC<{ active: boolean }> = ({ active }) => (
    <group position={[0, 0.185, -0.99]}>
        {[-0.1, 0, 0.1].map((x, i) => (
            <group key={i} position={[x, 0, 0]}>
                {/* Molded housing */}
                <mesh>
                    <cylinderGeometry args={[0.028, 0.032, 0.022, 20]} />
                    <meshStandardMaterial color={MAT.DARK} roughness={0.4} metalness={0.8} />
                </mesh>
                {/* Glass lens */}
                <mesh position={[0, 0.013, 0]}>
                    <cylinderGeometry args={[0.022, 0.022, 0.006, 20]} />
                    <meshStandardMaterial
                        color={active ? '#ff3300' : '#1a3a6a'}
                        emissive={active ? '#ff2200' : '#0a1a44'}
                        emissiveIntensity={active ? 12 : 1.5}
                        roughness={0.05}
                        metalness={0.3}
                    />
                </mesh>
            </group>
        ))}
    </group>
);

// ══════════════════════════════════════════════
//  CALLOUT 2&3 — Gorilla Glass IoT Core  (Side panel)
// ══════════════════════════════════════════════
const IoTCore: React.FC<{ espRef: React.RefObject<THREE.Mesh | null>; active: boolean }> = ({ espRef, active }) => (
    <group position={[-0.246, 0.185, -0.18]}>
        {/* Gorilla Glass window */}
        <mesh>
            <boxGeometry args={[0.008, 0.075, 0.58]} />
            <MeshTransmissionMaterial
                backside samples={4} resolution={128}
                transmission={0.9} roughness={0.04}
                thickness={0.3} ior={1.5} color="#b0d8f0"
            />
        </mesh>
        {/* PCB substrate */}
        <mesh position={[0.01, -0.002, 0]}>
            <boxGeometry args={[0.003, 0.06, 0.52]} />
            <meshStandardMaterial color="#162816" roughness={1} />
        </mesh>
        {/* ESP32-S3 chip (callout 3) */}
        <mesh ref={espRef} position={[0.016, 0.008, 0.04]}>
            <boxGeometry args={[0.006, 0.034, 0.056]} />
            <meshStandardMaterial
                color={active ? '#ff2200' : '#00dda0'}
                emissive={active ? '#ff1a00' : '#00dda0'}
                emissiveIntensity={active ? 10 : 3.5}
            />
            <pointLight intensity={active ? 2 : 0.6} color={active ? '#ff0000' : '#00ffcc'} distance={0.4} />
        </mesh>
        {/* Copper trace lines */}
        {[-0.18, -0.08, 0, 0.08, 0.18].map((z, i) => (
            <mesh key={i} position={[0.014, -0.018, z]}>
                <boxGeometry args={[0.004, 0.002, 0.04]} />
                <meshStandardMaterial color="#b06030" emissive="#b06030" emissiveIntensity={0.5} metalness={1} roughness={0.2} />
            </mesh>
        ))}
        {/* SMD capacitors */}
        {[-0.12, 0.02, 0.16].map((z, i) => (
            <mesh key={i} position={[0.014, 0.006, z]}>
                <boxGeometry args={[0.004, 0.008, 0.012]} />
                <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
            </mesh>
        ))}
    </group>
);

// ═══════════════════════════════════════
//  CALLOUT 5 — Rear Hub Motor BTS-7960
// ═══════════════════════════════════════
// → rotation=[0,0,π/2]: orients the group so local Y = world -X = wheel axle direction.
//   Animating rotation.y -= delta spins around local Y = world X = correct wheel roll.
const RearWheel: React.FC<{ groupRef: React.RefObject<THREE.Group | null> }> = ({ groupRef }) => (
    <group ref={groupRef} position={[0, 0.295, 0.84]} rotation={[0, 0, Math.PI / 2]}>
        {/* Tire — torus default in X-Z plane, after group Rz(π/2) becomes Y-Z plane = upright wheel */}
        <mesh castShadow>
            <torusGeometry args={[0.22, 0.072, 18, 72]} />
            <meshStandardMaterial color={MAT.RUBBER} roughness={0.94} metalness={0} />
        </mesh>
        {/* Rim disc */}
        <mesh castShadow>
            <cylinderGeometry args={[0.148, 0.148, 0.04, 32]} />
            <meshStandardMaterial color={MAT.SILVER} metalness={0.95} roughness={0.12} />
        </mesh>
        {/* Hub motor body (BTS-7960) */}
        <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.09, 20]} />
            <meshStandardMaterial color="#1e1e1e" metalness={0.9} roughness={0.25} />
        </mesh>
        {/* Axle shaft */}
        <mesh>
            <cylinderGeometry args={[0.016, 0.016, 0.22, 12]} />
            <meshStandardMaterial color={MAT.DARK} metalness={1} roughness={0.15} />
        </mesh>
        {/* Orange cooling fins — radial around axle */}
        {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return (
                // FIX: positions in LOCAL X-Z plane (cos,0,sin) so after group Rz(π/2)
                // they appear in WORLD Y-Z plane = same plane as the torus ring
                <mesh key={i}
                    position={[Math.cos(a) * 0.108, 0, Math.sin(a) * 0.108]}
                    rotation={[0, a, 0]}>
                    <boxGeometry args={[0.085, 0.013, 0.026]} />
                    <meshStandardMaterial color={MAT.ORANGE} metalness={0.7} roughness={0.25} emissive={MAT.ORANGE} emissiveIntensity={0.5} />
                </mesh>
            );
        })}
        {/* Swingarm arms — connect rear axle to deck (in group local coords) */}
        {([-0.06, 0.06] as number[]).map((y) => (
            <mesh key={y} position={[y, 0, -0.42]} castShadow>
                <boxGeometry args={[0.028, 0.028, 0.88]} />
                <meshStandardMaterial color={MAT.CARBON} metalness={0.65} roughness={0.5} />
            </mesh>
        ))}
    </group>
);

// ══════════════════════════
//  CALLOUT 8 — Front Wheel
// ══════════════════════════
const FrontWheel: React.FC<{ groupRef: React.RefObject<THREE.Group | null> }> = ({ groupRef }) => (
    <group ref={groupRef} position={[0, 0.295, -0.9]} rotation={[0, 0, Math.PI / 2]}>
        {/* Tire */}
        <mesh castShadow>
            <torusGeometry args={[0.22, 0.072, 18, 72]} />
            <meshStandardMaterial color={MAT.RUBBER} roughness={0.94} metalness={0} />
        </mesh>
        {/* Rim disc */}
        <mesh castShadow>
            <cylinderGeometry args={[0.148, 0.148, 0.038, 32]} />
            <meshStandardMaterial color={MAT.SILVER} metalness={0.95} roughness={0.12} />
        </mesh>
        {/* Front hub */}
        <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
            <meshStandardMaterial color={MAT.DARK} metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Axle shaft */}
        <mesh>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 12]} />
            <meshStandardMaterial color={MAT.DARK} metalness={1} roughness={0.15} />
        </mesh>
    </group>
);

// ═══════════════════════════════════════════
//  CALLOUT 1 — Aero Stem (two-piece tapered)
//  CALLOUT 6 — Smartwatch OLED Cockpit
// ═══════════════════════════════════════════
const Stem: React.FC<{ battery: number }> = ({ battery }) => (
    <group>
        {/* Lower stem */}
        <mesh position={[0, 0.7, -0.84]} rotation={[-0.26, 0, 0]} castShadow>
            <cylinderGeometry args={[0.034, 0.052, 0.95, 14]} />
            <meshStandardMaterial color={MAT.SILVER} metalness={0.92} roughness={0.12} />
        </mesh>
        {/* Fold hinge bracket */}
        <mesh position={[0, 1.15, -0.9]} castShadow>
            <boxGeometry args={[0.065, 0.06, 0.065]} />
            <meshStandardMaterial color={MAT.DARK} metalness={1} roughness={0.2} />
        </mesh>
        {/* Upper stem */}
        <mesh position={[0, 1.56, -1.02]} rotation={[-0.16, 0, 0]} castShadow>
            <cylinderGeometry args={[0.028, 0.034, 1.08, 14]} />
            <meshStandardMaterial color={MAT.SILVER} metalness={0.92} roughness={0.1} />
        </mesh>
        {/* UNMSM G7 — flat decal flush on stem surface (no Html, no floating) */}
        <mesh position={[-0.036, 1.28, -0.98]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.28, 0.018]} />
            <meshStandardMaterial color="#111" roughness={1} metalness={0} />
        </mesh>
        {/* Contrast stripe above decal */}
        <mesh position={[-0.0365, 1.28, -0.98]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.26, 0.01]} />
            <meshStandardMaterial color="#c0c5cc" emissive="#a0a5aa" emissiveIntensity={0.5} roughness={0.4} />
        </mesh>

        {/* Handlebar T-bar */}
        <group position={[0, 2.1, -1.12]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.016, 0.016, 0.64, 12]} />
                <meshStandardMaterial color={MAT.SILVER} metalness={0.95} roughness={0.1} />
            </mesh>
            {/* Grip ends */}
            {([-0.3, 0.3] as number[]).map((x) => (
                <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.022, 0.022, 0.09, 12]} />
                    <meshStandardMaterial color={MAT.DARK} roughness={0.92} />
                </mesh>
            ))}
            {/* Headlight housing */}
            <mesh position={[0, -0.018, -0.036]} castShadow>
                <boxGeometry args={[0.068, 0.034, 0.03]} />
                <meshStandardMaterial color={MAT.SILVER} metalness={0.9} roughness={0.15} />
            </mesh>
            <mesh position={[0, -0.018, -0.052]}>
                <boxGeometry args={[0.052, 0.024, 0.008]} />
                <meshStandardMaterial color="#ddeeff" emissive="#99ccff" emissiveIntensity={2} />
            </mesh>
            <spotLight position={[0, -0.03, -0.6]} angle={0.28} penumbra={0.6} intensity={55} color="#d0e8ff" />

            {/* CALLOUT 6 — Smartwatch OLED (flush on stem top) */}
            <Html transform occlude position={[0, 0.055, -0.016]} rotation={[-0.35, 0, 0]}
                style={{
                    width: '58px', textAlign: 'center', pointerEvents: 'none',
                    background: 'rgba(2,2,4,0.97)', borderRadius: '4px', padding: '4px 5px',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 8px rgba(0,210,160,0.2)',
                }}>
                <div style={{ fontFamily: 'monospace' }}>
                    <div style={{ fontSize: '3.5px', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#fff', marginBottom: '1px' }}>UNMSM G7</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', lineHeight: 1, fontStyle: 'italic' }}>22</div>
                    <div style={{ fontSize: '3.5px', opacity: 0.45, color: '#fff', textTransform: 'uppercase' }}>km / h</div>
                    <div style={{ marginTop: '3px', height: '1.5px', background: 'rgba(255,255,255,0.08)', borderRadius: '1px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${battery}%`, background: '#00ffcc' }} />
                    </div>
                </div>
            </Html>
        </group>
    </group>
);

// ═══════════════════════════
//  FENDERS
// ═══════════════════════════
const Fenders: React.FC = () => (
    <>
        {/* Front fender (white) */}
        <mesh position={[0, 0.48, -0.9]} rotation={[0.18, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.285, 0.026, 24, 1, true, -Math.PI * 0.22, Math.PI * 0.65]} />
            <meshStandardMaterial color={MAT.WHITE} metalness={0.25} roughness={0.45} side={THREE.DoubleSide} />
        </mesh>
        {/* Rear fender (dark carbon) */}
        <mesh position={[0, 0.48, 0.84]} rotation={[-0.08, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.285, 0.026, 24, 1, true, -Math.PI * 0.5, Math.PI * 0.68]} />
            <meshStandardMaterial color={MAT.CARBON} metalness={0.5} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
    </>
);

// ═══════════════════════════
//  FORK
// ═══════════════════════════
const FrontFork: React.FC = () => (
    // Fork connects lower stem to front wheel center (y=0.295)
    <group position={[0, 0.295, -0.9]}>
        {/* Fork legs running from wheel hub up to stem base */}
        {([-0.055, 0.055] as number[]).map((x) => (
            <mesh key={x} position={[x, 0.3, 0]} rotation={[-0.12, 0, 0]} castShadow>
                <cylinderGeometry args={[0.011, 0.016, 0.65, 10]} />
                <meshStandardMaterial color={MAT.SILVER} metalness={0.92} roughness={0.12} />
            </mesh>
        ))}
        {/* Fork crown (bridge at top of legs) */}
        <mesh position={[0, 0.62, 0.01]} castShadow>
            <boxGeometry args={[0.14, 0.028, 0.038]} />
            <meshStandardMaterial color={MAT.SILVER} metalness={0.9} roughness={0.14} />
        </mesh>
        {/* Axle bolt */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.014, 0.014, 0.12, 10]} />
            <meshStandardMaterial color={MAT.DARK} metalness={1} roughness={0.15} />
        </mesh>
    </group>
);

// ═══════════════════════════
//  FULL SCOOTER MODEL
// ═══════════════════════════
const ScooterModel: React.FC<{ scooter: any, proximity: number }> = ({ scooter, proximity }) => {
    const wheelFrontRef = useRef<THREE.Group>(null);
    const wheelRearRef = useRef<THREE.Group>(null);
    const espRef = useRef<THREE.Mesh>(null);
    const active = proximity < 80;

    useFrame((_, delta) => {
        // Quaternion premultiply: spins around WORLD X axis (= wheel axle)
        // Negative angle = forward rolling (top of wheel goes backward = -Z for scooter moving in -Z)
        _qRoll.setFromAxisAngle(_ROLL_AXIS, -delta * 22);
        if (wheelFrontRef.current) wheelFrontRef.current.quaternion.premultiply(_qRoll);
        if (wheelRearRef.current) wheelRearRef.current.quaternion.premultiply(_qRoll);
        if (espRef.current) espRef.current.rotation.y += delta * 1.8;
    });

    return (
        <group position={[0, 0, -0.4]}>
            <Deck />
            <IoTCore espRef={espRef} active={active} />
            <UltrasonicSensors active={active} />
            <Stem battery={scooter.battery ?? 68} />
            <Fenders />
            <FrontFork />
            <RearWheel groupRef={wheelRearRef} />
            <FrontWheel groupRef={wheelFrontRef} />
            {/* LED underflow strip */}
            <mesh position={[0, 0.158, 0.05]}>
                <boxGeometry args={[0.45, 0.006, 1.88]} />
                <meshStandardMaterial color="#990000" emissive="#cc1100" emissiveIntensity={2.5} transparent opacity={0.65} />
            </mesh>
        </group>
    );
};

// ═══════════════════════════════════════
//  CITY TRACK — animated lane markings
// ═══════════════════════════════════════
const CityTrack: React.FC = () => {
    const laneRef = useRef<THREE.Group>(null);
    useFrame((_, delta) => {
        if (laneRef.current) {
            laneRef.current.children.forEach((child) => {
                child.position.z += delta * 9;
                if (child.position.z > 8) child.position.z -= 35;
            });
        }
    });
    const dashes = Array.from({ length: 14 }, (_, i) => i * 3.2 - 24);
    return (
        <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[8, 80]} />
                <meshStandardMaterial color="#383c42" roughness={0.87} metalness={0.06} />
            </mesh>
            {([-3.7, 3.7] as number[]).map((x) => (
                <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.001, 0]}>
                    <planeGeometry args={[0.1, 80]} />
                    <meshStandardMaterial color="#e0e0e0" roughness={0.9} />
                </mesh>
            ))}
            <group ref={laneRef}>
                {dashes.map((z) => (
                    <mesh key={`l${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[-1.4, 0.002, z]}>
                        <planeGeometry args={[0.1, 1.9]} />
                        <meshStandardMaterial color="#f5c800" roughness={0.8} />
                    </mesh>
                ))}
                {dashes.map((z) => (
                    <mesh key={`r${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[1.4, 0.002, z]}>
                        <planeGeometry args={[0.1, 1.9]} />
                        <meshStandardMaterial color="#f5c800" roughness={0.8} />
                    </mesh>
                ))}
            </group>
        </>
    );
};

// ═════════════════
//  CITY BUILDINGS
// ═════════════════
const CityBuildings: React.FC = () => {
    const cfg: [number, number, number, number, number, string][] = [
        [-7, 22, -6, 3.5, 4.5, '#c0c5cc'],
        [-10, 30, 0, 4, 5, '#a8b0bc'],
        [-7, 14, 6, 2.5, 3.5, '#d8dde4'],
        [-9, 28, 12, 3.5, 5, '#b0b8c4'],
        [-7.5, 38, -13, 4, 6, '#98a4b2'],
        [7, 24, -6, 3.5, 4.5, '#c0c5cc'],
        [10, 32, 0, 4, 5, '#a8b0bc'],
        [7, 16, 6, 2.5, 3.5, '#d8dde4'],
        [9, 26, 12, 3.5, 5, '#b0b8c4'],
        [7.5, 36, -13, 4, 6, '#98a4b2'],
    ];
    return (
        <group>
            {cfg.map(([x, h, z, w, d, col], i) => (
                <group key={i} position={[x, 0, z]}>
                    <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
                        <boxGeometry args={[w, h, d]} />
                        <meshStandardMaterial color={col} roughness={0.35} metalness={0.35} />
                    </mesh>
                    {/* glazing sheen */}
                    <mesh position={[0, h / 2, (x > 0 ? -1 : 1) * d / 2 + 0.01]}>
                        <planeGeometry args={[w * 0.88, h * 0.82]} />
                        <meshStandardMaterial color="#c8e4ff" emissive="#88bbdd" emissiveIntensity={0.12}
                            transparent opacity={0.28} roughness={0.04} metalness={0.95} side={THREE.FrontSide} />
                    </mesh>
                </group>
            ))}
            {/* Sidewalks */}
            {([-1, 1] as number[]).map((s) => (
                <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 4.6, 0.01, 0]} receiveShadow>
                    <planeGeometry args={[3.2, 60]} />
                    <meshStandardMaterial color="#c8c4c0" roughness={0.95} />
                </mesh>
            ))}
            {/* Lampposts */}
            {([-14, -5, 4, 13] as number[]).map((z) =>
                ([-4.4, 4.4] as number[]).map((x) => (
                    <group key={`${x}${z}`} position={[x, 0, z]}>
                        <mesh position={[0, 3.2, 0]}>
                            <cylinderGeometry args={[0.045, 0.065, 6.4, 8]} />
                            <meshStandardMaterial color="#4a4a4a" metalness={1} roughness={0.2} />
                        </mesh>
                        <pointLight position={[0, 6.5, 0]} intensity={18} distance={11} color="#fff0cc" />
                    </group>
                ))
            )}
        </group>
    );
};

// ════════
//  CANVAS
// ════════
export const Scooter3D: React.FC<Scooter3DProps> = ({ scooter, proximity }) => (
    <Canvas shadows gl={{ antialias: true, alpha: false }} dpr={[1, 2]} style={{ background: '#88b8e0' }}>
        <PerspectiveCamera makeDefault position={[3.2, 2.2, 5.5]} fov={44} />
        <OrbitControls
            enablePan={false}
            minPolarAngle={Math.PI / 5}
            maxPolarAngle={Math.PI / 2.1}
            autoRotate autoRotateSpeed={0.55}
            target={[0, 0.5, 0]}
        />

        {/* Daytime lighting */}
        <ambientLight intensity={0.75} color="#fff8f2" />
        <directionalLight position={[10, 22, 6]} intensity={2.8} color="#fff8e8" castShadow
            shadow-mapSize={[2048, 2048]} shadow-camera-far={30} />
        <directionalLight position={[-8, 8, -4]} intensity={0.7} color="#c8dfff" />
        <hemisphereLight args={['#87ceeb', '#404040', 0.4]} />

        <Suspense fallback={null}>
            <Sky sunPosition={[80, 22, 80]} turbidity={3.5} rayleigh={0.7}
                mieCoefficient={0.004} mieDirectionalG={0.82} />
            <Environment preset="park" />
            <CityTrack />
            <CityBuildings />
            <ScooterModel scooter={scooter} proximity={proximity} />
            <ContactShadows position={[0, 0.005, 0]} opacity={0.75} scale={10} blur={2} far={2.5} />

            <EffectComposer>
                <Bloom luminanceThreshold={1.1} mipmapBlur intensity={0.9} radius={0.45} />
                <Noise opacity={0.022} />
                <Vignette eskil={false} offset={0.2} darkness={0.75} />
            </EffectComposer>
        </Suspense>
    </Canvas>
);
