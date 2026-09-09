import { CatmullRomCurve3, Vector3 } from "three";

const fur = "#d6a04b";
const mane = "#764025";
const maneTips = "#9b5730";
const cream = "#f3d69c";
const dark = "#30251e";
const gold = "#edc56b";
const tail = new CatmullRomCurve3([
  new Vector3(0, 0.49, -0.37),
  new Vector3(0.12, 0.35, -0.63),
  new Vector3(0.35, 0.4, -0.69),
  new Vector3(0.43, 0.6, -0.6),
]);

/** An oversized mane and compact curled tail keep the lion readable within one hex. */
export const LionModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="lion-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.5, -0.12]} scale={[0.25, 0.25, 0.43]}>
      <sphereGeometry args={[1, 10, 6]} />
      <meshStandardMaterial color={fur} roughness={0.9} flatShading />
    </mesh>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.32, 0.22].map((z) => (
          <group key={z} name="lion-leg" position={[side * 0.19, 0, z]}>
            <mesh castShadow position={[0, 0.3, -0.025]} rotation={[-0.1, 0, side * 0.07]}>
              <cylinderGeometry args={[0.105, 0.07, 0.42, 7]} />
              <meshStandardMaterial color={fur} roughness={0.9} flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.09, 0.045]} scale={[0.115, 0.09, 0.16]}>
              <sphereGeometry args={[1, 8, 5]} />
              <meshStandardMaterial color={cream} roughness={0.95} flatShading />
            </mesh>
          </group>
        ))}
        <group name="lion-saddlecloth" position={[side * 0.245, 0.49, -0.2]} rotation={[0, 0, side * 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.025, 0.28, 0.29]} />
            <meshStandardMaterial color={gold} roughness={0.85} />
          </mesh>
          <mesh position={[side * 0.016, 0.015, 0]}>
            <boxGeometry args={[0.018, 0.25, 0.24]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
        </group>
      </group>
    ))}
    <mesh castShadow position={[0, 0.717, -0.2]} scale={[0.255, 0.045, 0.155]}>
      <sphereGeometry args={[1, 8, 4]} />
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
    <group name="lion-tail">
      <mesh castShadow>
        <tubeGeometry args={[tail, 10, 0.035, 5, false]} />
        <meshStandardMaterial color={fur} roughness={0.9} flatShading />
      </mesh>
      <mesh castShadow position={[0.43, 0.62, -0.59]} rotation={[0.35, 0, -0.25]} scale={[0.075, 0.12, 0.075]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={mane} roughness={0.95} flatShading />
      </mesh>
    </group>
    <group name="lion-mane" position={[0, 0.74, 0.24]}>
      <mesh castShadow scale={[0.36, 0.38, 0.29]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={mane} roughness={1} flatShading />
      </mesh>
      {Array.from({ length: 9 }, (_, index) => {
        const angle = index * Math.PI * 2 / 9;
        return (
          <mesh castShadow key={index} position={[Math.sin(angle) * 0.265, Math.cos(angle) * 0.28, 0.09]} rotation={[0, 0, -angle]}>
            <coneGeometry args={[0.12, 0.22, 5]} />
            <meshStandardMaterial color={maneTips} roughness={1} flatShading />
          </mesh>
        );
      })}
    </group>
    <group name="lion-head" position={[0, 0.81, 0.46]}>
      <mesh castShadow scale={[0.215, 0.225, 0.19]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={fur} roughness={0.9} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh castShadow position={[side * 0.21, 0.19, -0.075]} scale={[0.085, 0.09, 0.045]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color={fur} roughness={0.95} flatShading />
          </mesh>
          <mesh position={[side * 0.21, 0.19, -0.035]} scale={[0.047, 0.055, 0.012]}>
            <sphereGeometry args={[1, 8, 5]} />
            <meshStandardMaterial color={mane} roughness={1} />
          </mesh>
          <mesh position={[side * 0.105, 0.045, 0.165]} rotation={[0, side * 0.3, -side * 0.12]}>
            <boxGeometry args={[0.057, 0.04, 0.025]} />
            <meshStandardMaterial color={dark} roughness={0.65} />
          </mesh>
          <mesh castShadow position={[side * 0.065, -0.07, 0.18]} scale={[0.087, 0.072, 0.09]}>
            <sphereGeometry args={[1, 8, 5]} />
            <meshStandardMaterial color={cream} roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, -0.145, 0.15]} scale={[0.11, 0.045, 0.085]}>
        <sphereGeometry args={[1, 8, 5]} />
        <meshStandardMaterial color={cream} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[0, -0.035, 0.259]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.055, 0.055, 3]} />
        <meshStandardMaterial color={dark} roughness={0.8} flatShading />
      </mesh>
    </group>
  </group>
);
