import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { POSITION_BY_NAME } from "../lib/montage.js";
import { valueAt, amplitudeToColor } from "../lib/eegData.js";

const SURFACE = 1.03; // push electrodes just outside the scalp
const SPREAD = 0.7;

// blend a direction toward the top of the head (Cz), then keep it on the sphere
function compress(pos, spread) {
  const x = pos[0] * spread;
  const y = (1 - spread) + pos[1] * spread; // up = (0,1,0)
  const z = pos[2] * spread;
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function Electrodes({ recording, playheadRef, colorRange, onHover }) {
  // electrodes that exist both in the montage and in the loaded recording
  const electrodes = useMemo(() => {
    const list = [];
    recording.channelNames.forEach((name, channelIndex) => {
      const pos = POSITION_BY_NAME[name];
      if (pos) {
        const d = compress(pos, SPREAD);
        list.push({
          name,
          channelIndex,
          position: [d[0] * SURFACE, d[1] * SURFACE, d[2] * SURFACE],
        });
      }
    });
    return list;
  }, [recording]);

  const matRefs = useRef([]);
  const scratch = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const t = playheadRef.current;
    for (let i = 0; i < electrodes.length; i++) {
      const mat = matRefs.current[i];
      if (!mat) continue;
      const v = valueAt(recording, electrodes[i].channelIndex, t);
      const [r, g, b] = amplitudeToColor(v, colorRange);
      scratch.setRGB(r / 255, g / 255, b / 255);
      mat.color.copy(scratch);
    }
  });

  return (
    <group>
      {electrodes.map((e, i) => (
        <mesh
          key={e.name}
          position={e.position}
          onPointerOver={(ev) => {
            ev.stopPropagation();
            onHover(e);
          }}
          onPointerOut={() => onHover(null)}
        >
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial
            ref={(m) => (matRefs.current[i] = m)}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Head() {
  return (
    <group>
      {/* scalp */}
      <mesh>
        <sphereGeometry args={[1.0, 48, 48]} />
        <meshStandardMaterial
          color="#1f1f22"
          roughness={0.9}
          metalness={0}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* hairline wire to read the curvature */}
      <mesh>
        <sphereGeometry args={[1.001, 24, 16]} />
        <meshBasicMaterial color="#2a2a2e" wireframe transparent opacity={0.4} />
      </mesh>
      {/* nose marker (front = -z) */}
      <mesh position={[0, -0.15, -1.02]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.16, 12]} />
        <meshStandardMaterial color="#8f8c84" />
      </mesh>
    </group>
  );
}

export default function BrainView3D({ recording, playheadRef, colorRange = 40 }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 1.1, 2.4], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={0.6} />
        <Head />
        {recording && (
          <Electrodes
            recording={recording}
            playheadRef={playheadRef}
            colorRange={colorRange}
            onHover={setHovered}
          />
        )}
        <OrbitControls
          enablePan={false}
          minDistance={1.6}
          maxDistance={4}
          rotateSpeed={0.6}
        />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-bone-500">
        topography
      </div>
      {hovered && (
        <div className="pointer-events-none absolute right-3 top-3 rounded border border-ink-600 bg-ink-850/90 px-2 py-1 font-mono text-xs text-bone-100">
          {hovered.name}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] text-bone-500">
        drag to rotate · scroll to zoom
      </div>
    </div>
  );
}
