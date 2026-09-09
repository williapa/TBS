const concrete = "#c3c7c4";
const steel = "#394957";
const craneYellow = "#f2be45";
const timber = "#80624b";

const ShippingContainer = ({ color, position }: Readonly<{
  color: string;
  position: [number, number, number];
}>) => (
  <group position={position}>
    <mesh castShadow>
      <boxGeometry args={[0.56, 0.23, 0.27]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    {[-0.21, -0.105, 0, 0.105, 0.21].map((x) => (
      <mesh castShadow key={x} position={[x, 0, 0]}>
        <boxGeometry args={[0.018, 0.2, 0.29]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    ))}
    {[-0.07, 0.07].map((z) => (
      <mesh key={z} position={[0.284, 0, z]}>
        <boxGeometry args={[0.012, 0.19, 0.012]} />
        <meshStandardMaterial color="#dce2df" metalness={0.4} roughness={0.5} />
      </mesh>
    ))}
  </group>
);

/** Open water beneath the pilings and inside the L-shaped quay identifies a harbor. */
export const PortModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="port-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-0.51, 0, 0.51].map((x) => (
      <group key={x}>
        {[-0.4, -0.02].map((z) => (
          <mesh castShadow key={z} position={[x, 0.1, z]}>
            <cylinderGeometry args={[0.055, 0.065, 0.36, 8]} />
            <meshStandardMaterial color={timber} roughness={0.95} />
          </mesh>
        ))}
      </group>
    ))}
    {[-0.51, -0.25].map((x) => (
      <mesh castShadow key={x} position={[x, 0.1, 0.48]}>
        <cylinderGeometry args={[0.055, 0.065, 0.36, 8]} />
        <meshStandardMaterial color={timber} roughness={0.95} />
      </mesh>
    ))}
    <mesh castShadow receiveShadow position={[0, 0.29, -0.22]}>
      <boxGeometry args={[1.22, 0.12, 0.56]} />
      <meshStandardMaterial color={concrete} roughness={0.9} />
    </mesh>
    <mesh castShadow receiveShadow position={[-0.4, 0.29, 0.32]}>
      <boxGeometry args={[0.42, 0.12, 0.52]} />
      <meshStandardMaterial color={concrete} roughness={0.9} />
    </mesh>
    {[-0.42, 0, 0.42].map((x) => (
      <mesh key={x} position={[x, 0.25, 0.075]}>
        <torusGeometry args={[0.065, 0.022, 6, 10]} />
        <meshStandardMaterial color="#252e36" roughness={0.95} />
      </mesh>
    ))}
    {[-0.48, -0.28].map((x) => (
      <group key={x} position={[x, 0.35, 0.48]}>
        <mesh castShadow position={[0, 0.045, 0]}>
          <cylinderGeometry args={[0.025, 0.035, 0.09, 8]} />
          <meshStandardMaterial color={steel} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.09, 0]}>
          <boxGeometry args={[0.09, 0.025, 0.04]} />
          <meshStandardMaterial color={steel} roughness={0.7} />
        </mesh>
      </group>
    ))}
    <ShippingContainer color={color} position={[0.25, 0.465, -0.3]} />
    <ShippingContainer color="#3e8891" position={[0.22, 0.695, -0.3]} />
    <ShippingContainer color={color} position={[-0.4, 0.465, 0.23]} />
    <group name="port-crane" position={[-0.4, 0.35, -0.28]} rotation={[0, Math.PI / 5, 0]}>
      <mesh castShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[0.3, 0.08, 0.3]} />
        <meshStandardMaterial color={steel} roughness={0.7} />
      </mesh>
      {[-0.08, 0.08].map((x) => (
        <mesh castShadow key={x} position={[x, 0.44, 0]}>
          <boxGeometry args={[0.045, 0.75, 0.12]} />
          <meshStandardMaterial color={craneYellow} roughness={0.65} />
        </mesh>
      ))}
      {[0.23, 0.49, 0.75].map((y, index) => (
        <mesh castShadow key={y} position={[0, y, 0]} rotation={[0, 0, (index % 2 === 0 ? 1 : -1) * 0.55]}>
          <boxGeometry args={[0.025, 0.3, 0.055]} />
          <meshStandardMaterial color={steel} roughness={0.7} />
        </mesh>
      ))}
      <mesh castShadow position={[0.11, 0.75, 0.04]}>
        <boxGeometry args={[0.23, 0.22, 0.25]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0.11, 0.78, 0.17]}>
        <boxGeometry args={[0.18, 0.11, 0.012]} />
        <meshStandardMaterial color="#b4e5ed" metalness={0.2} roughness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 0.91, 0.36]}>
        <boxGeometry args={[0.16, 0.12, 1.15]} />
        <meshStandardMaterial color={craneYellow} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, 0.86, -0.16]}>
        <boxGeometry args={[0.25, 0.19, 0.2]} />
        <meshStandardMaterial color={steel} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.65, 0.84]}>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 6]} />
        <meshStandardMaterial color={steel} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.43, 0.84]}>
        <boxGeometry args={[0.09, 0.1, 0.08]} />
        <meshStandardMaterial color={craneYellow} roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.34, 0.84]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.045, 0.012, 6, 10, Math.PI * 1.5]} />
        <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  </group>
);
