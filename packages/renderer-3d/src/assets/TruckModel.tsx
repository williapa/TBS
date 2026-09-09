const rubber = "#202831";
const steel = "#81949f";
const glass = "#86cedf";
const bedLiner = "#40525a";

/** An open bed and separate hood distinguish the utility truck at strategy-camera scale. */
export const TruckModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="truck-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.34, 0]}>
      <boxGeometry args={[0.59, 0.17, 1.32]} />
      <meshStandardMaterial color={rubber} roughness={0.85} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.44, 0.44].map((z) => (
          <group key={z} name="truck-wheel" position={[side * 0.355, 0.32, z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.205, 0.205, 0.16, 12]} />
              <meshStandardMaterial color={rubber} roughness={0.98} flatShading />
            </mesh>
            <mesh position={[0, -side * 0.085, 0]}>
              <cylinderGeometry args={[0.105, 0.105, 0.022, 8]} />
              <meshStandardMaterial color={steel} metalness={0.45} roughness={0.5} />
            </mesh>
            <mesh position={[0, -side * 0.1, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.025, 6]} />
              <meshStandardMaterial color={rubber} roughness={0.75} />
            </mesh>
          </group>
        ))}
        <mesh castShadow position={[side * 0.33, 0.43, 0.12]}>
          <boxGeometry args={[0.16, 0.07, 0.34]} />
          <meshStandardMaterial color={steel} metalness={0.35} roughness={0.65} />
        </mesh>
      </group>
    ))}
    <group name="truck-cab">
      <mesh castShadow position={[0, 0.59, 0.12]}>
        <boxGeometry args={[0.63, 0.29, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, 0.82, 0.1]}>
        <boxGeometry args={[0.59, 0.27, 0.39]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.825, 0.301]}>
        <boxGeometry args={[0.49, 0.18, 0.02]} />
        <meshStandardMaterial color={glass} metalness={0.3} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.825, -0.101]}>
        <boxGeometry args={[0.4, 0.16, 0.02]} />
        <meshStandardMaterial color={glass} metalness={0.3} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 0.965, 0.1]}>
        <boxGeometry args={[0.67, 0.07, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.301, 0.825, 0.1]}>
            <boxGeometry args={[0.02, 0.18, 0.28]} />
            <meshStandardMaterial color={glass} metalness={0.3} roughness={0.25} />
          </mesh>
          <mesh position={[side * 0.324, 0.655, 0.005]}>
            <boxGeometry args={[0.025, 0.03, 0.1]} />
            <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh castShadow position={[side * 0.36, 0.775, 0.26]}>
            <boxGeometry args={[0.12, 0.09, 0.07]} />
            <meshStandardMaterial color={rubber} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
    <group name="truck-hood" position={[0, 0.565, 0.5]}>
      <mesh castShadow>
        <boxGeometry args={[0.65, 0.22, 0.35]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.02, 0.183]}>
        <boxGeometry args={[0.3, 0.13, 0.025]} />
        <meshStandardMaterial color={rubber} roughness={0.85} />
      </mesh>
      {[-0.04, 0, 0.04].map((y) => (
        <mesh key={y} position={[0, y - 0.02, 0.2]}>
          <boxGeometry args={[0.26, 0.015, 0.02]} />
          <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {[-0.245, 0.245].map((x) => (
        <mesh key={x} position={[x, 0.005, 0.183]}>
          <boxGeometry args={[0.12, 0.09, 0.025]} />
          <meshStandardMaterial color="#fff1c2" emissive="#e4c279" emissiveIntensity={0.2} roughness={0.35} />
        </mesh>
      ))}
    </group>
    <group name="truck-open-bed" position={[0, 0, -0.405]}>
      <mesh castShadow position={[0, 0.455, 0]}>
        <boxGeometry args={[0.64, 0.1, 0.6]} />
        <meshStandardMaterial color={bedLiner} roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh castShadow position={[side * 0.3, 0.6, 0]}>
            <boxGeometry args={[0.07, 0.25, 0.6]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <mesh castShadow position={[side * 0.3, 0.74, 0]}>
            <boxGeometry args={[0.09, 0.04, 0.62]} />
            <meshStandardMaterial color={steel} metalness={0.3} roughness={0.65} />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.6, -0.28]}>
        <boxGeometry args={[0.6, 0.25, 0.065]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.655, -0.32]}>
        <boxGeometry args={[0.14, 0.035, 0.02]} />
        <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
      </mesh>
      {[-0.18, 0, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.513, 0]}>
          <boxGeometry args={[0.02, 0.016, 0.49]} />
          <meshStandardMaterial color={steel} roughness={0.85} />
        </mesh>
      ))}
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, 0.535, -0.322]}>
          <boxGeometry args={[0.07, 0.09, 0.025]} />
          <meshStandardMaterial color="#ed5c50" roughness={0.4} />
        </mesh>
      ))}
    </group>
    {[-0.73, 0.73].map((z) => (
      <mesh castShadow key={z} position={[0, 0.415, z]}>
        <boxGeometry args={[0.7, 0.09, 0.08]} />
        <meshStandardMaterial color={steel} metalness={0.35} roughness={0.6} />
      </mesh>
    ))}
  </group>
);
