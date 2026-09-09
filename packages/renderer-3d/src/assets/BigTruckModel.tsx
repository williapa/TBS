const rubber = "#202831";
const steel = "#9bafb9";
const glass = "#86cedf";
const trailer = "#e1e7e8";

/** A tall tractor and enclosed trailer distinguish the semi at strategy-camera scale. */
export const BigTruckModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="big-truck-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.32, 0]}>
      <boxGeometry args={[0.53, 0.12, 1.53]} />
      <meshStandardMaterial color={rubber} roughness={0.85} />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.69, -0.39, 0.06, 0.61].map((z) => (
          <group key={z} name="semi-wheel" position={[side * 0.32, 0.27, z]} rotation={[0, 0, Math.PI / 2]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.15, 0.15, 0.14, 12]} />
              <meshStandardMaterial color={rubber} roughness={0.98} flatShading />
            </mesh>
            <mesh position={[0, -side * 0.075, 0]}>
              <cylinderGeometry args={[0.085, 0.085, 0.025, 8]} />
              <meshStandardMaterial color={steel} metalness={0.55} roughness={0.4} />
            </mesh>
          </group>
        ))}
        <mesh castShadow position={[side * 0.32, 0.39, 0.31]}>
          <boxGeometry args={[0.15, 0.08, 0.28]} />
          <meshStandardMaterial color={steel} metalness={0.5} roughness={0.45} />
        </mesh>
        <group name="semi-exhaust" position={[side * 0.33, 0.94, 0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.65, 8]} />
            <meshStandardMaterial color={steel} metalness={0.65} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.327, 0]}>
            <cylinderGeometry args={[0.024, 0.024, 0.006, 8]} />
            <meshStandardMaterial color={rubber} roughness={0.95} />
          </mesh>
        </group>
      </group>
    ))}
    <group name="semi-cab">
      <mesh castShadow position={[0, 0.69, 0.335]}>
        <boxGeometry args={[0.57, 0.62, 0.39]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 1.025, 0.335]}>
        <boxGeometry args={[0.62, 0.07, 0.45]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.875, 0.536]}>
        <boxGeometry args={[0.48, 0.19, 0.02]} />
        <meshStandardMaterial color={glass} metalness={0.3} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.875, 0.55]}>
        <boxGeometry args={[0.025, 0.2, 0.02]} />
        <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.291, 0.875, 0.36]}>
            <boxGeometry args={[0.02, 0.19, 0.25]} />
            <meshStandardMaterial color={glass} metalness={0.3} roughness={0.25} />
          </mesh>
          <mesh position={[side * 0.297, 0.7, 0.265]}>
            <boxGeometry args={[0.025, 0.025, 0.09]} />
            <meshStandardMaterial color={steel} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[side * 0.355, 0.84, 0.49]}>
            <boxGeometry args={[0.12, 0.13, 0.055]} />
            <meshStandardMaterial color={steel} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {[-0.2, 0, 0.2].map((x) => (
        <mesh key={x} position={[x, 1.045, 0.56]}>
          <boxGeometry args={[0.055, 0.035, 0.025]} />
          <meshStandardMaterial color="#ffd077" emissive="#efa533" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
    <group name="semi-hood" position={[0, 0.585, 0.665]}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.32, 0.27]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.144]}>
        <boxGeometry args={[0.32, 0.28, 0.025]} />
        <meshStandardMaterial color={steel} metalness={0.55} roughness={0.4} />
      </mesh>
      {[-0.105, -0.035, 0.035, 0.105].map((x) => (
        <mesh key={x} position={[x, 0, 0.161]}>
          <boxGeometry args={[0.035, 0.22, 0.012]} />
          <meshStandardMaterial color={rubber} roughness={0.8} />
        </mesh>
      ))}
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, -0.075, 0.143]}>
          <boxGeometry args={[0.1, 0.075, 0.03]} />
          <meshStandardMaterial color="#fff1c2" emissive="#e4c279" emissiveIntensity={0.2} roughness={0.35} />
        </mesh>
      ))}
    </group>
    <group name="semi-trailer" position={[0, 0, -0.405]}>
      <mesh castShadow position={[0, 0.815, 0]}>
        <boxGeometry args={[0.66, 0.75, 0.83]} />
        <meshStandardMaterial color={trailer} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <boxGeometry args={[0.69, 0.035, 0.85]} />
        <meshStandardMaterial color={steel} metalness={0.25} roughness={0.6} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[-0.3, -0.15, 0, 0.15, 0.3].map((z) => (
            <mesh key={z} position={[side * 0.336, 0.825, z]}>
              <boxGeometry args={[0.018, 0.64, 0.022]} />
              <meshStandardMaterial color={steel} metalness={0.25} roughness={0.65} />
            </mesh>
          ))}
          <mesh position={[side * 0.35, 0.69, 0]}>
            <boxGeometry args={[0.025, 0.16, 0.81]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          <mesh position={[side * 0.17, 0.81, -0.421]}>
            <boxGeometry args={[0.295, 0.66, 0.025]} />
            <meshStandardMaterial color={trailer} roughness={0.75} />
          </mesh>
          <mesh position={[side * 0.08, 0.81, -0.441]}>
            <boxGeometry args={[0.022, 0.58, 0.02]} />
            <meshStandardMaterial color={steel} metalness={0.5} roughness={0.45} />
          </mesh>
          <mesh position={[side * 0.25, 0.46, -0.441]}>
            <boxGeometry args={[0.08, 0.065, 0.025]} />
            <meshStandardMaterial color="#ed5c50" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
    {[-0.86, 0.84].map((z) => (
      <mesh castShadow key={z} position={[0, 0.39, z]}>
        <boxGeometry args={[0.66, 0.08, 0.06]} />
        <meshStandardMaterial color={steel} metalness={0.5} roughness={0.45} />
      </mesh>
    ))}
  </group>
);
