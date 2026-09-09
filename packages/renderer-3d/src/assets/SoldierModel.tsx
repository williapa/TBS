const armor = "#384a4d";
const uniform = "#65716a";
const charcoal = "#202b32";
const steel = "#8caaa9";
const visor = "#91d6dd";
const canvas = "#a39773";

/** Broad armor and a cross-body rifle keep the infantry silhouette legible from above. */
export const SoldierModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="soldier-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-0.16, 0.16].map((x) => (
      <group key={x} position={[x, 0, x < 0 ? 0.06 : -0.06]}>
        <mesh castShadow position={[0, 0.27, 0]}>
          <boxGeometry args={[0.19, 0.4, 0.21]} />
          <meshStandardMaterial color={uniform} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.075, 0.065]}>
          <boxGeometry args={[0.23, 0.15, 0.34]} />
          <meshStandardMaterial color={charcoal} roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, 0.31, 0.12]}>
          <boxGeometry args={[0.16, 0.16, 0.065]} />
          <meshStandardMaterial color={armor} roughness={0.72} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.65, 0]}>
      <cylinderGeometry args={[0.32, 0.25, 0.44, 6]} />
      <meshStandardMaterial color={armor} roughness={0.78} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.47, 0]}>
      <boxGeometry args={[0.49, 0.09, 0.34]} />
      <meshStandardMaterial color={charcoal} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 0.74, 0.27]}>
      <boxGeometry args={[0.28, 0.085, 0.045]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <group name="soldier-field-pack" position={[0, 0.65, -0.29]}>
      <mesh castShadow>
        <boxGeometry args={[0.38, 0.37, 0.2]} />
        <meshStandardMaterial color={canvas} roughness={0.96} />
      </mesh>
      <mesh castShadow position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.085, 0.085, 0.43, 8]} />
        <meshStandardMaterial color={uniform} roughness={0.96} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh castShadow key={x} position={[x, 0, -0.108]}>
          <boxGeometry args={[0.045, 0.37, 0.025]} />
          <meshStandardMaterial color={charcoal} roughness={0.9} />
        </mesh>
      ))}
    </group>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.33, 0.65, 0.02]} rotation={[0.2, 0, side * 0.15]}>
          <boxGeometry args={[0.17, 0.29, 0.2]} />
          <meshStandardMaterial color={uniform} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.33, 0.79, 0]} rotation={[0, 0, side * 0.15]}>
          <boxGeometry args={[0.23, 0.17, 0.3]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh castShadow position={[side * 0.28, 0.55, 0.2]} rotation={[0, side * -0.4, 0]}>
          <boxGeometry args={[0.16, 0.16, 0.32]} />
          <meshStandardMaterial color={armor} roughness={0.78} />
        </mesh>
        <mesh castShadow position={[side * 0.13, 0.49, 0.19]}>
          <boxGeometry args={[0.14, 0.16, 0.12]} />
          <meshStandardMaterial color={canvas} roughness={0.96} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.97, 0.025]}>
      <boxGeometry args={[0.33, 0.27, 0.3]} />
      <meshStandardMaterial color={charcoal} roughness={0.85} />
    </mesh>
    <mesh castShadow position={[0, 1.02, 0.186]}>
      <boxGeometry args={[0.29, 0.075, 0.04]} />
      <meshStandardMaterial color={visor} metalness={0.35} roughness={0.3} />
    </mesh>
    <mesh castShadow position={[0, 1.09, 0]} scale={[1, 0.75, 1]}>
      <sphereGeometry args={[0.265, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={armor} roughness={0.72} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.085, 0.035]}>
      <cylinderGeometry args={[0.275, 0.255, 0.065, 8]} />
      <meshStandardMaterial color={armor} roughness={0.72} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.255, 0.03]}>
      <boxGeometry args={[0.085, 0.055, 0.23]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <group name="soldier-rifle" position={[0, 0.64, 0.36]} rotation={[0, 0, -0.22]}>
      <mesh castShadow>
        <boxGeometry args={[0.48, 0.13, 0.13]} />
        <meshStandardMaterial color={charcoal} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.32, -0.025, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.115]} />
        <meshStandardMaterial color={canvas} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.34, 0.025, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.033, 0.033, 0.24, 6]} />
        <meshStandardMaterial color={steel} metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0.025, -0.12, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.1, 0.18, 0.09]} />
        <meshStandardMaterial color={charcoal} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0.04, 0.105, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.065]} />
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.55} />
      </mesh>
      {[-0.2, 0.2].map((x) => (
        <mesh castShadow key={x} position={[x, -0.055, 0.015]}>
          <boxGeometry args={[0.12, 0.12, 0.17]} />
          <meshStandardMaterial color={uniform} roughness={0.95} />
        </mesh>
      ))}
    </group>
  </group>
);
