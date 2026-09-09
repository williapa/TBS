const sandstone = "#d8c49d";
const timber = "#67472e";
const ivory = "#fff0cb";
const hide = "#edba59";

/** An open habitat keeps the animal silhouette visible above the low enclosure. */
export const ZooModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="zoo-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.09, 0]}>
      <boxGeometry args={[1.22, 0.16, 1.12]} />
      <meshStandardMaterial color={sandstone} roughness={0.95} />
    </mesh>
    <mesh receiveShadow position={[0, 0.18, -0.02]}>
      <boxGeometry args={[1.1, 0.04, 0.98]} />
      <meshStandardMaterial color="#8a9e51" roughness={1} />
    </mesh>
    <mesh position={[0, 0.207, 0.32]}>
      <boxGeometry args={[0.35, 0.02, 0.5]} />
      <meshStandardMaterial color={sandstone} roughness={1} />
    </mesh>
    {[-0.55, 0.55].map((x) => (
      <group key={x} position={[x, 0, 0]}>
        {[-0.47, 0, 0.47].map((z) => (
          <mesh castShadow key={z} position={[0, 0.39, z]}>
            <boxGeometry args={[0.065, 0.42, 0.065]} />
            <meshStandardMaterial color={timber} roughness={0.9} />
          </mesh>
        ))}
        {[0.32, 0.49].map((y) => (
          <mesh castShadow key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.045, 0.05, 0.98]} />
            <meshStandardMaterial color={ivory} roughness={0.9} />
          </mesh>
        ))}
        <mesh castShadow position={[-Math.sign(x) * 0.1, 0.4, 0.47]}>
          <boxGeometry args={[0.2, 0.29, 0.08]} />
          <meshStandardMaterial color={sandstone} roughness={0.9} />
        </mesh>
      </group>
    ))}
    {[0.32, 0.49].map((y) => (
      <mesh castShadow key={y} position={[0, y, -0.47]}>
        <boxGeometry args={[1.1, 0.05, 0.045]} />
        <meshStandardMaterial color={ivory} roughness={0.9} />
      </mesh>
    ))}
    <group name="zoo-entrance" position={[0, 0, 0.49]}>
      {[-0.32, 0.32].map((x) => (
        <mesh castShadow key={x} position={[x, 0.54, 0]}>
          <boxGeometry args={[0.1, 0.76, 0.13]} />
          <meshStandardMaterial color={timber} roughness={0.9} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.87, 0]}>
        <boxGeometry args={[0.86, 0.25, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      {/* Solid geometry lettering needs no font, texture, or asynchronous asset load. */}
      <group position={[-0.22, 0.87, 0.08]}>
        {[-0.065, 0.065].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.13, 0.028, 0.025]} />
            <meshStandardMaterial color={ivory} />
          </mesh>
        ))}
        <mesh rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.028, 0.17, 0.025]} />
          <meshStandardMaterial color={ivory} />
        </mesh>
      </group>
      {[0, 0.21].map((x) => (
        <mesh key={x} position={[x, 0.87, 0.08]}>
          <torusGeometry args={[0.063, 0.016, 4, 12]} />
          <meshStandardMaterial color={ivory} />
        </mesh>
      ))}
    </group>
    <group name="zoo-shelter" position={[-0.29, 0, -0.27]}>
      <mesh castShadow position={[0, 0.39, 0]}>
        <boxGeometry args={[0.38, 0.4, 0.34]} />
        <meshStandardMaterial color={sandstone} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.36, 0.177]}>
        <boxGeometry args={[0.21, 0.29, 0.015]} />
        <meshStandardMaterial color="#302c24" roughness={1} />
      </mesh>
      <mesh castShadow position={[0, 0.65, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.36, 0.22, 4]} />
        <meshStandardMaterial color={color} roughness={0.85} flatShading />
      </mesh>
    </group>
    <group name="zoo-giraffe" position={[0.22, 0, -0.12]}>
      {[-0.09, 0.09].flatMap((x) => [-0.13, 0.13].map((z) => (
        <mesh castShadow key={`${x}:${z}`} position={[x, 0.4, z]}>
          <cylinderGeometry args={[0.027, 0.022, 0.4, 5]} />
          <meshStandardMaterial color={hide} roughness={0.9} />
        </mesh>
      )))}
      <mesh castShadow position={[0, 0.61, 0]} scale={[0.12, 0.16, 0.23]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={hide} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.87, 0.13]} rotation={[0.16, 0, 0]}>
        <cylinderGeometry args={[0.048, 0.078, 0.55, 6]} />
        <meshStandardMaterial color={hide} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 1.15, 0.2]} scale={[0.078, 0.08, 0.14]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={hide} roughness={0.9} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh castShadow position={[side * 0.09, 1.19, 0.14]} rotation={[0, 0, side * 0.6]}>
            <coneGeometry args={[0.035, 0.09, 4]} />
            <meshStandardMaterial color={hide} roughness={0.9} />
          </mesh>
          <mesh castShadow position={[side * 0.035, 1.25, 0.17]}>
            <cylinderGeometry args={[0.018, 0.012, 0.1, 5]} />
            <meshStandardMaterial color={timber} roughness={0.9} />
          </mesh>
          <mesh position={[side * 0.066, 1.165, 0.25]}>
            <sphereGeometry args={[0.014, 6, 4]} />
            <meshStandardMaterial color="#252b26" />
          </mesh>
          {[0.74, 0.88, 1.02].map((y) => (
            <mesh key={y} position={[side * (0.065 - (y - 0.74) * 0.06), y, 0.13]} scale={[0.009, 0.034, 0.034]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={timber} roughness={0.9} />
            </mesh>
          ))}
          {[-0.1, 0.07].map((z) => (
            <mesh key={z} position={[side * 0.113, 0.63, z]} scale={[0.012, 0.05, 0.044]}>
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={timber} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh castShadow position={[0, 0.53, -0.23]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.025, 0.24, 5]} />
        <meshStandardMaterial color={timber} roughness={0.9} />
      </mesh>
    </group>
    <group name="zoo-acacia" position={[-0.4, 0, 0.04]}>
      <mesh castShadow position={[0, 0.6, 0]} rotation={[0, 0, -0.12]}>
        <cylinderGeometry args={[0.025, 0.045, 0.8, 6]} />
        <meshStandardMaterial color={timber} roughness={1} />
      </mesh>
      <mesh castShadow position={[0.04, 1.01, 0]} scale={[0.26, 0.13, 0.22]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#3e7649" roughness={1} flatShading />
      </mesh>
    </group>
  </group>
);
