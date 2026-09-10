const coveralls = "#294b68";
const seams = "#527691";
const ivory = "#eee4ce";
const skin = "#d9b08c";
const leather = "#302c2a";

/** Garage coveralls and a soft cap identify the worker without a handheld tool. */
export const WorkerModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="worker-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.57, 0]}>
      <boxGeometry args={[0.48, 0.5, 0.33]} />
      <meshStandardMaterial color={coveralls} roughness={0.92} />
    </mesh>
    <mesh castShadow position={[0, 0.35, 0]}>
      <boxGeometry args={[0.46, 0.16, 0.32]} />
      <meshStandardMaterial color={coveralls} roughness={0.92} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.135, 0.2, 0]}>
          <boxGeometry args={[0.19, 0.32, 0.25]} />
          <meshStandardMaterial color={coveralls} roughness={0.92} />
        </mesh>
        <mesh castShadow position={[side * 0.135, 0.065, 0.065]}>
          <boxGeometry args={[0.22, 0.13, 0.36]} />
          <meshStandardMaterial color={leather} roughness={0.9} />
        </mesh>
        <mesh position={[side * 0.135, 0.025, 0.065]}>
          <boxGeometry args={[0.23, 0.045, 0.37]} />
          <meshStandardMaterial color="#1d2227" roughness={0.95} />
        </mesh>
        <group position={[side * 0.29, 0.72, 0]} rotation={[0, 0, side * 0.12]}>
          <mesh castShadow position={[0, -0.07, 0]}>
            <cylinderGeometry args={[0.1, 0.09, 0.25, 8]} />
            <meshStandardMaterial color={coveralls} roughness={0.92} flatShading />
          </mesh>
          <mesh castShadow position={[0, 0.005, 0]}>
            <boxGeometry args={[0.185, 0.095, 0.22]} />
            <meshStandardMaterial color={color} roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0, -0.18, 0]}>
            <cylinderGeometry args={[0.102, 0.102, 0.075, 8]} />
            <meshStandardMaterial color={seams} roughness={0.95} flatShading />
          </mesh>
          <mesh castShadow position={[0, -0.295, 0]}>
            <cylinderGeometry args={[0.069, 0.063, 0.19, 8]} />
            <meshStandardMaterial color={skin} roughness={0.9} flatShading />
          </mesh>
          <mesh castShadow position={[0, -0.41, 0.02]}>
            <sphereGeometry args={[0.077, 8, 6]} />
            <meshStandardMaterial color={skin} roughness={0.9} flatShading />
          </mesh>
        </group>
        <mesh position={[side * 0.115, 0.61, 0.181]}>
          <boxGeometry args={[0.155, 0.14, 0.028]} />
          <meshStandardMaterial color={seams} roughness={0.95} />
        </mesh>
        <mesh position={[side * 0.115, 0.668, 0.198]}>
          <boxGeometry args={[0.16, 0.035, 0.025]} />
          <meshStandardMaterial color={coveralls} roughness={0.95} />
        </mesh>
        <mesh position={[side * 0.075, 0.772, 0.18]} rotation={[0, 0, side * 0.38]}>
          <boxGeometry args={[0.1, 0.13, 0.04]} />
          <meshStandardMaterial color={seams} roughness={0.9} />
        </mesh>
      </group>
    ))}
    <mesh position={[0, 0.555, 0.176]}>
      <boxGeometry args={[0.018, 0.35, 0.025]} />
      <meshStandardMaterial color="#b6b7ae" metalness={0.25} roughness={0.7} />
    </mesh>
    <mesh position={[-0.115, 0.697, 0.19]}>
      <boxGeometry args={[0.15, 0.055, 0.03]} />
      <meshStandardMaterial color={ivory} roughness={0.9} />
    </mesh>
    <mesh position={[-0.115, 0.697, 0.208]}>
      <boxGeometry args={[0.095, 0.012, 0.009]} />
      <meshStandardMaterial color={coveralls} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.72, -0.177]}>
      <boxGeometry args={[0.42, 0.12, 0.025]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 0.85, 0]}>
      <cylinderGeometry args={[0.085, 0.09, 0.13, 8]} />
      <meshStandardMaterial color={skin} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 1.005, 0]}>
      <sphereGeometry args={[0.195, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.9} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.095, -0.015]}>
      <sphereGeometry args={[0.207, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={coveralls} roughness={0.95} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.105, 0.165]}>
      <boxGeometry args={[0.34, 0.035, 0.25]} />
      <meshStandardMaterial color={coveralls} roughness={0.95} />
    </mesh>
    <mesh position={[0, 1.195, 0.162]}>
      <boxGeometry args={[0.105, 0.065, 0.025]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  </group>
);
