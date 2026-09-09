import { Shape } from "three";

const brick = "#ab6550";
const concrete = "#b9beb8";
const steel = "#394b56";
const glass = "#8ad3df";
const hazard = "#edc654";

// Solid wedges give the workshop its sawtooth silhouette from every camera angle.
const roofTooth = new Shape();
roofTooth.moveTo(-0.16, 0);
roofTooth.lineTo(0.16, 0);
roofTooth.lineTo(0.16, 0.22);
roofTooth.closePath();

export const FactoryModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="factory-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[1.22, 0.12, 1]} />
      <meshStandardMaterial color={concrete} roughness={0.95} />
    </mesh>
    <mesh castShadow receiveShadow position={[0, 0.36, 0]}>
      <boxGeometry args={[1, 0.48, 0.74]} />
      <meshStandardMaterial color={brick} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0, 0.57, 0]}>
      <boxGeometry args={[1.04, 0.09, 0.78]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
    <group name="factory-sawtooth-roof">
      {[-0.34, 0, 0.34].map((x) => (
        <group key={x} position={[x, 0.615, -0.39]}>
          <mesh castShadow>
            <extrudeGeometry args={[roofTooth, { depth: 0.78, bevelEnabled: false }]} />
            <meshStandardMaterial color={steel} metalness={0.25} roughness={0.65} />
          </mesh>
          <mesh position={[0.164, 0.125, 0.39]}>
            <boxGeometry args={[0.012, 0.14, 0.68]} />
            <meshStandardMaterial color={glass} metalness={0.15} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
    <group name="factory-smokestacks">
      {[-0.33, 0.33].map((x, index) => {
        const height = index === 0 ? 1.3 : 1.13;
        return (
          <group key={x} position={[x, 0, -0.27]}>
            <mesh castShadow position={[0, (height + 0.6) / 2, 0]}>
              <cylinderGeometry args={[0.075, 0.11, height - 0.6, 10]} />
              <meshStandardMaterial color={brick} roughness={0.9} flatShading />
            </mesh>
            {[height - 0.17, height].map((y) => (
              <mesh castShadow key={y} position={[0, y, 0]}>
                <cylinderGeometry args={[0.092, 0.092, 0.065, 10]} />
                <meshStandardMaterial color={steel} metalness={0.3} roughness={0.7} />
              </mesh>
            ))}
            <mesh position={[0, height + 0.034, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.067, 10]} />
              <meshStandardMaterial color="#18232b" roughness={1} />
            </mesh>
          </group>
        );
      })}
    </group>
    <group name="factory-loading-bay" position={[0.1, 0.12, 0.38]}>
      <mesh position={[0, 0.195, 0]}>
        <boxGeometry args={[0.46, 0.39, 0.03]} />
        <meshStandardMaterial color={steel} roughness={0.8} />
      </mesh>
      {[0.09, 0.17, 0.25, 0.33].map((y) => (
        <mesh key={y} position={[0, y, 0.02]}>
          <boxGeometry args={[0.39, 0.012, 0.015]} />
          <meshStandardMaterial color={concrete} metalness={0.25} roughness={0.7} />
        </mesh>
      ))}
      {[-0.255, 0.255].map((x) => (
        <mesh castShadow key={x} position={[x, 0.2, 0.02]}>
          <boxGeometry args={[0.045, 0.4, 0.06]} />
          <meshStandardMaterial color={hazard} roughness={0.7} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.41, 0.025]}>
        <boxGeometry args={[0.58, 0.045, 0.12]} />
        <meshStandardMaterial color={hazard} roughness={0.7} />
      </mesh>
      <mesh receiveShadow position={[0, 0.012, 0.06]}>
        <boxGeometry args={[0.57, 0.024, 0.1]} />
        <meshStandardMaterial color={steel} roughness={0.9} />
      </mesh>
      {[-0.21, -0.07, 0.07, 0.21].map((x) => (
        <mesh key={x} position={[x, 0.026, 0.06]} rotation={[0, -0.4, 0]}>
          <boxGeometry args={[0.055, 0.005, 0.075]} />
          <meshStandardMaterial color={hazard} roughness={0.8} />
        </mesh>
      ))}
    </group>
    {[-1, 1].map((side) => (
      <group key={side}>
        {[-0.2, 0.12].map((z) => (
          <mesh key={z} position={[side * 0.506, 0.39, z]}>
            <boxGeometry args={[0.016, 0.16, 0.2]} />
            <meshStandardMaterial color={glass} metalness={0.15} roughness={0.3} />
          </mesh>
        ))}
        <mesh castShadow position={[side * 0.51, 0.31, -0.04]}>
          <boxGeometry args={[0.04, 0.38, 0.06]} />
          <meshStandardMaterial color={concrete} roughness={0.85} />
        </mesh>
      </group>
    ))}
  </group>
);
