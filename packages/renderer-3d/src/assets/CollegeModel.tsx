import { Shape } from "three";

const brick = "#a75c48";
const stone = "#eadfc7";
const slate = "#344359";
const glass = "#83c9dc";
const gold = "#edc469";

const gable = new Shape();
gable.moveTo(-0.21, 0);
gable.lineTo(0.21, 0);
gable.lineTo(0, 0.2);
gable.closePath();

/** A mortarboard-topped clock tower makes the academic hall readable at board scale. */
export const CollegeModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="college-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    <mesh receiveShadow position={[0, 0.06, 0]}>
      <boxGeometry args={[1.2, 0.12, 1]} />
      <meshStandardMaterial color={stone} roughness={0.9} />
    </mesh>
    {[-0.38, 0.38].map((x) => (
      <group key={x} position={[x, 0, -0.06]}>
        <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
          <boxGeometry args={[0.36, 0.56, 0.76]} />
          <meshStandardMaterial color={brick} roughness={0.9} />
        </mesh>
        {[0.18, 0.43, 0.68].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.39, 0.035, 0.79]} />
            <meshStandardMaterial color={stone} roughness={0.85} />
          </mesh>
        ))}
        <mesh castShadow position={[0, 0.7, -0.42]}>
          <extrudeGeometry args={[gable, { depth: 0.84, bevelEnabled: false }]} />
          <meshStandardMaterial color={slate} roughness={0.8} />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[0, 0, side * 0.386]}>
            {[0.3, 0.55].map((y) => (
              <mesh key={y} position={[0, y, 0]}>
                <boxGeometry args={[0.13, 0.16, 0.016]} />
                <meshStandardMaterial color={glass} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
        {[-0.23, 0, 0.23].map((z) => (
          <group key={z} position={[Math.sign(x) * 0.186, 0, z]}>
            {[0.3, 0.55].map((y) => (
              <mesh key={y} position={[0, y, 0]}>
                <boxGeometry args={[0.016, 0.16, 0.1]} />
                <meshStandardMaterial color={glass} roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    ))}
    <group name="college-clock-tower">
      <mesh castShadow receiveShadow position={[0, 0.65, 0.08]}>
        <boxGeometry args={[0.38, 1.06, 0.48]} />
        <meshStandardMaterial color={brick} roughness={0.9} />
      </mesh>
      {[0.19, 0.77, 1.18].map((y) => (
        <mesh castShadow key={y} position={[0, y, 0.08]}>
          <boxGeometry args={[0.43, 0.055, 0.53]} />
          <meshStandardMaterial color={stone} roughness={0.85} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, 0.08 + side * 0.246]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
          <mesh position={[0, 0.36, 0]}>
            <boxGeometry args={[0.18, 0.32, 0.018]} />
            <meshStandardMaterial color={slate} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.65, 0.006]}>
            <boxGeometry args={[0.23, 0.13, 0.025]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
          <group name="college-clock" position={[0, 0.97, 0.01]}>
            <mesh>
              <circleGeometry args={[0.145, 16]} />
              <meshStandardMaterial color={gold} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.004]}>
              <circleGeometry args={[0.12, 16]} />
              <meshStandardMaterial color={stone} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.038, 0.01]}>
              <boxGeometry args={[0.018, 0.085, 0.012]} />
              <meshStandardMaterial color={slate} />
            </mesh>
            <mesh position={[0.029, 0, 0.01]} rotation={[0, 0, -0.3]}>
              <boxGeometry args={[0.075, 0.018, 0.012]} />
              <meshStandardMaterial color={slate} />
            </mesh>
          </group>
        </group>
      ))}
      <group name="college-mortarboard" position={[0, 0, 0.08]}>
        <mesh castShadow position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.21, 0.19, 0.12, 12]} />
          <meshStandardMaterial color={slate} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 1.33, 0]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[0.58, 0.055, 0.58]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
        <mesh position={[0.18, 1.363, 0]}>
          <boxGeometry args={[0.38, 0.018, 0.018]} />
          <meshStandardMaterial color={gold} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0.37, 1.27, 0]}>
          <cylinderGeometry args={[0.012, 0.035, 0.18, 6]} />
          <meshStandardMaterial color={gold} roughness={0.6} />
        </mesh>
      </group>
    </group>
    {[0, 1].map((step) => (
      <mesh receiveShadow key={step} position={[0, 0.045 + step * 0.04, 0.51 - step * 0.09]}>
        <boxGeometry args={[0.44, 0.09 + step * 0.08, 0.18]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
    ))}
  </group>
);
