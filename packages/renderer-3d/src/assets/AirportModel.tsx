const concrete = "#c9cec9";
const ivory = "#edf0e6";
const glass = "#78c9dd";
const asphalt = "#34414c";

/** A low terminal beside a marked runway keeps the control tower silhouette legible. */
export const AirportModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="airport-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[1.24, 0.08, 0.94]} />
      <meshStandardMaterial color={concrete} roughness={0.9} />
    </mesh>
    <group name="airport-runway" position={[0, 0.11, 0.29]}>
      <mesh receiveShadow>
        <boxGeometry args={[1.22, 0.02, 0.3]} />
        <meshStandardMaterial color={asphalt} roughness={0.95} />
      </mesh>
      {[-0.38, -0.19, 0, 0.19, 0.38].map((x) => (
        <mesh key={x} position={[x, 0.014, 0]}>
          <boxGeometry args={[0.1, 0.008, 0.022]} />
          <meshStandardMaterial color={ivory} roughness={0.85} />
        </mesh>
      ))}
      {[-0.53, 0.53].map((x) => (
        <group key={x} position={[x, 0.014, 0]}>
          {[-0.09, -0.03, 0.03, 0.09].map((z) => (
            <mesh key={z} position={[0, 0, z]}>
              <boxGeometry args={[0.075, 0.008, 0.025]} />
              <meshStandardMaterial color={ivory} roughness={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
    <group name="airport-terminal" position={[0.16, 0.1, -0.22]}>
      <mesh castShadow receiveShadow position={[0, 0.17, 0]}>
        <boxGeometry args={[0.72, 0.34, 0.38]} />
        <meshStandardMaterial color={ivory} roughness={0.8} />
      </mesh>
      {[-0.195, 0.195].map((z) => (
        <mesh key={z} position={[0, 0.21, z]}>
          <boxGeometry args={[0.6, 0.14, 0.012]} />
          <meshStandardMaterial color={glass} metalness={0.2} roughness={0.3} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.37, 0]}>
        <boxGeometry args={[0.8, 0.06, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      {[-0.21, 0, 0.21].map((x) => (
        <mesh castShadow key={x} position={[x, 0.19, 0.205]}>
          <boxGeometry args={[0.025, 0.3, 0.035]} />
          <meshStandardMaterial color={ivory} roughness={0.8} />
        </mesh>
      ))}
    </group>
    <group name="airport-control-tower" position={[-0.4, 0.1, -0.22]}>
      <mesh castShadow position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 0.78, 8]} />
        <meshStandardMaterial color={ivory} roughness={0.8} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.21, 0.12, 0.12, 8]} />
        <meshStandardMaterial color={color} roughness={0.65} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.86, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.16, 8]} />
        <meshStandardMaterial color={glass} metalness={0.25} roughness={0.25} flatShading />
      </mesh>
      {[0, 1, 2, 3].map((corner) => (
        <mesh key={corner} position={[Math.cos(corner * Math.PI / 2) * 0.19, 0.86, Math.sin(corner * Math.PI / 2) * 0.19]}>
          <boxGeometry args={[0.022, 0.18, 0.022]} />
          <meshStandardMaterial color={asphalt} roughness={0.7} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.97, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 8]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.07, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.15, 6]} />
        <meshStandardMaterial color={asphalt} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <sphereGeometry args={[0.027, 8, 6]} />
        <meshStandardMaterial color="#ec6854" emissive="#ec6854" emissiveIntensity={0.35} />
      </mesh>
    </group>
    <group name="airport-parked-plane" position={[0.19, 0.21, 0.28]}>
      <mesh castShadow scale={[0.27, 0.05, 0.05]}>
        <sphereGeometry args={[1, 12, 6]} />
        <meshStandardMaterial color={ivory} roughness={0.6} flatShading />
      </mesh>
      <mesh castShadow position={[-0.025, 0.005, 0]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.09, 0.025, 0.38]} />
        <meshStandardMaterial color={ivory} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[-0.19, 0.025, 0]}>
        <boxGeometry args={[0.065, 0.02, 0.17]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[-0.2, 0.07, 0]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.07, 0.12, 0.018]} />
        <meshStandardMaterial color={color} roughness={0.65} />
      </mesh>
      <mesh position={[0.12, 0.037, 0]} scale={[0.06, 0.026, 0.035]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={glass} metalness={0.2} roughness={0.3} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, -0.057, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.09, 8]} />
          <meshStandardMaterial color={asphalt} roughness={0.9} />
        </mesh>
      ))}
    </group>
  </group>
);
