const suit = "#253c62";
const charcoal = "#19232f";
const ivory = "#f1e4c9";
const skin = "#a9704c";
const amber = "#d99236";
const wood = "#643720";

/** A broad fedora and diagonal hollow-body guitar keep the musician legible at board scale. */
export const BluesMusicianModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="blues-musician-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 0.14, 0, side * -0.035]}>
        <mesh castShadow position={[0, 0.26, 0]} rotation={[0, 0, side * -0.08]}>
          <boxGeometry args={[0.17, 0.4, 0.19]} />
          <meshStandardMaterial color={suit} roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 0.065, 0.055]}>
          <boxGeometry args={[0.21, 0.13, 0.31]} />
          <meshStandardMaterial color={charcoal} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.09, 0.15]}>
          <boxGeometry args={[0.215, 0.075, 0.09]} />
          <meshStandardMaterial color={ivory} roughness={0.65} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.65, 0]}>
      <boxGeometry args={[0.45, 0.45, 0.31]} />
      <meshStandardMaterial color={suit} roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.75, 0.165]}>
      <boxGeometry args={[0.17, 0.24, 0.025]} />
      <meshStandardMaterial color={ivory} roughness={0.85} />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh castShadow key={side} position={[side * 0.105, 0.755, 0.18]} rotation={[0, 0, side * -0.32]}>
        <boxGeometry args={[0.085, 0.24, 0.035]} />
        <meshStandardMaterial color="#42608b" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[0, 0.79, 0.19]}>
      <boxGeometry args={[0.055, 0.19, 0.025]} />
      <meshStandardMaterial color={charcoal} roughness={0.8} />
    </mesh>
    <group name="musician-shoulder-strap">
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.655, side * 0.18]} rotation={[0, 0, -0.6]}>
          <boxGeometry args={[0.075, 0.51, 0.035]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0.135, 0.875, 0]}>
        <boxGeometry args={[0.09, 0.035, 0.36]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
    <mesh castShadow position={[-0.29, 0.66, 0.055]} rotation={[0.2, 0, -0.3]}>
      <cylinderGeometry args={[0.085, 0.075, 0.32, 7]} />
      <meshStandardMaterial color={suit} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[-0.24, 0.56, 0.21]} rotation={[1.1, 0, -0.7]}>
      <cylinderGeometry args={[0.075, 0.07, 0.27, 7]} />
      <meshStandardMaterial color={suit} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0.29, 0.7, 0.08]} rotation={[0.2, 0, 0.55]}>
      <cylinderGeometry args={[0.085, 0.075, 0.3, 7]} />
      <meshStandardMaterial color={suit} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0.37, 0.75, 0.22]} rotation={[0.65, 0, -0.12]}>
      <cylinderGeometry args={[0.07, 0.075, 0.27, 7]} />
      <meshStandardMaterial color={suit} roughness={0.85} flatShading />
    </mesh>
    <group name="musician-guitar" position={[-0.12, 0.53, 0.32]} rotation={[0, 0, -0.65]}>
      {[0, 0.23].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.08]}>
            <cylinderGeometry args={[y === 0 ? 0.23 : 0.17, y === 0 ? 0.23 : 0.17, 0.13, 12]} />
            <meshStandardMaterial color={wood} roughness={0.6} flatShading />
          </mesh>
          <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[y === 0 ? 0.21 : 0.15, y === 0 ? 0.21 : 0.15, 0.018, 12]} />
            <meshStandardMaterial color={amber} roughness={0.5} flatShading />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 0.52, 0.02]}>
        <boxGeometry args={[0.085, 0.43, 0.075]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.8, 0.015]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[0.13, 0.17, 0.075]} />
        <meshStandardMaterial color={amber} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.05, 0.09]}>
        <boxGeometry args={[0.13, 0.045, 0.035]} />
        <meshStandardMaterial color={ivory} roughness={0.5} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.115, 0.075, 0.083]} rotation={[0, 0, side * -0.2]}>
            <boxGeometry args={[0.028, 0.13, 0.012]} />
            <meshStandardMaterial color={wood} roughness={0.9} />
          </mesh>
          {[0.76, 0.82, 0.88].map((y) => (
            <mesh castShadow key={y} position={[side * 0.078, y, 0.015]}>
              <boxGeometry args={[0.045, 0.025, 0.055]} />
              <meshStandardMaterial color={ivory} metalness={0.35} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      {[-0.025, 0, 0.025].map((x) => (
        <mesh key={x} position={[x, 0.35, 0.085]}>
          <boxGeometry args={[0.006, 0.78, 0.006]} />
          <meshStandardMaterial color={ivory} metalness={0.35} roughness={0.5} />
        </mesh>
      ))}
    </group>
    <mesh castShadow position={[-0.13, 0.57, 0.43]} scale={[1.15, 0.7, 0.7]}>
      <sphereGeometry args={[0.085, 8, 6]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0.27, 0.99, 0.36]}>
      <sphereGeometry args={[0.075, 8, 6]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.025, 0.015]}>
      <sphereGeometry args={[0.205, 10, 7]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <group name="musician-sunglasses" position={[0, 1.065, 0.185]}>
      <mesh>
        <boxGeometry args={[0.36, 0.025, 0.05]} />
        <meshStandardMaterial color={charcoal} roughness={0.5} />
      </mesh>
      {[-0.095, 0.095].map((x) => (
        <mesh castShadow key={x} position={[x, -0.025, 0.02]}>
          <boxGeometry args={[0.145, 0.085, 0.045]} />
          <meshStandardMaterial color={charcoal} metalness={0.25} roughness={0.25} />
        </mesh>
      ))}
    </group>
    <mesh castShadow position={[0, 0.99, 0.22]}>
      <sphereGeometry args={[0.043, 6, 4]} />
      <meshStandardMaterial color={skin} roughness={0.85} flatShading />
    </mesh>
    <group name="musician-fedora" position={[0, 1.175, 0]} rotation={[0.06, 0, -0.08]}>
      <mesh castShadow scale={[1, 1, 0.85]}>
        <cylinderGeometry args={[0.33, 0.34, 0.055, 10]} />
        <meshStandardMaterial color={charcoal} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.105, -0.015]} scale={[1, 1, 0.85]}>
        <cylinderGeometry args={[0.18, 0.23, 0.19, 6]} />
        <meshStandardMaterial color={charcoal} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.055, -0.015]} scale={[1, 1, 0.85]}>
        <cylinderGeometry args={[0.224, 0.24, 0.055, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>
    </group>
  </group>
);
