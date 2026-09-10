const ivory = "#e6ece6";
const steel = "#405762";
const glass = "#70d4df";
const reagent = "#7cde83";

/** A rooftop reagent flask gives the research facility a readable board-scale silhouette. */
export const LabModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="lab-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[1.2, 0.12, 1]} />
      <meshStandardMaterial color={steel} roughness={0.9} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
      <boxGeometry args={[1.04, 0.46, 0.82]} />
      <meshStandardMaterial color={ivory} roughness={0.8} />
    </mesh>
    <mesh castShadow position={[0, 0.6, 0]}>
      <boxGeometry args={[1.1, 0.1, 0.88]} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
    <mesh position={[0, 0.66, 0]}>
      <boxGeometry args={[0.99, 0.04, 0.77]} />
      <meshStandardMaterial color={steel} roughness={0.7} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh position={[side * 0.526, 0.39, 0]}>
          <boxGeometry args={[0.016, 0.17, 0.62]} />
          <meshStandardMaterial color={glass} metalness={0.2} roughness={0.3} />
        </mesh>
        {[-0.18, 0.18].map((z) => (
          <mesh key={z} position={[side * 0.54, 0.39, z]}>
            <boxGeometry args={[0.025, 0.2, 0.035]} />
            <meshStandardMaterial color={ivory} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[side * 0.34, 0.39, 0.417]}>
          <boxGeometry args={[0.2, 0.17, 0.016]} />
          <meshStandardMaterial color={glass} metalness={0.2} roughness={0.3} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.39, -0.417]}>
      <boxGeometry args={[0.82, 0.17, 0.016]} />
      <meshStandardMaterial color={glass} metalness={0.2} roughness={0.3} />
    </mesh>
    <group name="lab-entry" position={[0, 0.12, 0.43]}>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.29, 0.36, 0.035]} />
        <meshStandardMaterial color={steel} roughness={0.6} />
      </mesh>
      {[-0.066, 0.066].map((x) => (
        <mesh key={x} position={[x, 0.21, 0.02]}>
          <boxGeometry args={[0.105, 0.23, 0.012]} />
          <meshStandardMaterial color={glass} metalness={0.2} roughness={0.3} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.4, 0.035]}>
        <boxGeometry args={[0.42, 0.05, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
    </group>
    <group name="lab-rooftop-flask" position={[-0.17, 0.68, 0]}>
      <mesh castShadow position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.3, 0.32, 0.08, 12]} />
        <meshStandardMaterial color={ivory} roughness={0.7} />
      </mesh>
      {/* Opaque faceted glass keeps the flask legible without transparency sorting. */}
      <mesh castShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.15, 0.27, 0.28, 12]} />
        <meshStandardMaterial color={reagent} metalness={0.1} roughness={0.3} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.085, 0.15, 0.12, 12]} />
        <meshStandardMaterial color={glass} metalness={0.15} roughness={0.3} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.54, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.12, 12]} />
        <meshStandardMaterial color={glass} metalness={0.15} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.615, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.05, 12]} />
        <meshStandardMaterial color={ivory} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.641, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.076, 12]} />
        <meshStandardMaterial color={steel} roughness={0.9} />
      </mesh>
    </group>
    <group name="lab-rooftop-vent" position={[0.34, 0.75, -0.18]}>
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.14, 0.26]} />
        <meshStandardMaterial color={ivory} roughness={0.75} />
      </mesh>
      {[-0.07, 0, 0.07].map((z) => (
        <mesh key={z} position={[0, 0.075, z]}>
          <boxGeometry args={[0.15, 0.015, 0.025]} />
          <meshStandardMaterial color={steel} roughness={0.8} />
        </mesh>
      ))}
    </group>
  </group>
);
