import { Shape } from "three";

const stone = "#e4dac2";
const trim = "#f8efd9";
const recess = "#273849";
const gold = "#e8b953";

const arch = new Shape();
arch.moveTo(-0.09, 0);
arch.lineTo(0.09, 0);
arch.lineTo(0.09, 0.18);
arch.absarc(0, 0.18, 0.09, 0, Math.PI, false);
arch.closePath();

// A solid gable keeps the roof readable from all six board camera angles.
const gable = new Shape();
gable.moveTo(-0.43, 0);
gable.lineTo(0.43, 0);
gable.lineTo(0, 0.3);
gable.closePath();

export const ChurchModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="church-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[0.98, 0.12, 1.18]} />
      <meshStandardMaterial color={stone} roughness={0.95} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0.395, -0.08]}>
      <boxGeometry args={[0.76, 0.55, 0.88]} />
      <meshStandardMaterial color={stone} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 0.67, -0.56]}>
      <extrudeGeometry args={[gable, { depth: 0.96, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.32, 0.05].map((z) => (
          <group key={z} position={[side * 0.386, 0.29, z]} rotation={[0, side * Math.PI / 2, 0]}>
            <mesh>
              <shapeGeometry args={[arch, 8]} />
              <meshStandardMaterial color={recess} roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.02, 0.006]} scale={[0.72, 0.85, 1]}>
              <shapeGeometry args={[arch, 8]} />
              <meshStandardMaterial color="#59becd" roughness={0.3} metalness={0.15} />
            </mesh>
            <mesh position={[0, 0.12, 0.014]}>
              <boxGeometry args={[0.022, 0.2, 0.012]} />
              <meshStandardMaterial color={gold} roughness={0.55} />
            </mesh>
            <mesh position={[0, 0.14, 0.014]}>
              <boxGeometry args={[0.13, 0.022, 0.012]} />
              <meshStandardMaterial color={gold} roughness={0.55} />
            </mesh>
          </group>
        ))}
        {[-0.48, -0.14, 0.23].map((z) => (
          <mesh castShadow key={z} position={[side * 0.405, 0.31, z]}>
            <boxGeometry args={[0.09, 0.38, 0.065]} />
            <meshStandardMaterial color={trim} roughness={0.9} />
          </mesh>
        ))}
      </group>
    ))}
    <group name="church-rose-window" position={[0, 0.47, -0.526]} rotation={[0, Math.PI, 0]}>
      <mesh>
        <circleGeometry args={[0.145, 12]} />
        <meshStandardMaterial color={recess} roughness={0.8} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((pane) => (
        <mesh key={pane} position={[0, 0, 0.006]} rotation={[0, 0, pane * Math.PI / 3]}>
          <circleGeometry args={[0.116, 2, 0.08, Math.PI / 3 - 0.16]} />
          <meshStandardMaterial color={pane % 2 === 0 ? "#59becd" : gold} roughness={0.35} />
        </mesh>
      ))}
    </group>
    <group name="church-bell-tower" position={[0, 0, 0.3]}>
      <mesh castShadow receiveShadow position={[0, 0.46, 0]}>
        <boxGeometry args={[0.38, 0.68, 0.38]} />
        <meshStandardMaterial color={trim} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.145, 0.196]} scale={[1.35, 1.45, 1]}>
        <shapeGeometry args={[arch, 8]} />
        <meshStandardMaterial color="#614535" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0.202]}>
        <boxGeometry args={[0.012, 0.27, 0.012]} />
        <meshStandardMaterial color={gold} roughness={0.7} />
      </mesh>
      <mesh receiveShadow position={[0, 0.09, 0.23]}>
        <boxGeometry args={[0.44, 0.06, 0.16]} />
        <meshStandardMaterial color={trim} roughness={0.9} />
      </mesh>
      {[0.81, 1.11].map((y) => (
        <mesh castShadow key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.46, 0.065, 0.46]} />
          <meshStandardMaterial color={stone} roughness={0.85} />
        </mesh>
      ))}
      {[-0.155, 0.155].flatMap((x) => [-0.155, 0.155].map((z) => (
        <mesh castShadow key={`${x}:${z}`} position={[x, 0.96, z]}>
          <boxGeometry args={[0.07, 0.24, 0.07]} />
          <meshStandardMaterial color={trim} roughness={0.85} />
        </mesh>
      )))}
      <mesh castShadow position={[0, 0.99, 0]}>
        <cylinderGeometry args={[0.04, 0.095, 0.13, 10]} />
        <meshStandardMaterial color={gold} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.91, 0]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color={recess} />
      </mesh>
      <mesh castShadow position={[0, 1.3, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.35, 0.34, 4]} />
        <meshStandardMaterial color={color} roughness={0.7} flatShading />
      </mesh>
      <group name="church-cross">
        <mesh castShadow position={[0, 1.55, 0]}>
          <boxGeometry args={[0.04, 0.23, 0.04]} />
          <meshStandardMaterial color={gold} metalness={0.35} roughness={0.45} />
        </mesh>
        <mesh castShadow position={[0, 1.59, 0]}>
          <boxGeometry args={[0.16, 0.04, 0.04]} />
          <meshStandardMaterial color={gold} metalness={0.35} roughness={0.45} />
        </mesh>
      </group>
    </group>
  </group>
);
