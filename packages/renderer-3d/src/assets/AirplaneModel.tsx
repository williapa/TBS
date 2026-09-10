import { Shape } from "three";

const ivory = "#e8edf0";
const graphite = "#303e4b";
const glass = "#479bb5";

// Solid tapered surfaces keep the aircraft silhouette readable at every camera angle.
const wing = new Shape();
wing.moveTo(-0.15, 0.2);
wing.lineTo(-0.77, -0.02);
wing.lineTo(-0.74, -0.24);
wing.lineTo(0.74, -0.24);
wing.lineTo(0.77, -0.02);
wing.lineTo(0.15, 0.2);
wing.closePath();

const tailFin = new Shape();
tailFin.moveTo(-0.64, 0.58);
tailFin.lineTo(-0.64, 1.04);
tailFin.lineTo(-0.5, 1.04);
tailFin.lineTo(-0.27, 0.58);
tailFin.closePath();

export const AirplaneModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="airplane-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh name="airplane-fuselage" castShadow position={[0, 0.58, 0]} scale={[0.17, 0.17, 0.68]}>
      <sphereGeometry args={[1, 16, 10]} />
      <meshStandardMaterial color={ivory} metalness={0.25} roughness={0.5} flatShading />
    </mesh>
    <mesh name="airplane-wings" castShadow position={[0, 0.55, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
      <extrudeGeometry args={[wing, { depth: 0.055, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} metalness={0.15} roughness={0.6} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh position={[side * 0.61, 0.553, -0.075]}>
          <boxGeometry args={[0.085, 0.012, 0.21]} />
          <meshStandardMaterial color={ivory} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[side * 0.23, 0.34, 0.15]} rotation={[0, 0, side * -0.22]}>
          <cylinderGeometry args={[0.022, 0.022, 0.3, 6]} />
          <meshStandardMaterial color={graphite} metalness={0.35} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[side * 0.26, 0.2, 0.15]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.105, 0.105, 0.07, 12]} />
          <meshStandardMaterial color={graphite} roughness={0.85} />
        </mesh>
      </group>
    ))}
    <mesh name="airplane-cockpit" castShadow position={[0, 0.72, 0.17]} scale={[0.125, 0.13, 0.23]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color={glass} metalness={0.35} roughness={0.2} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.74, 0.09]} scale={[0.13, 0.13, 0.023]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color={ivory} roughness={0.55} />
    </mesh>
    <mesh name="airplane-tailplane" castShadow position={[0, 0.6, -0.51]} rotation={[Math.PI / 2, 0, 0]} scale={[0.49, 0.6, 0.7]}>
      <extrudeGeometry args={[wing, { depth: 0.055, bevelEnabled: false }]} />
      <meshStandardMaterial color={ivory} metalness={0.15} roughness={0.6} />
    </mesh>
    <mesh name="airplane-tail-fin" castShadow position={[0.025, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <extrudeGeometry args={[tailFin, { depth: 0.05, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
    <group name="airplane-propeller" position={[0, 0.58, 0.63]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.12, 12]} />
        <meshStandardMaterial color={color} metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0, 0.075]} rotation={[0, 0, -0.38]}>
        <boxGeometry args={[0.065, 0.58, 0.035]} />
        <meshStandardMaterial color={graphite} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.13, 12]} />
        <meshStandardMaterial color={ivory} metalness={0.35} roughness={0.4} />
      </mesh>
    </group>
  </group>
);
