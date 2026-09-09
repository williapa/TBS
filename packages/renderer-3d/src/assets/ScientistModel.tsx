const labCoat = "#f1f0e6";
const charcoal = "#283b48";
const skin = "#d9b08c";
const hair = "#d9e3ea";
const lens = "#65d7e5";
const reagent = "#8ee64c";

/** Oversized goggles, a split lab coat, and a raised flask read clearly at board scale. */
export const ScientistModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="scientist-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.13, 0.2, 0]}>
          <boxGeometry args={[0.16, 0.3, 0.18]} />
          <meshStandardMaterial color={charcoal} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.13, 0.055, 0.065]}>
          <boxGeometry args={[0.2, 0.11, 0.3]} />
          <meshStandardMaterial color={charcoal} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[side * 0.15, 0.41, 0]} rotation={[0, 0, side * 0.09]}>
          <boxGeometry args={[0.25, 0.37, 0.35]} />
          <meshStandardMaterial color={labCoat} roughness={0.85} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.67, 0]}>
      <boxGeometry args={[0.48, 0.36, 0.32]} />
      <meshStandardMaterial color={labCoat} roughness={0.85} />
    </mesh>
    <mesh castShadow position={[0, 0.69, 0.169]}>
      <boxGeometry args={[0.19, 0.3, 0.025]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh castShadow key={side} position={[side * 0.105, 0.735, 0.19]} rotation={[0, 0, side * -0.3]}>
        <boxGeometry args={[0.085, 0.23, 0.04]} />
        <meshStandardMaterial color={labCoat} roughness={0.85} />
      </mesh>
    ))}
    <mesh castShadow position={[-0.165, 0.57, 0.183]}>
      <boxGeometry args={[0.11, 0.105, 0.035]} />
      <meshStandardMaterial color="#cbd6d9" roughness={0.9} />
    </mesh>
    <mesh castShadow position={[-0.17, 0.625, 0.185]} rotation={[0, 0, -0.1]}>
      <boxGeometry args={[0.025, 0.075, 0.025]} />
      <meshStandardMaterial color={charcoal} roughness={0.6} />
    </mesh>
    <group name="scientist-field-pack" position={[0, 0.64, -0.25]}>
      <mesh castShadow>
        <boxGeometry args={[0.32, 0.35, 0.19]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.02, -0.105]}>
        <boxGeometry args={[0.23, 0.06, 0.025]} />
        <meshStandardMaterial color={labCoat} roughness={0.8} />
      </mesh>
    </group>
    <mesh castShadow position={[-0.3, 0.61, 0.035]} rotation={[0.15, 0, -0.16]}>
      <cylinderGeometry args={[0.09, 0.08, 0.35, 7]} />
      <meshStandardMaterial color={labCoat} roughness={0.85} flatShading />
    </mesh>
    <group name="scientist-clipboard" position={[-0.35, 0.43, 0.19]} rotation={[-0.2, 0.2, -0.15]}>
      <mesh castShadow>
        <boxGeometry args={[0.24, 0.32, 0.045]} />
        <meshStandardMaterial color={charcoal} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.015, 0.028]}>
        <boxGeometry args={[0.19, 0.25, 0.015]} />
        <meshStandardMaterial color={labCoat} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.13, 0.035]}>
        <boxGeometry args={[0.1, 0.045, 0.025]} />
        <meshStandardMaterial color={lens} metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[-0.12, 0.035, 0]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial color={skin} roughness={0.85} flatShading />
      </mesh>
    </group>
    <mesh castShadow position={[0.31, 0.68, 0.025]} rotation={[0, 0, 0.5]}>
      <cylinderGeometry args={[0.09, 0.085, 0.29, 7]} />
      <meshStandardMaterial color={labCoat} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0.39, 0.69, 0.16]} rotation={[0.85, 0, 0]}>
      <cylinderGeometry args={[0.075, 0.08, 0.26, 7]} />
      <meshStandardMaterial color={labCoat} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0.4, 0.79, 0.25]}>
      <sphereGeometry args={[0.08, 8, 6]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <group name="scientist-flask" position={[0.43, 0.88, 0.28]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.055, 0.16, 0.23, 8]} />
        <meshStandardMaterial color={reagent} emissive={reagent} emissiveIntensity={0.15} roughness={0.3} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.165, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.12, 8]} />
        <meshStandardMaterial color={lens} metalness={0.15} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 0.225, 0]}>
        <cylinderGeometry args={[0.073, 0.073, 0.035, 8]} />
        <meshStandardMaterial color={labCoat} roughness={0.4} />
      </mesh>
    </group>
    <mesh castShadow position={[0, 1.025, 0.015]}>
      <sphereGeometry args={[0.22, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.14, -0.04]} scale={[1, 0.85, 1]}>
      <sphereGeometry args={[0.235, 9, 5]} />
      <meshStandardMaterial color={hair} roughness={0.95} flatShading />
    </mesh>
    {[-1, 0, 1].map((side) => (
      <mesh castShadow key={side} position={[side * 0.17, 1.215, -0.09]} rotation={[-0.45, 0, side * -0.65]}>
        <coneGeometry args={[0.115, 0.25, 4]} />
        <meshStandardMaterial color={hair} roughness={0.95} flatShading />
      </mesh>
    ))}
    <group name="scientist-goggles" position={[0, 1.07, 0.19]}>
      <mesh castShadow>
        <boxGeometry args={[0.43, 0.12, 0.075]} />
        <meshStandardMaterial color={charcoal} roughness={0.65} />
      </mesh>
      {[-0.105, 0.105].map((x) => (
        <mesh castShadow key={x} position={[x, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.073, 0.073, 0.035, 8]} />
          <meshStandardMaterial color={lens} metalness={0.25} roughness={0.25} />
        </mesh>
      ))}
    </group>
    <mesh castShadow position={[0, 0.99, 0.226]}>
      <sphereGeometry args={[0.048, 6, 4]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
  </group>
);
