const ivory = "#f3eee1";
const navy = "#294354";
const leather = "#61422e";
const steel = "#aabac3";
const blueprint = "#237db4";
const skin = "#d9b08c";

/** A white hard hat, open wrench, and blueprints distinguish the engineer at board scale. */
export const EngineerModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="engineer-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.14, 0.19, 0]}>
          <boxGeometry args={[0.18, 0.3, 0.22]} />
          <meshStandardMaterial color={navy} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.14, 0.06, 0.07]}>
          <boxGeometry args={[0.22, 0.12, 0.34]} />
          <meshStandardMaterial color={leather} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[side * 0.31, 0.61, 0.015]} rotation={[0, 0, side * 0.25]}>
          <cylinderGeometry args={[0.085, 0.075, 0.35, 7]} />
          <meshStandardMaterial color={color} roughness={0.85} flatShading />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.56, 0]}>
      <boxGeometry args={[0.47, 0.48, 0.32]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.6, 0.17]}>
      <boxGeometry args={[0.035, 0.35, 0.025]} />
      <meshStandardMaterial color={ivory} roughness={0.8} />
    </mesh>
    <mesh castShadow position={[0, 0.37, 0]}>
      <boxGeometry args={[0.49, 0.085, 0.35]} />
      <meshStandardMaterial color={leather} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.37, 0.19]}>
      <boxGeometry args={[0.105, 0.075, 0.03]} />
      <meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh castShadow position={[0.25, 0.32, -0.045]}>
      <boxGeometry args={[0.14, 0.21, 0.23]} />
      <meshStandardMaterial color={leather} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 0.96, 0]}>
      <sphereGeometry args={[0.205, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.085, 0]}>
      <sphereGeometry args={[0.245, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={ivory} roughness={0.7} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.085, 0.035]}>
      <cylinderGeometry args={[0.285, 0.285, 0.055, 12]} />
      <meshStandardMaterial color={ivory} roughness={0.7} />
    </mesh>
    <mesh castShadow position={[0, 1.255, 0]}>
      <boxGeometry args={[0.055, 0.15, 0.27]} />
      <meshStandardMaterial color={ivory} roughness={0.7} />
    </mesh>
    <mesh position={[0, 0.99, 0.185]}>
      <boxGeometry args={[0.34, 0.095, 0.07]} />
      <meshStandardMaterial color={navy} roughness={0.6} />
    </mesh>
    {[-0.085, 0.085].map((x) => (
      <mesh key={x} position={[x, 0.99, 0.225]}>
        <boxGeometry args={[0.125, 0.06, 0.02]} />
        <meshStandardMaterial color="#a6dce7" metalness={0.2} roughness={0.3} />
      </mesh>
    ))}
    <group name="engineer-wrench" position={[0.4, 0.69, 0.16]} rotation={[0, 0, -0.16]}>
      <mesh castShadow position={[0, -0.03, 0]}>
        <boxGeometry args={[0.085, 0.58, 0.065]} />
        <meshStandardMaterial color={steel} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.29, 0]}>
        <boxGeometry args={[0.28, 0.12, 0.09]} />
        <meshStandardMaterial color={steel} metalness={0.5} roughness={0.4} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh castShadow key={side} position={[side * 0.105, 0.39, 0]} rotation={[0, 0, side * -0.2]}>
          <boxGeometry args={[0.09, 0.18, 0.09]} />
          <meshStandardMaterial color={steel} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh castShadow position={[0, -0.12, 0.015]}>
        <sphereGeometry args={[0.09, 8, 6]} />
        <meshStandardMaterial color={leather} roughness={0.9} flatShading />
      </mesh>
    </group>
    <group name="engineer-blueprints" position={[-0.36, 0.51, 0.2]} rotation={[0.1, 0, -0.2]}>
      <mesh castShadow>
        <boxGeometry args={[0.25, 0.42, 0.055]} />
        <meshStandardMaterial color={blueprint} roughness={0.9} />
      </mesh>
      {[-0.21, 0.21].map((y) => (
        <mesh castShadow key={y} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.055, 0.055, 0.3, 8]} />
          <meshStandardMaterial color={ivory} roughness={0.9} />
        </mesh>
      ))}
      {[-0.07, 0.07].map((offset) => (
        <group key={offset}>
          <mesh position={[offset, 0, 0.032]}>
            <boxGeometry args={[0.012, 0.27, 0.01]} />
            <meshStandardMaterial color={ivory} roughness={0.9} />
          </mesh>
          <mesh position={[0, offset, 0.032]}>
            <boxGeometry args={[0.2, 0.012, 0.01]} />
            <meshStandardMaterial color={ivory} roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[-0.12, -0.04, 0]}>
        <sphereGeometry args={[0.085, 8, 6]} />
        <meshStandardMaterial color={leather} roughness={0.9} flatShading />
      </mesh>
    </group>
  </group>
);
