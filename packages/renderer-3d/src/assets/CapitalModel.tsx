const stone = "#e8dfc9";
const trim = "#f5eddc";
const gold = "#efc66a";
const recess = "#29364b";

/** A low, wide civic hall and raised dome distinguish the capital at board scale. */
export const CapitalModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="capital-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.1, 0]}>
      <boxGeometry args={[1.16, 0.16, 0.84]} />
      <meshStandardMaterial color={stone} roughness={0.85} />
    </mesh>
    {[0, 1, 2].map((step) => (
      <mesh castShadow key={step} position={[0, 0.04 + step * 0.045, 0.55 - step * 0.08]}>
        <boxGeometry args={[0.62, 0.08 + step * 0.09, 0.16]} />
        <meshStandardMaterial color={trim} roughness={0.85} />
      </mesh>
    ))}
    {[-0.4, 0.4].map((x) => (
      <group key={x} position={[x, 0, -0.04]}>
        <mesh castShadow position={[0, 0.37, 0]}>
          <boxGeometry args={[0.32, 0.4, 0.64]} />
          <meshStandardMaterial color={stone} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.6, 0]}>
          <boxGeometry args={[0.36, 0.1, 0.68]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.4, 0.325]}>
          <boxGeometry args={[0.1, 0.2, 0.015]} />
          <meshStandardMaterial color={recess} roughness={0.8} />
        </mesh>
        <mesh position={[Math.sign(x) * 0.165, 0.4, 0]}>
          <boxGeometry args={[0.015, 0.2, 0.24]} />
          <meshStandardMaterial color={recess} roughness={0.8} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.48, -0.04]}>
      <boxGeometry args={[0.52, 0.62, 0.58]} />
      <meshStandardMaterial color={stone} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.39, 0.26]}>
      <boxGeometry args={[0.2, 0.4, 0.025]} />
      <meshStandardMaterial color={recess} roughness={0.8} />
    </mesh>
    {[-0.24, -0.08, 0.08, 0.24].map((x) => (
      <mesh castShadow key={x} position={[x, 0.44, 0.39]}>
        <cylinderGeometry args={[0.035, 0.045, 0.46, 8]} />
        <meshStandardMaterial color={trim} roughness={0.8} />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.71, 0.36]}>
      <boxGeometry args={[0.64, 0.09, 0.28]} />
      <meshStandardMaterial color={trim} roughness={0.8} />
    </mesh>
    <mesh castShadow position={[0, 0.82, 0.36]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.46, 0.18, 4]} />
      <meshStandardMaterial color={color} roughness={0.7} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.85, -0.06]}>
      <cylinderGeometry args={[0.28, 0.3, 0.18, 12]} />
      <meshStandardMaterial color={color} roughness={0.7} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.95, -0.06]}>
      <cylinderGeometry args={[0.31, 0.31, 0.05, 12]} />
      <meshStandardMaterial color={trim} roughness={0.8} />
    </mesh>
    <mesh castShadow position={[0, 0.975, -0.06]}>
      <sphereGeometry args={[0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={gold} metalness={0.35} roughness={0.45} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.31, -0.06]}>
      <cylinderGeometry args={[0.045, 0.065, 0.12, 8]} />
      <meshStandardMaterial color={trim} roughness={0.75} />
    </mesh>
    <mesh castShadow position={[0, 1.4, -0.06]}>
      <octahedronGeometry args={[0.07]} />
      <meshStandardMaterial color={gold} metalness={0.35} roughness={0.45} />
    </mesh>
  </group>
);
