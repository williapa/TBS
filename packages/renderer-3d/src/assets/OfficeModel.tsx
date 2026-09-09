const concrete = "#e2e5df";
const frame = "#34485a";
const glass = "#65b8d3";

/** Stepped glass volumes and repeated floor bands distinguish the office at board scale. */
export const OfficeModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="office-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[1.18, 0.12, 1.04]} />
      <meshStandardMaterial color={concrete} roughness={0.9} />
    </mesh>
    {[
      { x: -0.23, width: 0.62, height: 1.2, floors: 5 },
      { x: 0.32, width: 0.4, height: 0.72, floors: 3 },
    ].map(({ x, width, height, floors }) => (
      <group key={x} position={[x, 0.12, -0.08]}>
        <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, 0.72]} />
          <meshStandardMaterial color={glass} roughness={0.3} metalness={0.2} />
        </mesh>
        {Array.from({ length: floors + 1 }, (_, floor) => (
          <mesh key={floor} position={[0, floor * 0.24, 0]}>
            <boxGeometry args={[width + 0.025, 0.035, 0.745]} />
            <meshStandardMaterial color={concrete} roughness={0.7} />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <group key={side}>
            {[-1, 0, 1].map((column) => (
              <mesh key={column} position={[column * (width / 2 - 0.02), height / 2, side * 0.366]}>
                <boxGeometry args={[0.025, height, 0.018]} />
                <meshStandardMaterial color={frame} roughness={0.65} />
              </mesh>
            ))}
            {[-0.2, 0, 0.2].map((z) => (
              <mesh key={z} position={[side * (width / 2 + 0.006), height / 2, z]}>
                <boxGeometry args={[0.018, height, 0.025]} />
                <meshStandardMaterial color={frame} roughness={0.65} />
              </mesh>
            ))}
          </group>
        ))}
        <mesh castShadow position={[0, height + 0.035, 0]}>
          <boxGeometry args={[width + 0.065, 0.07, 0.79]} />
          <meshStandardMaterial color={color} roughness={0.65} />
        </mesh>
        <mesh position={[0, height + 0.074, 0]}>
          <boxGeometry args={[width - 0.06, 0.012, 0.65]} />
          <meshStandardMaterial color={frame} roughness={0.9} />
        </mesh>
      </group>
    ))}
    <group name="office-rooftop-equipment" position={[-0.23, 1.45, -0.13]}>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.12, 0.3]} />
        <meshStandardMaterial color={concrete} roughness={0.8} />
      </mesh>
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} position={[x, 0.063, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.052, 8]} />
          <meshStandardMaterial color={frame} roughness={0.8} />
        </mesh>
      ))}
    </group>
    <group name="office-entrance" position={[-0.23, 0, 0.3]}>
      <mesh position={[0, 0.27, 0]}>
        <boxGeometry args={[0.27, 0.3, 0.035]} />
        <meshStandardMaterial color={frame} roughness={0.65} />
      </mesh>
      {[-0.063, 0.063].map((x) => (
        <mesh key={x} position={[x, 0.27, 0.022]}>
          <boxGeometry args={[0.105, 0.26, 0.018]} />
          <meshStandardMaterial color="#b5e2e9" roughness={0.3} metalness={0.15} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.45, 0.095]}>
        <boxGeometry args={[0.5, 0.065, 0.31]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      {[-0.21, 0.21].map((x) => (
        <mesh key={x} castShadow position={[x, 0.27, 0.21]}>
          <boxGeometry args={[0.025, 0.3, 0.025]} />
          <meshStandardMaterial color={frame} roughness={0.7} />
        </mesh>
      ))}
      <mesh receiveShadow position={[0, 0.075, 0.2]}>
        <boxGeometry args={[0.48, 0.15, 0.22]} />
        <meshStandardMaterial color={concrete} roughness={0.9} />
      </mesh>
    </group>
    <group name="office-planter" position={[0.34, 0, 0.38]}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.19]} />
        <meshStandardMaterial color={frame} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0, 0.28, 0]}>
        <boxGeometry args={[0.25, 0.15, 0.16]} />
        <meshStandardMaterial color="#4f794b" roughness={1} />
      </mesh>
    </group>
  </group>
);
