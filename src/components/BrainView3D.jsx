import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { POSITION_BY_NAME } from "../lib/montage.js";
import { valueAt, amplitudeToColor } from "../lib/eegData.js";
import { dominantBand, DEFAULT_BANDS } from "../lib/bands.js";

const SURFACE = 1.03; // push electrodes just outside the scalp
const SPREAD = 0.7;
const BAND_REFRESH_MS = 150; // recompute band power a few times/sec, not per frame

function compress(pos, spread) {
  const x = pos[0] * spread;
  const y = (1 - spread) + pos[1] * spread;
  const z = pos[2] * spread;
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function Electrodes({ recording, playheadRef, colorRange, colorMode, bands, onHover }) {
  const electrodes = useMemo(() => {
    const list = [];
    recording.channelNames.forEach((name, channelIndex) => {
      const pos = POSITION_BY_NAME[name];
      if (pos) {
        const d = compress(pos, SPREAD);
        list.push({ name, channelIndex, position: [d[0] * SURFACE, d[1] * SURFACE, d[2] * SURFACE] });
      }
    });
    return list;
  }, [recording]);

  const matRefs = useRef([]);
  const scratch = useMemo(() => new THREE.Color(), []);
  const lastBand = useRef(0);

  useFrame(() => {
    const t = playheadRef.current;

    if (colorMode === "band") {
      const now = performance.now();
      if (now - lastBand.current < BAND_REFRESH_MS) return; // throttle FFTs
      lastBand.current = now;
      const end = Math.floor(t * recording.sfreq);
      for (let i = 0; i < electrodes.length; i++) {
        const mat = matRefs.current[i];
        if (!mat) continue;
        const band = dominantBand(recording.data[electrodes[i].channelIndex], end, recording.sfreq, bands);
        const hex = band ? band.color : "#3a3a40";
        scratch.set(hex);
        mat.color.copy(scratch);
        mat.emissive.copy(scratch);
      }
      return;
    }

    // amplitude mode: per-frame
    for (let i = 0; i < electrodes.length; i++) {
      const mat = matRefs.current[i];
      if (!mat) continue;
      const v = valueAt(recording, electrodes[i].channelIndex, t);
      const [r, g, b] = amplitudeToColor(v, colorRange);
      scratch.setRGB(r / 255, g / 255, b / 255);
      mat.color.copy(scratch);
      mat.emissive.copy(scratch);
    }
  });

  return (
    <group>
      {electrodes.map((e, i) => (
        <mesh key={e.name} position={e.position}
          onPointerOver={(ev) => { ev.stopPropagation(); onHover(e); }}
          onPointerOut={() => onHover(null)}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial ref={(m) => (matRefs.current[i] = m)} roughness={0.4} metalness={0.1} emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function Head() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.0, 48, 48]} />
        <meshStandardMaterial color="#1f1f22" roughness={0.9} metalness={0} transparent opacity={0.55} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.001, 24, 16]} />
        <meshBasicMaterial color="#2a2a2e" wireframe transparent opacity={0.4} />
      </mesh>
      <mesh position={[0, -0.15, -1.02]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.06, 0.16, 12]} />
        <meshStandardMaterial color="#8f8c84" />
      </mesh>
    </group>
  );
}

export default function BrainView3D({
  recording,
  playheadRef,
  colorRange = 40,
  colorMode = "amplitude",
  bands = DEFAULT_BANDS,
}) {
  const [hovered, setHovered] = useState(null);
  const enabledBands = bands.filter((b) => b.enabled);

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 1.1, 2.8], fov: 45 }} dpr={[1, 2]}>
        <hemisphereLight args={["#44444f", "#0a0a0b", 0.4]} />
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 5, 4]} intensity={0.9} />
        <directionalLight position={[-4, 1, -3]} intensity={0.4} color="#88aaff" />
        <Head />
        {recording && (
          <Electrodes
            recording={recording}
            playheadRef={playheadRef}
            colorRange={colorRange}
            colorMode={colorMode}
            bands={bands}
            onHover={setHovered}
          />
        )}
        <OrbitControls enablePan={false} minDistance={1.3} maxDistance={7} rotateSpeed={0.6} />
      </Canvas>

      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] uppercase tracking-widest text-bone-500">
        topography
      </div>

      {/* band legend */}
      {colorMode === "band" && (
        <div className="pointer-events-none absolute right-3 top-3 space-y-1 rounded border border-ink-600 bg-ink-850/90 px-2 py-1.5">
          {enabledBands.map((b) => (
            <div key={b.name} className="flex items-center gap-1.5 font-mono text-[10px] text-bone-300">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: b.color }} />
              {b.name} <span className="text-bone-500">{b.lo}-{b.hi}</span>
            </div>
          ))}
        </div>
      )}
      {hovered && (
        <div className="pointer-events-none absolute right-3 bottom-8 rounded border border-ink-600 bg-ink-850/90 px-2 py-1 font-mono text-xs text-bone-100">
          {hovered.name}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px] text-bone-500">
        drag to rotate · scroll to zoom
      </div>
    </div>
  );
}
