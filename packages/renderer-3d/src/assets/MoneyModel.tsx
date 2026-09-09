import { CatmullRomCurve3, Vector2, Vector3 } from "three";

const canvas = "#cda666";
const fold = "#e3c38a";
const rope = "#67432c";
const gold = "#efbc3f";
const sackProfile = ([
  [0, 0.04], [0.25, 0.04], [0.38, 0.1], [0.44, 0.25], [0.44, 0.5],
  [0.38, 0.65], [0.23, 0.78], [0.14, 0.86], [0.13, 0.9], [0, 0.9],
] as const).map(([radius, height]) => new Vector2(radius, height));

// Raised, project-authored lettering needs no font or texture download.
const dollarStroke = new CatmullRomCurve3([
  new Vector3(0.1, 0.13, 0), new Vector3(-0.05, 0.15, 0),
  new Vector3(-0.11, 0.07, 0), new Vector3(0, 0, 0),
  new Vector3(0.11, -0.07, 0), new Vector3(0.05, -0.15, 0),
  new Vector3(-0.1, -0.13, 0),
]);

export const MoneyModel = ({ orientation }: Readonly<{ orientation: number }>) => (
  <group name="money-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow>
      <latheGeometry args={[sackProfile, 16]} />
      <meshStandardMaterial color={canvas} roughness={1} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.98, 0]}>
      <cylinderGeometry args={[0.23, 0.13, 0.18, 8]} />
      <meshStandardMaterial color={canvas} roughness={1} flatShading />
    </mesh>
    {Array.from({ length: 8 }, (_, index) => (
      <group key={index} rotation={[0, index * Math.PI / 4, 0]}>
        <mesh castShadow position={[0, 0.98, 0.17]} rotation={[0.48, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.025, 0.2, 5]} />
          <meshStandardMaterial color={fold} roughness={1} flatShading />
        </mesh>
      </group>
    ))}
    {[0.86, 0.9].map((height) => (
      <mesh castShadow key={height} position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.145, 0.026, 5, 16]} />
        <meshStandardMaterial color={rope} roughness={1} />
      </mesh>
    ))}
    {[-1, 1].map((side) => (
      <group key={side}>
        <mesh castShadow position={[side * 0.085, 0.875, 0.17]} rotation={[0, 0, side * 0.35]} scale={[1, 0.55, 1]}>
          <torusGeometry args={[0.085, 0.022, 5, 12]} />
          <meshStandardMaterial color={rope} roughness={1} />
        </mesh>
        <mesh castShadow position={[side * 0.07, 0.77, 0.21]} rotation={[0.25, 0, side * 0.4]}>
          <cylinderGeometry args={[0.02, 0.025, 0.19, 5]} />
          <meshStandardMaterial color={rope} roughness={1} />
        </mesh>
      </group>
    ))}
    {[0, Math.PI].map((rotation) => (
      <group key={rotation} rotation={[0, rotation, 0]}>
        <group name="money-dollar-emblem" position={[0, 0.425, 0.435]}>
          <mesh>
            <tubeGeometry args={[dollarStroke, 24, 0.026, 6, false]} />
            <meshStandardMaterial color={rope} roughness={1} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.026, 0.41, 0.026]} />
            <meshStandardMaterial color={rope} roughness={1} />
          </mesh>
        </group>
      </group>
    ))}
    {([[0.39, 0.065, 0.31], [0.39, 0.105, 0.31], [0.18, 0.065, 0.5]] as const).map((position, index) => (
      <group name="money-coin" key={index} position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.04, 12]} />
          <meshStandardMaterial color={gold} metalness={0.65} roughness={0.3} flatShading />
        </mesh>
        <mesh position={[0, 0.023, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.095, 12]} />
          <meshStandardMaterial color="#ffe59b" metalness={0.55} roughness={0.35} />
        </mesh>
      </group>
    ))}
  </group>
);
