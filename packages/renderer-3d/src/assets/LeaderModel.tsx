const gold = "#efc66a";
const armor = "#29364b";

/** A broad cape and five-point crown keep the commander readable at board scale. */
export const LeaderModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="leader-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.46, -0.14]} scale={[1, 1, 0.55]}>
      <cylinderGeometry args={[0.26, 0.46, 0.76, 6]} />
      <meshStandardMaterial color={color} roughness={0.9} flatShading />
    </mesh>
    {[-0.14, 0.14].map((x) => (
      <mesh castShadow key={x} position={[x, 0.16, 0.09]}>
        <boxGeometry args={[0.19, 0.26, 0.3]} />
        <meshStandardMaterial color={armor} roughness={0.75} />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.58, 0.05]}>
      <cylinderGeometry args={[0.29, 0.22, 0.56, 6]} />
      <meshStandardMaterial color={armor} metalness={0.25} roughness={0.55} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.37, 0.05]}>
      <cylinderGeometry args={[0.245, 0.23, 0.075, 6]} />
      <meshStandardMaterial color={gold} metalness={0.45} roughness={0.4} />
    </mesh>
    {[-0.29, 0.29].map((x) => (
      <mesh castShadow key={x} position={[x, 0.78, 0.04]} scale={[1, 0.55, 0.85]}>
        <sphereGeometry args={[0.17, 8, 4]} />
        <meshStandardMaterial color={gold} metalness={0.4} roughness={0.4} flatShading />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.68, 0.305]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.07, 0.07, 0.025, 4]} />
      <meshStandardMaterial color={gold} metalness={0.4} roughness={0.4} />
    </mesh>
    <mesh castShadow position={[0, 1.01, 0.05]}>
      <sphereGeometry args={[0.205, 10, 6]} />
      <meshStandardMaterial color="#e0d6c5" roughness={0.85} flatShading />
    </mesh>
    <group name="leader-crown" position={[0, 1.15, 0.05]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.205, 0.1, 10]} />
        <meshStandardMaterial color={gold} metalness={0.45} roughness={0.35} />
      </mesh>
      {Array.from({ length: 5 }, (_, index) => {
        const angle = index * Math.PI * 2 / 5;
        return (
          <mesh castShadow key={index} position={[Math.sin(angle) * 0.17, 0.105, Math.cos(angle) * 0.17]}>
            <coneGeometry args={[0.075, 0.19, 4]} />
            <meshStandardMaterial color={gold} metalness={0.45} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
    <group name="leader-staff" position={[0.43, 0, 0.19]}>
      <mesh castShadow position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.98, 6]} />
        <meshStandardMaterial color={gold} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 1.06, 0]}>
        <octahedronGeometry args={[0.12]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.35} flatShading />
      </mesh>
      <mesh castShadow position={[-0.025, 0.63, 0]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial color={armor} roughness={0.7} />
      </mesh>
    </group>
  </group>
);
