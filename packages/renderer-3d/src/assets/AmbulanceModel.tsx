const ivory = "#f2f3eb";
const rubber = "#25313a";
const steel = "#91a5ad";
const glass = "#79c9e2";
const medicalRed = "#df3945";

const MedicalCross = () => (
  <group>
    <mesh><boxGeometry args={[0.25, 0.075, 0.012]} /><meshStandardMaterial color={medicalRed} roughness={0.65} /></mesh>
    <mesh><boxGeometry args={[0.075, 0.25, 0.014]} /><meshStandardMaterial color={medicalRed} roughness={0.65} /></mesh>
  </group>
);

/** A tall medical compartment and roof markings remain readable from the strategy camera. */
export const AmbulanceModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="ambulance-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.35, 0]}>
      <boxGeometry args={[0.64, 0.16, 1.34]} />
      <meshStandardMaterial color={rubber} roughness={0.85} />
    </mesh>
    <mesh castShadow position={[0, 0.77, -0.25]}>
      <boxGeometry args={[0.74, 0.73, 0.86]} />
      <meshStandardMaterial color={ivory} roughness={0.65} />
    </mesh>
    <mesh castShadow position={[0, 0.58, 0.43]}>
      <boxGeometry args={[0.65, 0.3, 0.5]} />
      <meshStandardMaterial color={ivory} roughness={0.65} />
    </mesh>
    <mesh castShadow position={[0, 0.84, 0.31]}>
      <boxGeometry args={[0.63, 0.3, 0.36]} />
      <meshStandardMaterial color={ivory} roughness={0.65} />
    </mesh>
    <mesh position={[0, 0.86, 0.496]}>
      <boxGeometry args={[0.53, 0.2, 0.015]} />
      <meshStandardMaterial color={glass} metalness={0.25} roughness={0.25} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.44, 0.44].map((z) => (
          <group key={z} position={[side * 0.36, 0.31, z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.195, 0.195, 0.14, 12]} />
              <meshStandardMaterial color={rubber} roughness={0.95} flatShading />
            </mesh>
            <mesh position={[0, -side * 0.076, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.02, 8]} />
              <meshStandardMaterial color={steel} metalness={0.45} roughness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh position={[side * 0.377, 0.61, -0.25]}>
          <boxGeometry args={[0.018, 0.12, 0.85]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
        <group position={[side * 0.378, 0.9, -0.25]} rotation={[0, side * Math.PI / 2, 0]}><MedicalCross /></group>
        <mesh position={[side * 0.324, 0.85, 0.31]}>
          <boxGeometry args={[0.018, 0.19, 0.25]} />
          <meshStandardMaterial color={glass} metalness={0.25} roughness={0.25} />
        </mesh>
        <mesh position={[side * 0.334, 0.61, 0.42]}>
          <boxGeometry args={[0.02, 0.12, 0.49]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
        <mesh castShadow position={[side * 0.37, 0.81, 0.47]}>
          <boxGeometry args={[0.1, 0.09, 0.07]} />
          <meshStandardMaterial color={rubber} roughness={0.75} />
        </mesh>
        <mesh position={[side * 0.334, 0.72, 0.23]}>
          <boxGeometry args={[0.025, 0.025, 0.08]} />
          <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[side * 0.25, 0.59, 0.69]}>
          <boxGeometry args={[0.12, 0.1, 0.02]} />
          <meshStandardMaterial color="#fff0c4" emissive="#fff0c4" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[side * 0.31, 0.54, -0.696]}>
          <boxGeometry args={[0.07, 0.14, 0.025]} />
          <meshStandardMaterial color={medicalRed} roughness={0.4} />
        </mesh>
      </group>
    ))}
    <group name="ambulance-rear-doors" position={[0, 0.84, -0.688]}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.165, 0.095, 0]}>
            <boxGeometry args={[0.24, 0.18, 0.018]} />
            <meshStandardMaterial color={glass} metalness={0.25} roughness={0.25} />
          </mesh>
          <mesh position={[side * 0.06, -0.14, -0.006]}>
            <boxGeometry args={[0.025, 0.09, 0.025]} />
            <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, -0.025, 0]}>
        <boxGeometry args={[0.018, 0.61, 0.02]} />
        <meshStandardMaterial color={steel} roughness={0.7} />
      </mesh>
    </group>
    <group position={[0, 1.143, -0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={1.35}><MedicalCross /></group>
    <group name="ambulance-light-bar" position={[0, 1.17, 0.07]}>
      <mesh><boxGeometry args={[0.6, 0.055, 0.15]} /><meshStandardMaterial color={rubber} /></mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.19, 0.065, 0]}>
          <boxGeometry args={[0.19, 0.09, 0.14]} />
          <meshStandardMaterial color={side === -1 ? medicalRed : "#328de5"} emissive={side === -1 ? medicalRed : "#328de5"} emissiveIntensity={0.3} roughness={0.3} />
        </mesh>
      ))}
    </group>
    <mesh position={[0, 0.56, 0.69]}>
      <boxGeometry args={[0.29, 0.12, 0.025]} />
      <meshStandardMaterial color={rubber} roughness={0.8} />
    </mesh>
    {[-0.725, 0.725].map((z) => (
      <mesh castShadow key={z} position={[0, 0.405, z]}>
        <boxGeometry args={[0.73, 0.09, 0.08]} />
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.6} />
      </mesh>
    ))}
  </group>
);
