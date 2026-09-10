const ivory = "#fff0cf";
const charcoal = "#26303c";
const skin = "#bc825c";

/** The mortarboard and basketball combine academic and athletic silhouettes. */
export const StudentAthleteModel = ({ color, orientation }: Readonly<{
  color: string;
  orientation: number;
}>) => (
  <group name="student-athlete-model" rotation={[0, orientation * Math.PI / 3, 0]}>
    {[-1, 1].map((side) => (
      <group key={side} position={[side * 0.14, 0, side * 0.035]}>
        <mesh castShadow position={[0, 0.09, 0.07]}>
          <boxGeometry args={[0.23, 0.15, 0.35]} />
          <meshStandardMaterial color={ivory} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.085, 0.25]}>
          <boxGeometry args={[0.235, 0.055, 0.015]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <mesh castShadow position={[0, 0.25, 0]}>
          <cylinderGeometry args={[0.08, 0.085, 0.22, 8]} />
          <meshStandardMaterial color={ivory} roughness={0.95} />
        </mesh>
        <mesh castShadow position={[0, 0.39, 0]}>
          <cylinderGeometry args={[0.085, 0.08, 0.15, 8]} />
          <meshStandardMaterial color={skin} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.23, 0.22, 0.28]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.405, 0.15]}>
          <boxGeometry args={[0.235, 0.04, 0.025]} />
          <meshStandardMaterial color={ivory} />
        </mesh>
      </group>
    ))}
    <mesh castShadow position={[0, 0.75, 0]}>
      <boxGeometry args={[0.46, 0.38, 0.31]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.585, 0]}>
      <boxGeometry args={[0.47, 0.045, 0.32]} />
      <meshStandardMaterial color={ivory} />
    </mesh>
    <mesh position={[0, 0.945, 0]}>
      <cylinderGeometry args={[0.115, 0.14, 0.055, 10]} />
      <meshStandardMaterial color={ivory} />
    </mesh>
    {/* A raised number 11 reads from both sides without fonts or textures. */}
    {[-1, 1].map((face) => (
      <group key={face} name="jersey-number" position={[0, 0.77, face * 0.163]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.065, 0, 0]}>
            <boxGeometry args={[0.045, 0.17, 0.015]} />
            <meshStandardMaterial color={ivory} />
          </mesh>
        ))}
      </group>
    ))}
    <mesh castShadow position={[-0.3, 0.73, 0]} rotation={[0, 0, -0.2]}>
      <capsuleGeometry args={[0.085, 0.22, 4, 8]} />
      <meshStandardMaterial color={skin} roughness={0.9} />
    </mesh>
    <mesh castShadow position={[0.3, 0.77, 0]} rotation={[0, 0, 0.45]}>
      <capsuleGeometry args={[0.085, 0.19, 4, 8]} />
      <meshStandardMaterial color={skin} roughness={0.9} />
    </mesh>
    <group name="basketball" position={[0.4, 0.61, 0.14]} rotation={[0.2, 0.15, -0.3]}>
      <mesh castShadow>
        <sphereGeometry args={[0.205, 12, 10]} />
        <meshStandardMaterial color="#e98a32" roughness={0.95} flatShading />
      </mesh>
      {[0, Math.PI / 2].map((angle) => (
        <mesh key={angle} rotation={[0, angle, 0]}>
          <torusGeometry args={[0.204, 0.009, 4, 24]} />
          <meshStandardMaterial color={charcoal} roughness={1} />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.204, 0.009, 4, 24]} />
        <meshStandardMaterial color={charcoal} roughness={1} />
      </mesh>
    </group>
    <mesh castShadow position={[0.42, 0.48, 0.23]}>
      <sphereGeometry args={[0.085, 8, 6]} />
      <meshStandardMaterial color={skin} roughness={0.9} flatShading />
    </mesh>
    <mesh castShadow position={[0, 1.1, 0]}>
      <sphereGeometry args={[0.205, 10, 8]} />
      <meshStandardMaterial color={skin} roughness={0.9} flatShading />
    </mesh>
    {[-1, 1].map((side) => (
      <mesh key={side} position={[side * 0.073, 1.12, 0.185]}>
        <boxGeometry args={[0.035, 0.04, 0.02]} />
        <meshStandardMaterial color={charcoal} />
      </mesh>
    ))}
    <group name="graduation-cap">
      <mesh castShadow position={[0, 1.255, 0]}>
        <cylinderGeometry args={[0.205, 0.205, 0.11, 10]} />
        <meshStandardMaterial color={charcoal} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.32, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.47, 0.055, 0.47]} />
        <meshStandardMaterial color={charcoal} roughness={0.9} />
      </mesh>
      <mesh position={[-0.145, 1.355, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.3, 6]} />
        <meshStandardMaterial color="#edc34f" />
      </mesh>
      <mesh castShadow position={[-0.29, 1.25, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.21, 6]} />
        <meshStandardMaterial color="#edc34f" />
      </mesh>
      <mesh castShadow position={[-0.29, 1.115, 0]}>
        <coneGeometry args={[0.04, 0.09, 6]} />
        <meshStandardMaterial color="#edc34f" />
      </mesh>
    </group>
  </group>
);
