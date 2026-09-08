const safetyYellow = "#f6c744";
const reflectiveSilver = "#e8edf2";
const denim = "#24496d";
const skin = "#d9b08c";
const bootLeather = "#3b2d28";
const toolSteel = "#68717d";
const toolWood = "#8a5a32";

/** A hard hat, reflective vest, work boots, and raised hammer identify the builder at board scale. */
export const ConstructionWorkerModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="construction-worker-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-0.14, 0.14].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        <mesh castShadow position={[0, 0.13, 0.035]}>
          <boxGeometry args={[0.18, 0.26, 0.22]} />
          <meshStandardMaterial color={denim} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.035, 0.09]}>
          <boxGeometry args={[0.2, 0.1, 0.36]} />
          <meshStandardMaterial color={bootLeather} roughness={0.95} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.49, 0]}>
      <boxGeometry args={[0.52, 0.52, 0.34]} />
      <meshStandardMaterial color={color} roughness={0.82} />
    </mesh>
    <mesh castShadow position={[0, 0.52, 0.178]}>
      <boxGeometry args={[0.43, 0.36, 0.025]} />
      <meshStandardMaterial color={safetyYellow} roughness={0.8} />
    </mesh>
    {[-0.16, 0.16].map((x) => (
      <mesh castShadow key={x} position={[x, 0.52, 0.196]}>
        <boxGeometry args={[0.065, 0.34, 0.025]} />
        <meshStandardMaterial color={reflectiveSilver} metalness={0.08} roughness={0.65} />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.43, 0.198]}>
      <boxGeometry args={[0.43, 0.055, 0.028]} />
      <meshStandardMaterial color={reflectiveSilver} metalness={0.08} roughness={0.65} />
    </mesh>
    <mesh castShadow position={[-0.335, 0.51, 0]} rotation={[0, 0, -0.08]}>
      <cylinderGeometry args={[0.075, 0.08, 0.47, 7]} />
      <meshStandardMaterial color={color} roughness={0.82} flatShading />
    </mesh>
    <mesh castShadow position={[-0.36, 0.28, 0]}>
      <sphereGeometry args={[0.085, 8, 6]} />
      <meshStandardMaterial color={skin} roughness={0.9} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.9, 0]}>
      <sphereGeometry args={[0.205, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.88} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.095, 0]}>
      <sphereGeometry args={[0.235, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={safetyYellow} roughness={0.72} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.085, 0.055]}>
      <cylinderGeometry args={[0.3, 0.3, 0.055, 12]} />
      <meshStandardMaterial color={safetyYellow} roughness={0.72} />
    </mesh>
    <group name="construction-worker-hammer" position={[0.38, 0.2, 0]} rotation={[0, 0, -0.2]}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.9, 7]} />
        <meshStandardMaterial color={toolWood} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.92, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.18, 0.42, 0.16]} />
        <meshStandardMaterial color={toolSteel} metalness={0.35} roughness={0.48} />
      </mesh>
      <mesh castShadow position={[-0.05, 0.45, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color={skin} roughness={0.9} flatShading />
      </mesh>
    </group>
  </group>
);
