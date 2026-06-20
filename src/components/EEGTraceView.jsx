import { useRef, useEffect } from "react";

const LABEL_W = 52;

// ActiView-style stacked traces. Reads the playhead each frame from a ref so it
// never re-renders React during playback.
//   - scroll wheel zooms: time by default, amplitude (gain) with Shift
//   - click + drag pans through time (works paused or playing)
//   - markers draw as colored lines with their code/label at the base

export default function EEGTraceView({
  recording,
  playheadRef,
  gain,
  windowSeconds,
  channelIndices,
  markers = [],
  setGain,
  setWindowSeconds,
  seek,
  markerFontSize = 9,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const stateRef = useRef({});
  stateRef.current = {
    recording, gain, windowSeconds, channelIndices, markers,
    setGain, setWindowSeconds, seek, markerFontSize,
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

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // scroll wheel: zoom time (plain) or gain (shift)
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

    // drag to pan through time
    let dragging = false, startX = 0, startPlayhead = 0;
    const plotW = () => wrap.getBoundingClientRect().width - LABEL_W;
    const onDown = (e) => {
      dragging = true;
      startX = e.clientX;
      startPlayhead = playheadRef.current;
      wrap.setPointerCapture(e.pointerId);
      wrap.style.cursor = "grabbing";
    };
    const onMove = (e) => {
      if (!dragging) return;
      const st = stateRef.current;
      const dt = -((e.clientX - startX) / plotW()) * st.windowSeconds;
      st.seek?.(startPlayhead + dt);
    };
    const onUp = (e) => {
      dragging = false;
      wrap.releasePointerCapture(e.pointerId);
      wrap.style.cursor = "grab";
    };
    wrap.style.cursor = "grab";
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);

    const draw = () => {
      const { recording, gain, windowSeconds, channelIndices, markers, markerFontSize } = stateRef.current;
      const rect = wrap.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);
      if (!recording) { raf = requestAnimationFrame(draw); return; }

      const idx =
        channelIndices && channelIndices.length
          ? channelIndices
          : recording.channelNames.map((_, i) => i);

      const axisH = 18;
      const plotWidth = W - LABEL_W, plotH = H - axisH;
      const { sfreq, duration, data, channelNames } = recording;
      const C = idx.length;
      const bandH = plotH / C;

      const tEnd = playheadRef.current;
      const playheadX = LABEL_W + plotWidth * 0.85;
      const tStart = tEnd - windowSeconds * 0.85;
      const tWindowEnd = tStart + windowSeconds;
      const timeToX = (time) => LABEL_W + ((time - tStart) / windowSeconds) * plotWidth;

      for (let c = 0; c < C; c++) {
        if (c % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.015)";
          ctx.fillRect(LABEL_W, c * bandH, plotWidth, bandH);
        }
      }

      // markers: colored line + code/label at the base
      ctx.textBaseline = "bottom";
      ctx.font = `${markerFontSize || 9}px 'JetBrains Mono', monospace`;
      for (const m of markers) {
        if (m.time < tStart || m.time > tWindowEnd) continue;
        const x = timeToX(m.time);
        if (x < LABEL_W) continue;
        ctx.strokeStyle = m.color || "#c45656";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, plotH);
        ctx.stroke();
        ctx.fillStyle = m.color || "#c45656";
        const text = m.code != null ? String(m.code) : m.label;
        ctx.save();
        ctx.translate(x + 2, plotH - 2);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }

      // traces
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#c9c6bd";
      const i0 = Math.max(0, Math.floor(tStart * sfreq));
      const i1 = Math.min(recording.nSamples - 1, Math.ceil(tWindowEnd * sfreq));
      const step = Math.max(1, Math.floor((i1 - i0) / Math.max(1, plotWidth)));

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
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
    };
  }, [playheadRef]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
