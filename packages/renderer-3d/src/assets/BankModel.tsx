const stone = "#ded6bf";
const trim = "#f6ebd2";
const gold = "#e8b84e";
const steel = "#63758a";
const recess = "#253344";

/** A fortified treasury with a vault entrance and a coin visible above the roof. */
export const BankModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="bank-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.09, 0]}>
      <boxGeometry args={[1.08, 0.16, 0.88]} />
      <meshStandardMaterial color={stone} roughness={0.85} />
    </mesh>
    {[0, 1].map((step) => (
      <mesh castShadow key={step} position={[0, 0.04 + step * 0.04, 0.56 - step * 0.08]}>
        <boxGeometry args={[0.66, 0.08 + step * 0.08, 0.18]} />
        <meshStandardMaterial color={trim} roughness={0.85} />
      </mesh>
    ))}
    <mesh castShadow position={[0, 0.48, -0.04]}>
      <boxGeometry args={[0.94, 0.64, 0.7]} />
      <meshStandardMaterial color={stone} roughness={0.85} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.39, 0.48, 0.36]}>
          <boxGeometry args={[0.13, 0.62, 0.15]} />
          <meshStandardMaterial color={trim} roughness={0.8} />
        </mesh>
        {[0.2, 0.76].map((height) => (
          <mesh castShadow key={height} position={[side * 0.39, height, 0.36]}>
            <boxGeometry args={[0.18, 0.07, 0.2]} />
            <meshStandardMaterial color={gold} metalness={0.4} roughness={0.4} />
          </mesh>
        ))}
        {[-0.23, 0.08].map((z) => (
          <group key={z} position={[side * 0.477, 0.49, z]}>
            <mesh>
              <boxGeometry args={[0.018, 0.29, 0.17]} />
              <meshStandardMaterial color={recess} roughness={0.7} />
            </mesh>
            <mesh position={[side * 0.013, 0, 0]}>
              <boxGeometry args={[0.025, 0.3, 0.022]} />
              <meshStandardMaterial color={gold} metalness={0.4} roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>
    ))}
    <group name="bank-vault" position={[0, 0.46, 0.33]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.265, 0.265, 0.06, 16]} />
        <meshStandardMaterial color={recess} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.225, 0.225, 0.06, 16]} />
        <meshStandardMaterial color={steel} metalness={0.55} roughness={0.4} flatShading />
      </mesh>
      <mesh position={[0, 0, 0.08]}>
        <torusGeometry args={[0.2, 0.018, 5, 16]} />
        <meshStandardMaterial color={gold} metalness={0.5} roughness={0.35} />
      </mesh>
      {[0, Math.PI / 3, -Math.PI / 3].map((angle) => (
        <mesh key={angle} position={[0, 0, 0.105]} rotation={[0, 0, angle]}>
          <boxGeometry args={[0.028, 0.24, 0.025]} />
          <meshStandardMaterial color={trim} metalness={0.35} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.048, 0.045, 8]} />
        <meshStandardMaterial color={gold} metalness={0.5} roughness={0.35} />
      </mesh>
    </group>
    <mesh castShadow position={[0, 0.84, -0.005]}>
      <boxGeometry args={[1.07, 0.12, 0.87]} />
      <meshStandardMaterial color={trim} roughness={0.8} />
    </mesh>
    <mesh castShadow position={[0, 0.915, -0.025]}>
      <boxGeometry args={[0.95, 0.06, 0.76]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <mesh castShadow position={[0, 0.98, 0]}>
      <boxGeometry args={[0.4, 0.08, 0.23]} />
      <meshStandardMaterial color={gold} metalness={0.4} roughness={0.4} />
    </mesh>
    <group name="bank-coin" position={[0, 1.19, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.235, 0.235, 0.085, 16]} />
        <meshStandardMaterial color={gold} metalness={0.5} roughness={0.35} flatShading />
      </mesh>
      {[0, Math.PI].map((rotation) => (
        <group key={rotation} rotation={[0, rotation, 0]}>
          <mesh position={[0, 0, 0.047]}>
            <torusGeometry args={[0.194, 0.012, 4, 16]} />
            <meshStandardMaterial color={trim} metalness={0.35} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <boxGeometry args={[0.024, 0.31, 0.015]} />
            <meshStandardMaterial color={recess} roughness={0.75} />
          </mesh>
          {[-1, 1].map((half) => (
            <mesh key={half} position={[0, half * 0.058, 0.05]} rotation={[0, 0, half === 1 ? Math.PI / 2 : -Math.PI / 2]}>
              <torusGeometry args={[0.063, 0.019, 5, 8, Math.PI * 1.5]} />
              <meshStandardMaterial color={recess} roughness={0.75} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  </group>
);
