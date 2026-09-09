const hullSilver = "#aebbc2";
const hullShadow = "#66747d";
const steel = "#d6dfe3";
const glass = "#233c4a";
const wake = "#b8e3ee";

/** A waterline-clipped capsule hull and raised periscope make the submarine legible from above. */
export const SubModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="sub-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.76, 1.25, 1]}>
      <torusGeometry args={[0.48, 0.025, 6, 24]} />
      <meshBasicMaterial color={wake} depthWrite={false} opacity={0.62} transparent />
    </mesh>

    <group name="sub-hull" position={[0, 0.015, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.72, 16]} />
        <meshStandardMaterial color={hullSilver} metalness={0.65} roughness={0.32} />
      </mesh>
      {[-0.36, 0.36].map((z) => (
        <mesh castShadow key={z} position={[0, 0, z]}>
          <sphereGeometry args={[0.28, 16, 10]} />
          <meshStandardMaterial color={hullSilver} metalness={0.65} roughness={0.32} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.02, -0.43]}>
        <boxGeometry args={[0.68, 0.045, 0.2]} />
        <meshStandardMaterial color={hullShadow} metalness={0.45} roughness={0.42} />
      </mesh>
      <mesh castShadow position={[0, 0.02, 0.49]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.38, 0.035, 0.16]} />
        <meshStandardMaterial color={hullShadow} metalness={0.45} roughness={0.42} />
      </mesh>
    </group>

    <group name="sub-sail" position={[0, 0.24, -0.03]}>
      <mesh castShadow scale={[0.2, 0.17, 0.31]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={hullShadow} metalness={0.55} roughness={0.38} />
      </mesh>
      <mesh castShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[0.405, 0.07, 0.33]} />
        <meshStandardMaterial color={color} roughness={0.58} />
      </mesh>
      <mesh castShadow position={[0, 0.12, 0]} scale={[0.18, 0.11, 0.27]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={steel} metalness={0.72} roughness={0.26} />
      </mesh>
    </group>

    <group name="sub-periscope" position={[0, 0.48, -0.03]}>
      <mesh castShadow position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.32, 10]} />
        <meshStandardMaterial color={steel} metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0.065]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.035, 0.13, 10]} />
        <meshStandardMaterial color={steel} metalness={0.8} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.32, 0.137]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.037, 0.037, 0.015, 10]} />
        <meshStandardMaterial color={glass} metalness={0.35} roughness={0.18} />
      </mesh>
    </group>
  </group>
);
