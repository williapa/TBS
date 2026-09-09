import { DoubleSide, Quaternion, Shape, Vector3 } from "three";

const scales = "#286b61";
const ridge = "#17483f";
const ivory = "#f1dfac";
type Point = readonly [number, number, number];

// The scalloped membrane sits in a raised plane so the wings fit inside one hex.
const wing = new Shape();
wing.moveTo(0, 0);
wing.lineTo(0.24, 0.58);
wing.lineTo(0.62, 0.37);
wing.quadraticCurveTo(0.37, 0.37, 0.47, 0.05);
wing.quadraticCurveTo(0.22, 0.2, 0.28, -0.15);
wing.quadraticCurveTo(0.1, 0, 0, -0.2);
wing.closePath();

const Segment = ({ start, end, radius, tipRadius, color }: Readonly<{
  start: Point;
  end: Point;
  radius: number;
  tipRadius: number;
  color: string;
}>) => {
  const direction = new Vector3(...end).sub(new Vector3(...start));
  const center = new Vector3(...start).addScaledVector(direction, 0.5);
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
  return (
    <mesh castShadow position={center} quaternion={rotation}>
      <cylinderGeometry args={[tipRadius, radius, direction.length(), 6]} />
      <meshStandardMaterial color={color} roughness={0.82} flatShading />
    </mesh>
  );
};

export const DragonModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="dragon-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh castShadow position={[0, 0.47, -0.03]} scale={[0.27, 0.28, 0.4]}>
      <sphereGeometry args={[1, 10, 6]} />
      <meshStandardMaterial color={scales} roughness={0.86} flatShading />
    </mesh>
    <mesh castShadow position={[0, 0.49, 0.22]} rotation={[0.2, 0, 0]} scale={[0.19, 0.24, 0.12]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color={ivory} roughness={0.9} flatShading />
    </mesh>
    <group name="dragon-tail">
      <Segment start={[0, 0.43, -0.31]} end={[0.1, 0.3, -0.56]} radius={0.16} tipRadius={0.1} color={scales} />
      <Segment start={[0.1, 0.3, -0.56]} end={[0.29, 0.32, -0.7]} radius={0.1} tipRadius={0.06} color={scales} />
      <Segment start={[0.29, 0.32, -0.7]} end={[0.43, 0.46, -0.68]} radius={0.06} tipRadius={0} color={ridge} />
    </group>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.23, 0.2].map((z) => (
          <group key={z}>
            <Segment start={[side * 0.2, 0.44, z]} end={[side * 0.32, 0.13, z - 0.04]} radius={0.115} tipRadius={0.07} color={scales} />
            <mesh castShadow position={[side * 0.32, 0.09, z + 0.04]}>
              <boxGeometry args={[0.16, 0.13, 0.24]} />
              <meshStandardMaterial color={ridge} roughness={0.9} />
            </mesh>
            {[-0.045, 0.045].map((toe) => (
              <Segment key={toe} start={[side * 0.32 + toe, 0.08, z + 0.14]} end={[side * 0.32 + toe, 0.055, z + 0.22]} radius={0.03} tipRadius={0} color={ivory} />
            ))}
          </group>
        ))}
        <group name="dragon-wing" position={[side * 0.16, 0.64, -0.13]} rotation={[-0.4, 0, 0]} scale={[side, 1, 1]}>
          <mesh castShadow>
            <shapeGeometry args={[wing, 5]} />
            <meshStandardMaterial color={color} side={DoubleSide} roughness={0.8} />
          </mesh>
          <Segment start={[0, 0, 0]} end={[0.24, 0.58, 0]} radius={0.055} tipRadius={0.035} color={scales} />
          {([[0.62, 0.37, 0], [0.47, 0.05, 0], [0.28, -0.15, 0]] as const).map((end, index) => (
            <Segment key={index} start={[0.24, 0.58, 0]} end={end} radius={0.025} tipRadius={0.012} color={ridge} />
          ))}
          <Segment start={[0.24, 0.58, 0]} end={[0.25, 0.67, 0]} radius={0.04} tipRadius={0} color={ivory} />
        </group>
      </group>
    ))}
    <Segment start={[0, 0.54, 0.17]} end={[0, 0.85, 0.34]} radius={0.18} tipRadius={0.13} color={scales} />
    <group name="dragon-head" position={[0, 0.89, 0.36]}>
      <mesh castShadow scale={[0.2, 0.17, 0.22]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={scales} roughness={0.82} flatShading />
      </mesh>
      <mesh castShadow position={[0, -0.04, 0.2]}>
        <boxGeometry args={[0.29, 0.16, 0.26]} />
        <meshStandardMaterial color={scales} roughness={0.82} />
      </mesh>
      <mesh castShadow position={[0, -0.12, 0.19]}>
        <boxGeometry args={[0.26, 0.055, 0.25]} />
        <meshStandardMaterial color={ivory} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Segment start={[side * 0.13, 0.09, -0.07]} end={[side * 0.19, 0.31, -0.19]} radius={0.065} tipRadius={0} color={ivory} />
          <mesh position={[side * 0.17, 0.025, 0.105]} rotation={[0, side * 0.55, -side * 0.18]}>
            <boxGeometry args={[0.04, 0.065, 0.095]} />
            <meshStandardMaterial color="#ffcd55" emissive="#e89921" emissiveIntensity={0.25} />
          </mesh>
          <mesh position={[side * 0.07, 0.015, 0.332]}>
            <boxGeometry args={[0.04, 0.03, 0.012]} />
            <meshStandardMaterial color={ridge} />
          </mesh>
        </group>
      ))}
    </group>
    {[-0.27, -0.1, 0.07].map((z) => (
      <mesh castShadow key={z} position={[0, 0.76, z]} rotation={[-0.3, 0, 0]}>
        <coneGeometry args={[0.075, 0.18, 4]} />
        <meshStandardMaterial color={ivory} roughness={0.85} flatShading />
      </mesh>
    ))}
  </group>
);
