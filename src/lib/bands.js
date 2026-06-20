// Frequency-band power for the topography "band" color mode.
//
// Given a short window of samples for one channel, we take an FFT, sum the
// power spectral density inside each band, and pick the dominant band. The
// 3D view colors each electrode with that band's (single, flat) color.
//
// EEG power follows 1/f, so delta almost always has the most absolute power.
// To make the map meaningful we compare RELATIVE power among the ENABLED
// bands only, so a researcher can disable delta/theta and see whether a site
// is alpha- vs beta- vs gamma-dominant.

export const DEFAULT_BANDS = [
  { name: "delta", lo: 1, hi: 4, color: "#6c8ec4", enabled: true },
  { name: "theta", lo: 4, hi: 8, color: "#6cc49a", enabled: true },
  { name: "alpha", lo: 8, hi: 12, color: "#c4b46c", enabled: true },
  { name: "beta", lo: 12, hi: 25, color: "#d4886c", enabled: true },
  { name: "gamma", lo: 25, hi: 45, color: "#c46c9b", enabled: true },
];

// in-place iterative radix-2 FFT
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len >> 1; k++) {
        const a = i + k, b = i + k + (len >> 1);
        const vr = re[b] * cr - im[b] * ci;
        const vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi;
        re[a] += vr; im[a] += vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

const pow2Floor = (n) => { let p = 1; while (p * 2 <= n) p *= 2; return p; };

// absolute power per band for one channel window ending at `end` (sample index)
export function bandPowers(channel, end, sfreq, bands, maxN = 512) {
  const avail = Math.min(end + 1, channel.length);
  const N = pow2Floor(Math.min(maxN, avail));
  if (N < 16) return bands.map(() => 0);

  const start = end - N + 1;
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  // mean-remove + Hann window to limit spectral leakage
  let mean = 0;
  for (let i = 0; i < N; i++) mean += channel[start + i];
  mean /= N;
  for (let i = 0; i < N; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
    re[i] = (channel[start + i] - mean) * w;
  }
  fft(re, im);

  const binHz = sfreq / N;
  const out = bands.map(() => 0);
  for (let k = 1; k < N >> 1; k++) {
    const f = k * binHz;
    const p = re[k] * re[k] + im[k] * im[k];
    for (let b = 0; b < bands.length; b++) {
      if (f >= bands[b].lo && f < bands[b].hi) { out[b] += p; break; }
    }
  }
  return out;
}

// dominant ENABLED band by relative power; returns the band object or null
export function dominantBand(channel, end, sfreq, bands) {
  const enabled = bands.filter((b) => b.enabled);
  if (!enabled.length) return null;
  const powers = bandPowers(channel, end, sfreq, enabled);
  let best = 0;
  for (let i = 1; i < powers.length; i++) if (powers[i] > powers[best]) best = i;
  return enabled[best];
}
