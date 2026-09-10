const ivory = "#f3eedc";
const gold = "#e8bd58";
const skin = "#d9b08c";
const charcoal = "#303342";

/** A flared robe, mitre, and cross staff distinguish the priest at board scale. */
export const PriestModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="priest-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.43, 0]} scale={[1, 1, 0.8]}>
      <cylinderGeometry args={[0.23, 0.37, 0.76, 8]} />
      <meshStandardMaterial color={ivory} roughness={0.9} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.095, 0]} scale={[1, 1, 0.8]}>
      <cylinderGeometry args={[0.36, 0.37, 0.065, 8]} />
      <meshStandardMaterial color={gold} roughness={0.65} />
    </mesh>
    <mesh castShadow position={[0, 0.74, 0]} scale={[1, 1, 0.8]}>
      <cylinderGeometry args={[0.17, 0.34, 0.22, 8]} />
      <meshStandardMaterial color={color} roughness={0.9} flatShading />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.12, 0.52, 0.225]} rotation={[-0.16, 0, 0]}>
          <boxGeometry args={[0.1, 0.52, 0.04]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[side * 0.12, 0.29, 0.28]}>
          <boxGeometry args={[0.105, 0.045, 0.025]} />
          <meshStandardMaterial color={gold} roughness={0.65} />
        </mesh>
        <mesh castShadow position={[side * 0.31, 0.65, 0.055]} rotation={[0.3, 0, side * 0.5]}>
          <cylinderGeometry args={[0.1, 0.14, 0.34, 8]} />
          <meshStandardMaterial color={ivory} roughness={0.9} flatShading />
        </mesh>
        <mesh castShadow position={[side * 0.39, 0.52, 0.13]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.85} flatShading />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.99, 0]}>
      <sphereGeometry args={[0.2, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    {[-0.075, 0.075].map((x) => (
      <mesh key={x} position={[x, 1.02, 0.184]}>
        <sphereGeometry args={[0.022, 6, 4]} />
        <meshStandardMaterial color={charcoal} />
      </mesh>
    ))}
    <group name="priest-mitre" position={[0, 1.21, 0]}>
      <mesh castShadow scale={[1, 1, 0.65]}>
        <cylinderGeometry args={[0.22, 0.21, 0.2, 8]} />
        <meshStandardMaterial color={ivory} roughness={0.85} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.65]}>
        <coneGeometry args={[0.3, 0.26, 4]} />
        <meshStandardMaterial color={ivory} roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, -0.065, 0]} scale={[1, 1, 0.65]}>
        <cylinderGeometry args={[0.221, 0.22, 0.055, 8]} />
        <meshStandardMaterial color={gold} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.015, 0.15]}>
        <boxGeometry args={[0.035, 0.15, 0.02]} />
        <meshStandardMaterial color={gold} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.045, 0.15]}>
        <boxGeometry args={[0.11, 0.035, 0.025]} />
        <meshStandardMaterial color={gold} roughness={0.5} />
      </mesh>
    </group>
    <group name="priest-cross-staff" position={[0.43, 0, 0.15]}>
      <mesh castShadow position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 1.4, 6]} />
        <meshStandardMaterial color={gold} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 1.28, 0]}>
        <boxGeometry args={[0.27, 0.055, 0.055]} />
        <meshStandardMaterial color={gold} metalness={0.35} roughness={0.45} />
      </mesh>
    </group>
    <group name="priest-prayer-book" position={[-0.4, 0.59, 0.23]} rotation={[-0.2, 0, -0.18]}>
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.3, 0.1]} />
        <meshStandardMaterial color={charcoal} roughness={0.85} />
      </mesh>
      <mesh position={[0.015, 0, 0]}>
        <boxGeometry args={[0.245, 0.25, 0.07]} />
        <meshStandardMaterial color={ivory} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0, 0.057]}>
        <boxGeometry args={[0.03, 0.17, 0.015]} />
        <meshStandardMaterial color={gold} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.03, 0.057]}>
        <boxGeometry args={[0.12, 0.03, 0.018]} />
        <meshStandardMaterial color={gold} roughness={0.6} />
      </mesh>
    </group>
  </group>
);
