const leather = "#694b38";
const cream = "#f4e6bd";
const charcoal = "#26323d";
const glass = "#80deed";
const skin = "#d9ad85";

/** Oversized goggles and a trailing scarf identify the aviator at board scale. */
export const PilotModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="pilot-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.13, 0.28, 0]}>
          <boxGeometry args={[0.19, 0.4, 0.22]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.13, 0.095, 0.055]}>
          <boxGeometry args={[0.22, 0.19, 0.32]} />
          <meshStandardMaterial color={charcoal} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[side * 0.32, 0.65, 0]} rotation={[0, 0, side * 0.16]}>
          <boxGeometry args={[0.17, 0.35, 0.23]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[side * 0.35, 0.44, 0.025]}>
          <sphereGeometry args={[0.095, 8, 6]} />
          <meshStandardMaterial color={leather} roughness={0.95} flatShading />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.65, 0]}>
      <boxGeometry args={[0.46, 0.43, 0.33]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
    <mesh castShadow position={[0, 0.66, -0.235]}>
      <boxGeometry args={[0.35, 0.36, 0.17]} />
      <meshStandardMaterial color={leather} roughness={0.95} />
    </mesh>
    <group name="pilot-flight-harness">
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.12, 0.65, 0.179]} rotation={[0, 0, side * -0.12]}>
          <boxGeometry args={[0.065, 0.42, 0.03]} />
          <meshStandardMaterial color={cream} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.47, 0]}>
        <boxGeometry args={[0.48, 0.075, 0.35]} />
        <meshStandardMaterial color={leather} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.48, 0.19]}>
        <boxGeometry args={[0.105, 0.095, 0.035]} />
        <meshStandardMaterial color="#d7b55c" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
    <mesh castShadow position={[0, 1.04, 0]}>
      <sphereGeometry args={[0.24, 10, 8]} />
      <meshStandardMaterial color={leather} roughness={0.9} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.995, 0.165]}>
      <boxGeometry args={[0.3, 0.22, 0.14]} />
      <meshStandardMaterial color={skin} roughness={0.85} />
    </mesh>
    <group name="pilot-goggles">
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh castShadow position={[side * 0.105, 1.085, 0.225]} scale={[1.2, 0.85, 0.5]}>
            <sphereGeometry args={[0.105, 8, 6]} />
            <meshStandardMaterial color={charcoal} roughness={0.7} flatShading />
          </mesh>
          <mesh position={[side * 0.105, 1.088, 0.263]} scale={[1.2, 0.8, 0.35]}>
            <sphereGeometry args={[0.077, 8, 6]} />
            <meshStandardMaterial color={glass} metalness={0.35} roughness={0.2} flatShading />
          </mesh>
          <mesh castShadow position={[side * 0.238, 1.04, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.105, 0.105, 0.07, 10]} />
            <meshStandardMaterial color={charcoal} roughness={0.75} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.09, 0.247]}>
        <boxGeometry args={[0.075, 0.035, 0.03]} />
        <meshStandardMaterial color={cream} roughness={0.6} />
      </mesh>
    </group>
    <group name="pilot-scarf">
      <mesh castShadow position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.235, 0.22, 0.105, 10]} />
        <meshStandardMaterial color={cream} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0.18, 0.85, -0.29]} rotation={[0.2, -0.4, -0.12]}>
        <boxGeometry args={[0.16, 0.06, 0.48]} />
        <meshStandardMaterial color={cream} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0.28, 0.78, -0.5]} rotation={[-0.5, -0.4, 0]}>
        <boxGeometry args={[0.16, 0.06, 0.19]} />
        <meshStandardMaterial color={cream} roughness={0.95} />
      </mesh>
    </group>
  </group>
);
