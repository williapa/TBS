const leather = "#171922";
const lapel = "#343744";
const pink = "#ef8eb5";
const red = "#d9223e";
const white = "#fff7ee";
const mannequin = "#c5a77c";

/** Costume-led dancer with a featureless mannequin head, deliberately without a personal likeness. */
export const MichaelJacksonModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="michael-jackson-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 0.14, 0, side * -0.075]} rotation={[0, side * -0.16, 0]}>
        <mesh castShadow position={[0, 0.3, 0]} rotation={[0, 0, side * -0.12]}>
          <boxGeometry args={[0.16, 0.43, 0.18]} />
          <meshStandardMaterial color={leather} roughness={0.3} />
        </mesh>
        <mesh castShadow position={[side * 0.025, 0.075, 0.075]}>
          <boxGeometry args={[0.2, 0.13, 0.34]} />
          <meshStandardMaterial color={white} roughness={0.4} />
        </mesh>
        <mesh position={[side * 0.025, 0.022, 0.075]}>
          <boxGeometry args={[0.205, 0.025, 0.345]} />
          <meshStandardMaterial color={lapel} roughness={0.7} />
        </mesh>
      </group>
    ))}
    <group position={[0, 0.51, 0]} rotation={[0, 0, -0.09]}>
      <mesh castShadow position={[0, 0.2, 0]}>
        <boxGeometry args={[0.43, 0.44, 0.29]} />
        <meshStandardMaterial color={leather} roughness={0.28} />
      </mesh>
      <mesh name="pink-shirt" position={[0, 0.24, 0.155]}>
        <boxGeometry args={[0.21, 0.34, 0.035]} />
        <meshStandardMaterial color={pink} roughness={0.8} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.14, 0.245, 0.18]} rotation={[0, 0, side * -0.23]}>
            <boxGeometry args={[0.105, 0.32, 0.04]} />
            <meshStandardMaterial color={lapel} roughness={0.24} />
          </mesh>
          <mesh position={[side * 0.065, 0.385, 0.185]} rotation={[0, 0, side * 0.45]}>
            <boxGeometry args={[0.085, 0.075, 0.025]} />
            <meshStandardMaterial color={pink} roughness={0.8} />
          </mesh>
          <mesh name="team-shoulder-tab" position={[side * 0.185, 0.427, 0]}>
            <boxGeometry args={[0.09, 0.025, 0.3]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <group name="red-bow-tie" position={[0, 0.365, 0.225]}>
        {[-1, 1].map((side) => (
          <mesh castShadow key={side} position={[side * 0.07, 0, 0]} rotation={[0, 0, side * Math.PI / 2]}>
            <coneGeometry args={[0.072, 0.12, 4]} />
            <meshStandardMaterial color={red} roughness={0.5} flatShading />
          </mesh>
        ))}
        <mesh castShadow>
          <boxGeometry args={[0.055, 0.065, 0.06]} />
          <meshStandardMaterial color={red} roughness={0.5} />
        </mesh>
      </group>
      <mesh position={[0, 0.015, 0.155]}>
        <boxGeometry args={[0.085, 0.055, 0.035]} />
        <meshStandardMaterial color="#b9beca" metalness={0.7} roughness={0.3} />
      </mesh>
      <group name="extended-arm" position={[-0.24, 0.34, 0]} rotation={[0, 0, -0.95]}>
        <mesh castShadow position={[0, -0.19, 0]}>
          <cylinderGeometry args={[0.08, 0.065, 0.39, 7]} />
          <meshStandardMaterial color={leather} roughness={0.28} flatShading />
        </mesh>
        <mesh position={[0, -0.39, 0]}>
          <cylinderGeometry args={[0.067, 0.067, 0.04, 7]} />
          <meshStandardMaterial color={pink} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, -0.46, 0]} scale={[0.8, 1.2, 0.7]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color={mannequin} roughness={0.8} flatShading />
        </mesh>
      </group>
      <group name="bent-arm" position={[0.24, 0.33, 0]} rotation={[0, 0, 0.42]}>
        <mesh castShadow position={[0, -0.115, 0]}>
          <cylinderGeometry args={[0.08, 0.07, 0.25, 7]} />
          <meshStandardMaterial color={leather} roughness={0.28} flatShading />
        </mesh>
        <group position={[0, -0.24, 0]} rotation={[-1.25, 0, -0.5]}>
          <mesh castShadow position={[0, -0.1, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.22, 7]} />
            <meshStandardMaterial color={leather} roughness={0.28} flatShading />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.062, 0.062, 0.04, 7]} />
            <meshStandardMaterial color={pink} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.28, 0]}>
            <sphereGeometry args={[0.075, 8, 6]} />
            <meshStandardMaterial color={mannequin} roughness={0.8} flatShading />
          </mesh>
        </group>
      </group>
      <mesh castShadow position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.12, 8]} />
        <meshStandardMaterial color={mannequin} roughness={0.8} flatShading />
      </mesh>
      <mesh name="featureless-mannequin-head" castShadow position={[0, 0.635, 0]} scale={[0.9, 1.08, 0.9]}>
        <icosahedronGeometry args={[0.19, 1]} />
        <meshStandardMaterial color={mannequin} roughness={0.8} flatShading />
      </mesh>
    </group>
  </group>
);
