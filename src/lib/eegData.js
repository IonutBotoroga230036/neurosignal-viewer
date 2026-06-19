// EEG data model + a realistic-ish simulated recording so the app is alive
// on first run, before you wire in your own HARP data.
//
// A Recording is the single shape the whole UI consumes:
//   {
//     channelNames: string[],          // length C
//     sfreq: number,                   // Hz
//     nSamples: number,                // T
//     data: Float32Array[],            // length C, each Float32Array of length T, microvolts
//     duration: number,                // seconds
//     markers: { time: number, label: string }[]
//   }

import { CHANNEL_NAMES, POSITION_BY_NAME } from "./montage.js";

// ---------------------------------------------------------------------------
// Simulated recording
// ---------------------------------------------------------------------------

export function generateSimulatedRecording({
  sfreq = 256,
  duration = 30,
} = {}) {
  const channelNames = CHANNEL_NAMES;
  const C = channelNames.length;
  const T = Math.floor(sfreq * duration);
  const data = channelNames.map(() => new Float32Array(T));

  // Posterior channels carry a stronger 10 Hz alpha rhythm.
  const posterior = new Set(["O1", "Oz", "O2", "POz", "PO3", "PO4", "PO7", "PO8", "Pz"]);
  // Frontal channels catch eye-blink artifacts.
  const frontal = ["Fp1", "Fp2", "AF7", "AF8", "AF3", "AF4"];
  const frontalSet = new Set(frontal);

  // Pre-roll some blink events (slow, large, frontal).
  const blinkTimes = [];
  for (let t = 2; t < duration; t += 3 + Math.random() * 2) blinkTimes.push(t);

  for (let c = 0; c < C; c++) {
    const name = channelNames[c];
    const alphaGain = posterior.has(name) ? 18 : 4;
    const phase = Math.random() * Math.PI * 2;
    // simple pink-ish noise via running sum of white noise, then de-trended
    let walk = 0;
    for (let i = 0; i < T; i++) {
      const time = i / sfreq;
      walk += (Math.random() - 0.5) * 2.2;
      walk *= 0.985; // leak so it doesn't drift away
      const alpha = alphaGain * Math.sin(2 * Math.PI * 10 * time + phase);
      const beta = 2.5 * Math.sin(2 * Math.PI * 20 * time + phase * 1.7);
      const white = (Math.random() - 0.5) * 6;
      data[c][i] = alpha + beta + walk + white;
    }

    if (frontalSet.has(name)) {
      for (const bt of blinkTimes) {
        const center = Math.floor(bt * sfreq);
        const widthS = 0.18 * sfreq;
        const amp = 70 + Math.random() * 40;
        for (let k = -widthS; k <= widthS; k++) {
          const idx = center + k;
          if (idx < 0 || idx >= T) continue;
          data[c][idx] += amp * Math.exp(-(k * k) / (2 * (widthS / 2.2) ** 2));
        }
      }
    }
  }

  const markers = blinkTimes.map((t, i) => ({
    time: t,
    label: `blink ${i + 1}`,
  }));

  return {
    channelNames,
    sfreq,
    nSamples: T,
    data,
    duration,
    markers,
    name: "Simulated 64-ch (alpha + blinks)",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Which loaded channels actually have a known 3D position.
export function channelsWithPosition(channelNames) {
  return channelNames.filter((n) => POSITION_BY_NAME[n] !== undefined);
}

// Sample value at an arbitrary continuous time (linear interpolation).
export function valueAt(recording, channelIndex, time) {
  const { data, sfreq, nSamples } = recording;
  const x = time * sfreq;
  const i0 = Math.floor(x);
  if (i0 < 0) return data[channelIndex][0];
  if (i0 >= nSamples - 1) return data[channelIndex][nSamples - 1];
  const frac = x - i0;
  const a = data[channelIndex][i0];
  const b = data[channelIndex][i0 + 1];
  return a + (b - a) * frac;
}

// ---------------------------------------------------------------------------
// Amplitude -> color (diverging, blue ↔ bone ↔ red)
// The UI chrome stays monochrome; color only ever encodes signal amplitude.
// ---------------------------------------------------------------------------

export function amplitudeToColor(value, range = 40) {
  const t = Math.max(-1, Math.min(1, value / range)); // -1..1
  // negative -> cool, positive -> warm, zero -> bone
  const lo = [74, 122, 196]; // blue
  const mid = [243, 241, 234]; // bone
  const hi = [196, 74, 74]; // red
  let rgb;
  if (t < 0) {
    rgb = lerp3(lo, mid, t + 1);
  } else {
    rgb = lerp3(mid, hi, t);
  }
  return rgb;
}

function lerp3(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}
