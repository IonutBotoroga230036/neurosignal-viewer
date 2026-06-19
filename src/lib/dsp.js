// Signal processing for the display pipeline.
//
// Everything here is non-destructive: applyPipeline takes a Recording and a
// list of steps and returns a NEW Recording with filtered copies of the data.
// The original is never mutated, so toggling/reordering steps is reversible.
//
// Filters are RBJ biquads applied forward+backward (zero phase, like filtfilt),
// which is what EEG analysis expects. Runs once per participant/pipeline change,
// not per frame.

// ---------------------------------------------------------------------------
// Biquad design (RBJ cookbook)
// ---------------------------------------------------------------------------

function highpassCoeffs(f0, fs, Q = 0.707) {
  const w0 = (2 * Math.PI * f0) / fs;
  const c = Math.cos(w0), s = Math.sin(w0), alpha = s / (2 * Q);
  const a0 = 1 + alpha;
  return normalize(
    [(1 + c) / 2, -(1 + c), (1 + c) / 2],
    [a0, -2 * c, 1 - alpha]
  );
}

function lowpassCoeffs(f0, fs, Q = 0.707) {
  const w0 = (2 * Math.PI * f0) / fs;
  const c = Math.cos(w0), s = Math.sin(w0), alpha = s / (2 * Q);
  const a0 = 1 + alpha;
  return normalize(
    [(1 - c) / 2, 1 - c, (1 - c) / 2],
    [a0, -2 * c, 1 - alpha]
  );
}

function notchCoeffs(f0, fs, Q = 30) {
  const w0 = (2 * Math.PI * f0) / fs;
  const c = Math.cos(w0), s = Math.sin(w0), alpha = s / (2 * Q);
  const a0 = 1 + alpha;
  return normalize([1, -2 * c, 1], [a0, -2 * c, 1 - alpha]);
}

function normalize(b, a) {
  const a0 = a[0];
  return {
    b: [b[0] / a0, b[1] / a0, b[2] / a0],
    a: [1, a[1] / a0, a[2] / a0],
  };
}

// ---------------------------------------------------------------------------
// Apply (single channel)
// ---------------------------------------------------------------------------

function biquad(x, b, a) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const xn = x[n];
    const yn = b[0] * xn + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    y[n] = yn;
    x2 = x1; x1 = xn; y2 = y1; y1 = yn;
  }
  return y;
}

function filtfilt(x, coeffs) {
  let y = biquad(x, coeffs.b, coeffs.a);
  y.reverse();
  y = biquad(y, coeffs.b, coeffs.a);
  y.reverse();
  return y;
}

function demeanChannel(x) {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i];
  const mean = sum / x.length;
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] - mean;
  return y;
}

function detrendChannel(x) {
  const n = x.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += i; sy += x[i]; sxx += i * i; sxy += i * x[i];
  }
  const denom = n * sxx - sx * sx || 1;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = x[i] - (slope * i + intercept);
  return y;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

// steps: [{ type, enabled, params }]
// types: "demean" | "detrend" | "highpass"{freq} | "lowpass"{freq}
//        | "notch"{freq} | "car"
export function applyPipeline(recording, steps) {
  const active = (steps || []).filter((s) => s.enabled);
  if (!active.length) return recording;

  const { sfreq } = recording;
  // start from copies
  let data = recording.data.map((ch) => Float32Array.from(ch));

  for (const step of active) {
    switch (step.type) {
      case "demean":
        data = data.map(demeanChannel);
        break;
      case "detrend":
        data = data.map(detrendChannel);
        break;
      case "highpass":
        data = data.map((ch) => filtfilt(ch, highpassCoeffs(step.params.freq, sfreq)));
        break;
      case "lowpass":
        data = data.map((ch) => filtfilt(ch, lowpassCoeffs(step.params.freq, sfreq)));
        break;
      case "notch":
        data = data.map((ch) => filtfilt(ch, notchCoeffs(step.params.freq, sfreq)));
        break;
      case "car":
        applyCAR(data);
        break;
      default:
        break;
    }
  }

  return { ...recording, data, _filtered: true };
}

// common average reference: subtract the across-channel mean at each sample
function applyCAR(data) {
  const C = data.length;
  if (!C) return;
  const T = data[0].length;
  for (let t = 0; t < T; t++) {
    let mean = 0;
    for (let c = 0; c < C; c++) mean += data[c][t];
    mean /= C;
    for (let c = 0; c < C; c++) data[c][t] -= mean;
  }
}
