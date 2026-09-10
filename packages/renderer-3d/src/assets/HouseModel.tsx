import { Shape } from "three";

const plaster = "#eadfc8";
const trim = "#fff1d9";
const brick = "#995c46";

// Extrusion closes both gables so the pitched roof reads from every camera angle.
const roof = new Shape();
roof.moveTo(-0.5, 0);
roof.lineTo(0.5, 0);
roof.lineTo(0, 0.34);
roof.closePath();

const HouseWindow = () => (
  <group>
    <mesh>
      <boxGeometry args={[0.24, 0.25, 0.025]} />
      <meshStandardMaterial color={trim} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0, 0.018]}>
      <boxGeometry args={[0.18, 0.19, 0.015]} />
      <meshStandardMaterial color="#65b7cb" roughness={0.35} metalness={0.1} />
    </mesh>
    <mesh position={[0, 0, 0.03]}>
      <boxGeometry args={[0.02, 0.19, 0.012]} />
      <meshStandardMaterial color={trim} />
    </mesh>
    <mesh position={[0, 0, 0.03]}>
      <boxGeometry args={[0.18, 0.02, 0.012]} />
      <meshStandardMaterial color={trim} />
    </mesh>
  </group>
);

export const HouseModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="house-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[0.92, 0.12, 0.94]} />
      <meshStandardMaterial color="#9a968a" roughness={0.95} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
      <boxGeometry args={[0.84, 0.56, 0.82]} />
      <meshStandardMaterial color={plaster} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 0.68, -0.48]}>
      <extrudeGeometry args={[roof, { depth: 0.96, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
    <group name="house-chimney" position={[-0.25, 0, -0.2]}>
      <mesh castShadow position={[0, 0.94, 0]}>
        <boxGeometry args={[0.15, 0.34, 0.17]} />
        <meshStandardMaterial color={brick} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[0.2, 0.06, 0.22]} />
        <meshStandardMaterial color={brick} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.132, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.11, 0.13]} />
        <meshStandardMaterial color="#343130" roughness={1} />
      </mesh>
    </group>
    <group name="house-front-door" position={[-0.18, 0.3, 0.421]}>
      <mesh>
        <boxGeometry args={[0.25, 0.37, 0.03]} />
        <meshStandardMaterial color={trim} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.01, 0.02]}>
        <boxGeometry args={[0.19, 0.33, 0.02]} />
        <meshStandardMaterial color="#76503c" roughness={0.85} />
      </mesh>
      <mesh position={[0.055, -0.015, 0.04]}>
        <sphereGeometry args={[0.018, 8, 6]} />
        <meshStandardMaterial color="#e4b55e" metalness={0.4} roughness={0.45} />
      </mesh>
    </group>
    <mesh receiveShadow position={[-0.18, 0.06, 0.54]}>
      <boxGeometry args={[0.32, 0.12, 0.2]} />
      <meshStandardMaterial color={trim} roughness={0.95} />
    </mesh>
    <group position={[0.21, 0.43, 0.421]}><HouseWindow /></group>
    <group position={[0, 0.43, -0.421]} rotation={[0, Math.PI, 0]}><HouseWindow /></group>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 0.431, 0.43, 0]} rotation={[0, side * Math.PI / 2, 0]}>
        <HouseWindow />
      </group>
    ))}
  </group>
);
