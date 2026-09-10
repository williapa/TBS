import { DoubleSide } from "three";

const khaki = "#c9b77b";
const olive = "#687448";
const leather = "#604330";
const skin = "#b9825e";
const steel = "#9aafb3";

/** The broad safari brim and open feed bucket give the animal specialist its silhouette. */
export const ZookeeperModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="zookeeper-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.13, 0.27, 0]}>
          <boxGeometry args={[0.19, 0.32, 0.25]} />
          <meshStandardMaterial color={olive} roughness={0.95} />
        </mesh>
        <mesh castShadow position={[side * 0.13, 0.08, 0.055]}>
          <boxGeometry args={[0.23, 0.16, 0.35]} />
          <meshStandardMaterial color={leather} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.29, 0.72, 0]} rotation={[0, 0, side * 0.18]}>
          <cylinderGeometry args={[0.11, 0.09, 0.24, 8]} />
          <meshStandardMaterial color={color} roughness={0.9} flatShading />
        </mesh>
        <mesh castShadow position={[side * 0.33, 0.51, 0.035]} rotation={[-0.2, 0, side * 0.12]}>
          <cylinderGeometry args={[0.07, 0.065, 0.24, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} flatShading />
        </mesh>
        <mesh castShadow position={[side * 0.345, 0.39, 0.06]}>
          <sphereGeometry args={[0.079, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.9} flatShading />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.61, 0]}>
      <boxGeometry args={[0.44, 0.44, 0.3]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.145, 0.615, 0.025]}>
          <boxGeometry args={[0.17, 0.43, 0.32]} />
          <meshStandardMaterial color={khaki} roughness={0.95} />
        </mesh>
        <mesh position={[side * 0.145, 0.52, 0.2]}>
          <boxGeometry args={[0.135, 0.13, 0.055]} />
          <meshStandardMaterial color={olive} roughness={0.95} />
        </mesh>
        <mesh position={[side * 0.145, 0.58, 0.23]}>
          <boxGeometry args={[0.145, 0.04, 0.025]} />
          <meshStandardMaterial color={khaki} roughness={0.95} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.39, 0]}>
      <boxGeometry args={[0.46, 0.065, 0.33]} />
      <meshStandardMaterial color={leather} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.39, 0.177]}>
      <boxGeometry args={[0.075, 0.07, 0.025]} />
      <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh castShadow position={[0, 0.86, 0]}>
      <cylinderGeometry args={[0.08, 0.09, 0.12, 8]} />
      <meshStandardMaterial color={skin} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 1.01, 0]}>
      <sphereGeometry args={[0.2, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.9} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.055, -0.085]}>
      <sphereGeometry args={[0.18, 10, 7]} />
      <meshStandardMaterial color={leather} roughness={1} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.96, -0.2]} rotation={[0.3, 0, 0]}>
      <capsuleGeometry args={[0.085, 0.16, 3, 6]} />
      <meshStandardMaterial color={leather} roughness={1} flatShading />
    </mesh>
    {[-0.075, 0.075].map((x) => (
      <mesh key={x} position={[x, 1.04, 0.182]}>
        <sphereGeometry args={[0.021, 6, 4]} />
        <meshStandardMaterial color="#302b25" roughness={0.9} />
      </mesh>
    ))}
    <group name="zookeeper-safari-hat">
      <mesh castShadow position={[0, 1.16, 0.015]} scale={[1, 1, 0.9]}>
        <cylinderGeometry args={[0.355, 0.37, 0.045, 12]} />
        <meshStandardMaterial color={khaki} roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.255, 0]}>
        <cylinderGeometry args={[0.18, 0.235, 0.17, 10]} />
        <meshStandardMaterial color={khaki} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, 1.205, 0]}>
        <cylinderGeometry args={[0.224, 0.24, 0.05, 10]} />
        <meshStandardMaterial color={color} roughness={0.9} flatShading />
      </mesh>
    </group>
    <group name="zookeeper-feed-bucket" position={[0.46, 0.19, 0.07]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.155, 0.115, 0.24, 10, 1, true]} />
        <meshStandardMaterial color={steel} metalness={0.3} roughness={0.65} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.115, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.02, 10]} />
        <meshStandardMaterial color={steel} metalness={0.3} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.15, 0.018, 4, 10]} />
        <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <torusGeometry args={[0.135, 0.012, 4, 10, Math.PI]} />
        <meshStandardMaterial color={leather} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.065, 0.085, 0]} rotation={[0, 0, side * -0.22]}>
          <mesh castShadow rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.047, 0.22, 6]} />
            <meshStandardMaterial color="#ef963b" roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.058, 0.12, 4]} />
            <meshStandardMaterial color="#4b813d" roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  </group>
);
