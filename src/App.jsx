import { useRef, useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.jsx";
import EEGTraceView from "./components/EEGTraceView.jsx";
import BrainView3D from "./components/BrainView3D.jsx";
import Timeline from "./components/Timeline.jsx";
import { usePlayback } from "./hooks/usePlayback.js";
import { generateSimulatedRecording } from "./lib/eegData.js";

export default function App() {
  const [recording, setRecording] = useState(null);
  const [gain, setGain] = useState(50); // µV per channel band
  const [windowSeconds, setWindowSeconds] = useState(8);
  const [colorRange, setColorRange] = useState(40); // µV for topography color
  const [error, setError] = useState(null);

  const durationRef = useRef(0);
  const { playheadRef, isPlaying, setIsPlaying, toggle, speed, setSpeed, seek } =
    usePlayback(durationRef);

  // start with the simulated recording so there's something to see
  useEffect(() => {
    loadRecording(generateSimulatedRecording());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRecording = (rec) => {
    setRecording(rec);
    durationRef.current = rec.duration;
    playheadRef.current = 0;
    setError(null);
  };

  const handleLoad = (rec) => {
    setIsPlaying(false);
    loadRecording(rec);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-900 text-bone-100">
      <Sidebar
        recording={recording}
        gain={gain}
        setGain={setGain}
        windowSeconds={windowSeconds}
        setWindowSeconds={setWindowSeconds}
        colorRange={colorRange}
        setColorRange={setColorRange}
        onLoadSimulated={() => handleLoad(generateSimulatedRecording())}
        onLoad={handleLoad}
        onError={setError}
        error={error}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1">
          <section className="min-w-0 flex-1 border-r border-ink-700">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-bone-500">
                channels
              </span>
              <span className="font-mono text-[10px] text-bone-500">
                {recording ? `${recording.channelNames.length} traces` : "—"}
              </span>
            </div>
            <div className="h-[calc(100%-33px)]">
              <EEGTraceView
                recording={recording}
                playheadRef={playheadRef}
                gain={gain}
                windowSeconds={windowSeconds}
              />
            </div>
          </section>

          <section className="w-[42%] min-w-[320px] max-w-[560px]">
            <BrainView3D
              recording={recording}
              playheadRef={playheadRef}
              colorRange={colorRange}
            />
          </section>
        </div>

        <Timeline
          duration={durationRef.current}
          playheadRef={playheadRef}
          isPlaying={isPlaying}
          toggle={toggle}
          speed={speed}
          setSpeed={setSpeed}
          seek={seek}
          markers={recording?.markers || []}
        />
      </main>
    </div>
  );
}
