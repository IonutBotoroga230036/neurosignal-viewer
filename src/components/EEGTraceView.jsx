import { useRef, useEffect } from "react";

// ActiView-style stacked traces on a single canvas. Reads the playhead every
// frame from a ref and redraws, so it never triggers a React render during
// playback. Decimates to ~1 point per pixel column for speed at 64 channels.

export default function EEGTraceView({
  recording,
  playheadRef,
  gain, // microvolts mapped to one channel band height
  windowSeconds,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  // keep latest props for the animation loop without re-subscribing rAF
  const stateRef = useRef({ recording, gain, windowSeconds });
  stateRef.current = { recording, gain, windowSeconds };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = wrapRef.current.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapRef.current);

    const draw = () => {
      const { recording, gain, windowSeconds } = stateRef.current;
      const rect = wrapRef.current.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      ctx.clearRect(0, 0, W, H);

      if (!recording) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const labelW = 52;
      const axisH = 18;
      const plotW = W - labelW;
      const plotH = H - axisH;

      const { channelNames, data, sfreq, duration } = recording;
      const C = channelNames.length;
      const bandH = plotH / C;

      const t = playheadRef.current;
      const tEnd = t; // playhead sits near the right edge
      const playheadX = labelW + plotW * 0.85;
      const secondsBeforePlayhead = windowSeconds * 0.85;
      const tStart = tEnd - secondsBeforePlayhead;
      const tWindowEnd = tStart + windowSeconds;

      const timeToX = (time) =>
        labelW + ((time - tStart) / windowSeconds) * plotW;

      // alternating band backgrounds
      for (let c = 0; c < C; c++) {
        if (c % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.015)";
          ctx.fillRect(labelW, c * bandH, plotW, bandH);
        }
      }

      // markers
      if (recording.markers) {
        ctx.strokeStyle = "rgba(196,74,74,0.35)";
        ctx.lineWidth = 1;
        for (const m of recording.markers) {
          if (m.time < tStart || m.time > tWindowEnd) continue;
          const x = timeToX(m.time);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, plotH);
          ctx.stroke();
        }
      }

      // traces
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#c9c6bd";
      const i0 = Math.max(0, Math.floor(tStart * sfreq));
      const i1 = Math.min(
        recording.nSamples - 1,
        Math.ceil(tWindowEnd * sfreq)
      );
      const span = Math.max(1, i1 - i0);
      const step = Math.max(1, Math.floor(span / plotW));

      for (let c = 0; c < C; c++) {
        const mid = c * bandH + bandH / 2;
        const ch = data[c];
        ctx.beginPath();
        let first = true;
        for (let i = i0; i <= i1; i += step) {
          const time = i / sfreq;
          const x = timeToX(time);
          const y = mid - (ch[i] / gain) * (bandH / 2);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // channel labels
      ctx.fillStyle = "#8f8c84";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textBaseline = "middle";
      for (let c = 0; c < C; c++) {
        const mid = c * bandH + bandH / 2;
        ctx.fillText(channelNames[c], 6, mid);
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
      ctx.font = "10px 'JetBrains Mono', monospace";
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
    };
  }, [playheadRef]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      <canvas ref={canvasRef} />
    </div>
  );
}
