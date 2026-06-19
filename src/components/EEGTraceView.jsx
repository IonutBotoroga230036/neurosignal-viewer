import { useRef, useEffect } from "react";

// ActiView-style stacked traces. Reads the playhead each frame from a ref so it
// never re-renders React during playback. Scroll wheel zooms: time by default,
// amplitude (gain) with Shift held. Only the channels in `channelIndices` draw.

export default function EEGTraceView({
  recording,
  playheadRef,
  gain,
  windowSeconds,
  channelIndices, // indices into recording.data to display
  markers = [],   // colored markers: { time, label, color }
  setGain,
  setWindowSeconds,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const stateRef = useRef({});
  stateRef.current = {
    recording,
    gain,
    windowSeconds,
    channelIndices,
    markers,
    setGain,
    setWindowSeconds,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    // scroll wheel: zoom time (plain) or gain (shift)
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const onWheel = (e) => {
      e.preventDefault();
      const st = stateRef.current;
      const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
      if (e.shiftKey) {
        st.setGain?.(clamp(Math.round(st.gain * factor), 5, 250));
      } else {
        st.setWindowSeconds?.(clamp(+(st.windowSeconds * factor).toFixed(1), 1, 30));
      }
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });

    const draw = () => {
      const { recording, gain, windowSeconds, channelIndices, markers } =
        stateRef.current;
      const rect = wrap.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);
      if (!recording) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const idx =
        channelIndices && channelIndices.length
          ? channelIndices
          : recording.channelNames.map((_, i) => i);

      const labelW = 52, axisH = 18;
      const plotW = W - labelW, plotH = H - axisH;
      const { sfreq, duration, data, channelNames } = recording;
      const C = idx.length;
      const bandH = plotH / C;

      const tEnd = playheadRef.current;
      const playheadX = labelW + plotW * 0.85;
      const tStart = tEnd - windowSeconds * 0.85;
      const tWindowEnd = tStart + windowSeconds;
      const timeToX = (time) => labelW + ((time - tStart) / windowSeconds) * plotW;

      for (let c = 0; c < C; c++) {
        if (c % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.015)";
          ctx.fillRect(labelW, c * bandH, plotW, bandH);
        }
      }

      // markers (colored), drawn full height
      for (const m of markers) {
        if (m.time < tStart || m.time > tWindowEnd) continue;
        const x = timeToX(m.time);
        ctx.strokeStyle = m.color || "#c4565699";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, plotH);
        ctx.stroke();
      }

      // traces
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#c9c6bd";
      const i0 = Math.max(0, Math.floor(tStart * sfreq));
      const i1 = Math.min(recording.nSamples - 1, Math.ceil(tWindowEnd * sfreq));
      const step = Math.max(1, Math.floor((i1 - i0) / Math.max(1, plotW)));

      for (let c = 0; c < C; c++) {
        const mid = c * bandH + bandH / 2;
        const ch = data[idx[c]];
        ctx.beginPath();
        let first = true;
        for (let i = i0; i <= i1; i += step) {
          const x = timeToX(i / sfreq);
          const y = mid - (ch[i] / gain) * (bandH / 2);
          if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // channel labels
      ctx.fillStyle = "#8f8c84";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textBaseline = "middle";
      for (let c = 0; c < C; c++) {
        ctx.fillText(channelNames[idx[c]], 6, c * bandH + bandH / 2);
      }

      // playhead
      ctx.strokeStyle = "#f3f1ea";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, plotH);
      ctx.stroke();

      // time axis
      ctx.fillStyle = "#8f8c84";
      ctx.textBaseline = "top";
      for (let s = Math.ceil(tStart); s <= tWindowEnd; s++) {
        if (s < 0 || s > duration) continue;
        const x = timeToX(s);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, plotH);
        ctx.stroke();
        ctx.fillText(`${s}s`, x + 3, plotH + 3);
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("wheel", onWheel);
    };
  }, [playheadRef]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
