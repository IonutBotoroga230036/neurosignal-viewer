import { useRef, useState, useEffect, useCallback } from "react";

// Owns the playhead (in seconds) as a ref so the render-heavy views
// (canvas traces, 3D topography) can read it every frame without triggering
// React re-renders. Only coarse state (isPlaying, speed) lives in React.

export function usePlayback(durationRef) {
  const playheadRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const playingRef = useRef(isPlaying);
  const speedRef = useRef(speed);
  playingRef.current = isPlaying;
  speedRef.current = speed;

  useEffect(() => {
    let raf;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (playingRef.current) {
        const duration = durationRef.current || 0;
        let next = playheadRef.current + dt * speedRef.current;
        if (next >= duration) {
          next = 0; // loop
        }
        playheadRef.current = next;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationRef]);

  const seek = useCallback(
    (time) => {
      const duration = durationRef.current || 0;
      playheadRef.current = Math.max(0, Math.min(duration, time));
    },
    [durationRef]
  );

  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  return { playheadRef, isPlaying, setIsPlaying, toggle, speed, setSpeed, seek };
}
