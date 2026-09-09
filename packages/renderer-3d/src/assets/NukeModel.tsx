const casing = "#59664a";
const steel = "#28333b";
const warning = "#f4cf45";
const ink = "#171e23";

/** A squat bomb with broad fins and hazard markings reads as a neutral pickup. */
export const NukeModel = ({ orientation }: Readonly<{ orientation: number }>) => (
  <group name="nuke-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.65, 0]}>
      <cylinderGeometry args={[0.32, 0.32, 0.5, 12]} />
      <meshStandardMaterial color={casing} metalness={0.25} roughness={0.65} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.9, 0]}>
      <sphereGeometry args={[0.32, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={casing} metalness={0.25} roughness={0.65} flatShading />
    </mesh>
    {[0.43, 0.87].map((height) => (
      <mesh castShadow key={height} position={[0, height, 0]}>
        <cylinderGeometry args={[0.327, 0.327, 0.065, 12]} />
        <meshStandardMaterial color={warning} metalness={0.15} roughness={0.6} />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.29, 0]}>
      <cylinderGeometry args={[0.32, 0.16, 0.22, 12]} />
      <meshStandardMaterial color={casing} metalness={0.25} roughness={0.65} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.13, 0]}>
      <cylinderGeometry args={[0.16, 0.16, 0.12, 12]} />
      <meshStandardMaterial color={steel} metalness={0.3} roughness={0.7} />
    </mesh>
    {[0, 1, 2, 3].map((side) => (
      <group key={side} rotation={[0, side * Math.PI / 2, 0]}>
        <mesh castShadow position={[0, 0.22, 0.29]}>
          <boxGeometry args={[0.065, 0.38, 0.3]} />
          <meshStandardMaterial color={steel} metalness={0.3} roughness={0.7} />
        </mesh>
        <group name="nuke-radiation-badge" position={[0, 0.65, 0.325]}>
          <mesh>
            <circleGeometry args={[0.165, 24]} />
            <meshStandardMaterial color={warning} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0, 0.003]}>
            <circleGeometry args={[0.027, 12]} />
            <meshStandardMaterial color={ink} roughness={0.8} />
          </mesh>
          {[0, 1, 2].map((blade) => (
            <mesh key={blade} position={[0, 0, 0.003]}>
              <ringGeometry args={[0.052, 0.132, 8, 1, Math.PI / 6 + blade * Math.PI * 2 / 3, Math.PI / 3]} />
              <meshStandardMaterial color={ink} roughness={0.8} />
            </mesh>
          ))}
        </group>
      </group>
    ))}
  </group>
);
