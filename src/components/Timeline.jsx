import { useRef, useEffect, useCallback } from "react";

export default function Timeline({
  duration,
  playheadRef,
  isPlaying,
  toggle,
  speed,
  setSpeed,
  seek,
  markers = [],
}) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const timeRef = useRef(null);
  const draggingRef = useRef(false);

  // live thumb + readout, updated per frame without React renders
  useEffect(() => {
    let raf;
    const loop = () => {
      const t = playheadRef.current;
      const pct = duration > 0 ? (t / duration) * 100 : 0;
      if (thumbRef.current) thumbRef.current.style.left = `${pct}%`;
      if (timeRef.current) timeRef.current.textContent = formatTime(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [duration, playheadRef]);

  const seekFromEvent = useCallback(
    (clientX) => {
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      seek(pct * duration);
    },
    [duration, seek]
  );

  const onPointerDown = (e) => {
    draggingRef.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    seekFromEvent(e.clientX);
  };
  const onPointerMove = (e) => {
    if (draggingRef.current) seekFromEvent(e.clientX);
  };
  const onPointerUp = (e) => {
    draggingRef.current = false;
    trackRef.current.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="flex items-center gap-4 border-t border-ink-700 bg-ink-850 px-4 py-3">
      <button
        onClick={toggle}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-600 text-bone-100 transition hover:border-bone-500"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <span className="text-sm">❚❚</span>
        ) : (
          <span className="ml-0.5 text-sm">▶</span>
        )}
      </button>

      <span
        ref={timeRef}
        className="w-16 shrink-0 font-mono text-xs text-bone-300"
      >
        0:00.0
      </span>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative h-6 flex-1 cursor-pointer"
      >
        <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-ink-600" />
        {markers.map((m, i) => (
          <div
            key={i}
            title={m.label}
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-[#c4565640]"
            style={{ left: `${(m.time / duration) * 100}%` }}
          />
        ))}
        <div
          ref={thumbRef}
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-bone-100"
          style={{ left: "0%" }}
        />
      </div>

      <span className="shrink-0 font-mono text-xs text-bone-500">
        {formatTime(duration)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`rounded px-2 py-0.5 font-mono text-[11px] transition ${
              speed === s
                ? "bg-bone-100 text-ink-900"
                : "text-bone-500 hover:text-bone-300"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t * 10) % 10);
  return `${m}:${String(s).padStart(2, "0")}.${d}`;
}
