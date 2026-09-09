import { Shape } from "three";

const casing = "#e8e5d9";
const red = "#c6403d";
const graphite = "#303e4b";

// A swept, solid fin stays legible from either side of the strategy camera.
const tailFin = new Shape();
tailFin.moveTo(0.12, 0.18);
tailFin.lineTo(0.38, 0.08);
tailFin.lineTo(0.38, 0.26);
tailFin.lineTo(0.12, 0.59);
tailFin.closePath();

export const MissileModel = ({ orientation }: Readonly<{ orientation: number }>) => (
  <group name="missile-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <group rotation={[0, 0, -0.18]} position={[-0.1, 0.04, 0]}>
      <mesh castShadow position={[0, 0.66, 0]}>
        <cylinderGeometry args={[0.145, 0.145, 0.8, 12]} />
        <meshStandardMaterial color={casing} metalness={0.2} roughness={0.65} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.24, 0]}>
        <coneGeometry args={[0.145, 0.36, 12]} />
        <meshStandardMaterial color={red} metalness={0.15} roughness={0.6} flatShading />
      </mesh>
      {[0.37, 1.02].map((height) => (
        <mesh castShadow key={height} position={[0, height, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.065, 12]} />
          <meshStandardMaterial color={graphite} metalness={0.3} roughness={0.6} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.24, 0]}>
        <cylinderGeometry args={[0.145, 0.1, 0.12, 12]} />
        <meshStandardMaterial color={graphite} metalness={0.35} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.1, 0.135, 0.1, 12, 1, true]} />
        <meshStandardMaterial color={graphite} metalness={0.4} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.115, 12]} />
        <meshStandardMaterial color="#151d26" roughness={0.95} />
      </mesh>
      {[0, 1, 2, 3].map((side) => (
        <group key={side} rotation={[0, Math.PI / 4 + side * Math.PI / 2, 0]}>
          <mesh castShadow position={[0, 0, -0.025]}>
            <extrudeGeometry args={[tailFin, { depth: 0.05, bevelEnabled: false }]} />
            <meshStandardMaterial color={graphite} metalness={0.2} roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0.146, 0.74, 0]}>
            <boxGeometry args={[0.018, 0.2, 0.055]} />
            <meshStandardMaterial color={red} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  </group>
);
