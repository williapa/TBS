const ivory = "#e8edf0";
const graphite = "#303e4b";
const glass = "#479bb5";

export const HelicopterModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="helicopter-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh name="helicopter-cabin" castShadow position={[0, 0.58, 0.16]} scale={[0.27, 0.25, 0.4]}>
      <sphereGeometry args={[1, 16, 10]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.55} flatShading />
    </mesh>
    <mesh name="helicopter-canopy" castShadow position={[0, 0.65, 0.35]} scale={[0.235, 0.19, 0.25]}>
      <sphereGeometry args={[1, 16, 10]} />
      <meshStandardMaterial color={glass} metalness={0.35} roughness={0.2} flatShading />
    </mesh>
    <mesh position={[0, 0.66, 0.36]} scale={[0.019, 0.197, 0.253]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshStandardMaterial color={ivory} roughness={0.6} />
    </mesh>
    <mesh name="helicopter-engine" castShadow position={[0, 0.81, -0.03]}>
      <boxGeometry args={[0.26, 0.13, 0.32]} />
      <meshStandardMaterial color={ivory} metalness={0.2} roughness={0.6} />
    </mesh>
    <mesh name="helicopter-tail-boom" castShadow position={[0, 0.61, -0.4]} rotation={[-Math.PI / 2 - 0.12, 0, 0]}>
      <cylinderGeometry args={[0.045, 0.13, 0.72, 8]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.55} />
    </mesh>
    <mesh name="helicopter-tail-fin" castShadow position={[0, 0.77, -0.7]} rotation={[-0.25, 0, 0]}>
      <boxGeometry args={[0.05, 0.34, 0.16]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
    <mesh castShadow position={[0, 0.65, -0.58]}>
      <boxGeometry args={[0.4, 0.035, 0.13]} />
      <meshStandardMaterial color={ivory} roughness={0.6} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh name="helicopter-skid" castShadow position={[side * 0.3, 0.16, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.027, 0.027, 0.78, 8]} />
          <meshStandardMaterial color={graphite} metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[side * 0.3, 0.185, 0.5]} rotation={[Math.PI / 3, 0, 0]}>
          <cylinderGeometry args={[0.027, 0.027, 0.12, 8]} />
          <meshStandardMaterial color={graphite} metalness={0.4} roughness={0.6} />
        </mesh>
        {[-0.13, 0.28].map((z) => (
          <mesh key={z} castShadow position={[side * 0.24, 0.29, z]} rotation={[0, 0, side * 0.42]}>
            <cylinderGeometry args={[0.022, 0.022, 0.29, 8]} />
            <meshStandardMaterial color={ivory} metalness={0.3} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[side * 0.257, 0.59, 0.02]}>
          <boxGeometry args={[0.012, 0.045, 0.13]} />
          <meshStandardMaterial color={ivory} roughness={0.6} />
        </mesh>
      </group>
    ))}
    <group name="helicopter-main-rotor" position={[0, 1.02, 0.02]}>
      <mesh castShadow position={[0, -0.07, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.2, 8]} />
        <meshStandardMaterial color={graphite} metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Fixed blades preserve demand rendering and remain legible with reduced motion. */}
      {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle) => (
        <group key={angle} rotation={[0, angle + 0.3, 0]}>
          <mesh castShadow position={[0.4, 0, 0]}>
            <boxGeometry args={[0.7, 0.025, 0.075]} />
            <meshStandardMaterial color={graphite} metalness={0.3} roughness={0.6} />
          </mesh>
          <mesh position={[0.7, 0.001, 0]}>
            <boxGeometry args={[0.08, 0.028, 0.077]} />
            <meshStandardMaterial color={ivory} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.065, 10, 6]} />
        <meshStandardMaterial color={ivory} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
    <group name="helicopter-tail-rotor" position={[0.085, 0.78, -0.72]} rotation={[0.3, 0, 0]}>
      {[0, Math.PI / 2].map((angle) => (
        <mesh key={angle} castShadow rotation={[angle, 0, 0]}>
          <boxGeometry args={[0.025, 0.34, 0.045]} />
          <meshStandardMaterial color={graphite} roughness={0.6} />
        </mesh>
      ))}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.07, 10]} />
        <meshStandardMaterial color={ivory} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  </group>
);
