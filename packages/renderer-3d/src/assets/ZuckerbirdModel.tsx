const charcoal = "#202936";
const denim = "#344b6b";
const skin = "#e6bc98";
const hair = "#593c2e";
const ivory = "#f0eee5";
const screen = "#10394a";
const code = "#77f1d0";

/** Thick open frames and an outward-facing tablet stay legible at strategy-camera scale. */
export const ZuckerbirdModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="zuckerbird-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.13, 0.25, 0]}>
          <boxGeometry args={[0.18, 0.35, 0.2]} />
          <meshStandardMaterial color={denim} roughness={0.95} />
        </mesh>
        <mesh castShadow position={[side * 0.13, 0.09, 0.065]}>
          <boxGeometry args={[0.21, 0.13, 0.32]} />
          <meshStandardMaterial color={charcoal} roughness={0.85} />
        </mesh>
        <mesh position={[side * 0.13, 0.035, 0.065]}>
          <boxGeometry args={[0.22, 0.05, 0.33]} />
          <meshStandardMaterial color={ivory} roughness={0.9} />
        </mesh>
        <mesh position={[side * 0.13, 0.15, 0.12]}>
          <boxGeometry args={[0.13, 0.018, 0.055]} />
          <meshStandardMaterial color={ivory} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.65, 0]}>
      <boxGeometry args={[0.48, 0.47, 0.34]} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
    <mesh castShadow position={[0, 0.43, 0]}>
      <boxGeometry args={[0.46, 0.08, 0.35]} />
      <meshStandardMaterial color={charcoal} roughness={0.95} />
    </mesh>
    <mesh castShadow position={[0, 0.83, -0.15]} scale={[1, 0.85, 0.65]}>
      <sphereGeometry args={[0.28, 10, 6]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh position={[side * 0.075, 0.8, 0.18]} rotation={[0, 0, side * 0.1]}>
          <boxGeometry args={[0.022, 0.14, 0.022]} />
          <meshStandardMaterial color={ivory} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.29, 0.67, 0.045]} rotation={[0.3, 0, side * 0.18]}>
          <cylinderGeometry args={[0.105, 0.09, 0.33, 7]} />
          <meshStandardMaterial color={color} roughness={0.95} flatShading />
        </mesh>
        <mesh castShadow position={[side * 0.29, 0.57, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.085, 0.27, 7]} />
          <meshStandardMaterial color={color} roughness={0.95} flatShading />
        </mesh>
      </group>
    ))}
    <group name="zuckerbird-tablet" position={[0, 0.64, 0.39]} rotation={[-0.35, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.62, 0.38, 0.055]} />
        <meshStandardMaterial color={charcoal} metalness={0.3} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.031]}>
        <boxGeometry args={[0.53, 0.29, 0.012]} />
        <meshStandardMaterial color={screen} emissive={screen} emissiveIntensity={0.5} roughness={0.5} />
      </mesh>
      {[0.31, 0.2, 0.35, 0.24].map((width, index) => (
        <mesh key={index} position={[-0.2 + width / 2, 0.093 - index * 0.058, 0.04]}>
          <boxGeometry args={[width, 0.019, 0.008]} />
          <meshStandardMaterial color={code} emissive={code} emissiveIntensity={0.35} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh castShadow key={side} position={[side * 0.305, -0.07, 0]}>
          <sphereGeometry args={[0.075, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
    <mesh castShadow position={[0, 1.055, 0.015]} scale={[1, 1.08, 0.9]}>
      <sphereGeometry args={[0.235, 10, 8]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.21, -0.04]} scale={[1, 0.55, 0.9]}>
      <sphereGeometry args={[0.245, 9, 6]} />
      <meshStandardMaterial color={hair} roughness={0.95} flatShading />
    </mesh>
    {[-1, 0, 1].map((side) => (
      <mesh castShadow key={side} position={[side * 0.105, 1.305, 0]} rotation={[0.2, 0, -0.4]}>
        <coneGeometry args={[0.085, 0.16, 4]} />
        <meshStandardMaterial color={hair} roughness={0.95} flatShading />
      </mesh>
    ))}
    <group name="zuckerbird-glasses" position={[0, 1.09, 0.221]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.12, 0, 0]}>
          {[-1, 1].map((edge) => (
            <group key={edge}>
              <mesh castShadow position={[0, edge * 0.065, 0]}>
                <boxGeometry args={[0.21, 0.032, 0.045]} />
                <meshStandardMaterial color={charcoal} roughness={0.6} />
              </mesh>
              <mesh castShadow position={[edge * 0.089, 0, 0]}>
                <boxGeometry args={[0.032, 0.13, 0.045]} />
                <meshStandardMaterial color={charcoal} roughness={0.6} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0, -0.012]}>
            <boxGeometry args={[0.033, 0.047, 0.025]} />
            <meshStandardMaterial color={charcoal} />
          </mesh>
          <mesh castShadow position={[side * 0.089, 0.025, -0.11]}>
            <boxGeometry args={[0.032, 0.032, 0.23]} />
            <meshStandardMaterial color={charcoal} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh castShadow>
        <boxGeometry args={[0.055, 0.028, 0.045]} />
        <meshStandardMaterial color={charcoal} roughness={0.6} />
      </mesh>
    </group>
    <mesh castShadow position={[0, 1.015, 0.23]}>
      <sphereGeometry args={[0.04, 6, 4]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh position={[0, 0.963, 0.207]}>
      <boxGeometry args={[0.068, 0.014, 0.022]} />
      <meshStandardMaterial color={hair} roughness={0.9} />
    </mesh>
  </group>
);
