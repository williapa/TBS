const coat = "#f3f1e7";
const teal = "#35b8b0";
const charcoal = "#263b48";
const skin = "#d9b08c";

/** A surgical cap, stethoscope, and medical case distinguish the medic at board scale. */
export const DoctorModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="doctor-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.13, 0.23, 0]}>
          <boxGeometry args={[0.17, 0.36, 0.2]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[side * 0.13, 0.06, 0.06]}>
          <boxGeometry args={[0.2, 0.12, 0.31]} />
          <meshStandardMaterial color={charcoal} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[side * 0.18, 0.51, 0]} rotation={[0, 0, side * 0.06]}>
          <boxGeometry args={[0.18, 0.48, 0.35]} />
          <meshStandardMaterial color={coat} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[side * 0.32, 0.62, 0]} rotation={[0, 0, side * 0.12]}>
          <cylinderGeometry args={[0.09, 0.08, 0.36, 7]} />
          <meshStandardMaterial color={coat} roughness={0.85} flatShading />
        </mesh>
        <mesh castShadow position={[side * 0.345, 0.42, 0.025]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color={skin} roughness={0.85} flatShading />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.64, 0]}>
      <boxGeometry args={[0.43, 0.4, 0.3]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh castShadow key={side} position={[side * 0.12, 0.73, 0.18]} rotation={[0, 0, side * -0.3]}>
        <boxGeometry args={[0.11, 0.24, 0.035]} />
        <meshStandardMaterial color={coat} roughness={0.85} />
      </mesh>
    ))}
    <group name="doctor-stethoscope" position={[0, 0.65, 0.21]}>
      <mesh rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.105, 0.022, 6, 12, Math.PI]} />
        <meshStandardMaterial color={charcoal} roughness={0.7} />
      </mesh>
      {[-0.105, 0.105].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]}>
          <cylinderGeometry args={[0.022, 0.022, 0.16, 6]} />
          <meshStandardMaterial color={charcoal} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0.035, -0.115, 0.025]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.025, 10]} />
        <meshStandardMaterial color="#c7dde0" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
    <mesh castShadow position={[0, 1.005, 0]}>
      <sphereGeometry args={[0.215, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.16, -0.015]}>
      <cylinderGeometry args={[0.19, 0.235, 0.18, 10]} />
      <meshStandardMaterial color={teal} roughness={0.85} flatShading />
    </mesh>
    <mesh position={[0, 0.965, 0.19]}>
      <boxGeometry args={[0.31, 0.135, 0.07]} />
      <meshStandardMaterial color={teal} roughness={0.9} />
    </mesh>
    {[-0.08, 0.08].map((x) => (
      <mesh key={x} position={[x, 1.055, 0.198]}>
        <sphereGeometry args={[0.022, 6, 4]} />
        <meshStandardMaterial color={charcoal} />
      </mesh>
    ))}
    <group name="doctor-medical-case" position={[0.43, 0.255, 0.055]}>
      <mesh castShadow position={[0, 0.125, 0]}>
        <torusGeometry args={[0.075, 0.022, 6, 10, Math.PI]} />
        <meshStandardMaterial color={charcoal} roughness={0.8} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.25, 0.23]} />
        <meshStandardMaterial color={teal} roughness={0.75} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 0.12]}>
          <mesh>
            <boxGeometry args={[0.17, 0.055, 0.015]} />
            <meshStandardMaterial color={coat} roughness={0.85} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.055, 0.17, 0.018]} />
            <meshStandardMaterial color={coat} roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  </group>
);
