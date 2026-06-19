// EDF / BDF binary reader.
//
// EDF and BDF share the same header layout and differ only in sample width:
// EDF stores 16-bit signed integers, BDF stores 24-bit signed integers and is
// identified by a 0xFF + "BIOSEMI" magic prefix. Both are parsed here into the
// shared Recording shape (see eegData.js).
//
// The core function works on a raw ArrayBuffer so it can be unit-tested outside
// the browser; the loader wrapper in formats.js just calls file.arrayBuffer().

import { POSITION_BY_NAME } from "./montage.js";

const ascii = (buf, start, len) =>
  new TextDecoder("ascii").decode(new Uint8Array(buf, start, len)).trim();

// channels that aren't EEG signal and should be dropped from the view
const NON_EEG = new Set([
  "EDF Annotations",
  "BDF Annotations",
  "Status",
  "Marker",
  "Trigger",
]);

// physical-dimension string -> factor to convert into microvolts
function unitToMicrovolts(dim) {
  const d = dim.toLowerCase();
  if (d === "v") return 1e6;
  if (d === "mv") return 1e3;
  if (d === "uv" || d === "µv" || d === "\u00b5v") return 1;
  if (d === "nv") return 1e-3;
  return 1; // assume already µV if unlabeled
}

export function parseEDF(buffer, fileName = "recording") {
  const isBDF = new Uint8Array(buffer, 0, 1)[0] === 0xff;
  const bytesPerSample = isBDF ? 3 : 2;

  // --- fixed header (256 bytes) ---
  const headerBytes = parseInt(ascii(buffer, 184, 8), 10);
  let nRecords = parseInt(ascii(buffer, 236, 8), 10);
  const recordDuration = parseFloat(ascii(buffer, 244, 8));
  const ns = parseInt(ascii(buffer, 252, 4), 10);

  if (!ns || !recordDuration) {
    throw new Error("File header looks malformed (no signals or zero record length).");
  }

  // --- per-signal header ---
  let off = 256;
  const labels = [];
  for (let i = 0; i < ns; i++) labels.push(ascii(buffer, off + i * 16, 16));
  off += ns * 16;
  off += ns * 80; // transducer (skip)
  const dims = [];
  for (let i = 0; i < ns; i++) dims.push(ascii(buffer, off + i * 8, 8));
  off += ns * 8;
  const physMin = readFloats(buffer, off, ns);
  off += ns * 8;
  const physMax = readFloats(buffer, off, ns);
  off += ns * 8;
  const digMin = readFloats(buffer, off, ns);
  off += ns * 8;
  const digMax = readFloats(buffer, off, ns);
  off += ns * 8;
  off += ns * 80; // prefiltering (skip)
  const samplesPerRecord = readInts(buffer, off, ns);
  off += ns * 8;
  off += ns * 32; // reserved

  const recordBytes =
    samplesPerRecord.reduce((a, b) => a + b, 0) * bytesPerSample;

  // some files declare -1 records; derive from file size instead
  if (!nRecords || nRecords < 0) {
    nRecords = Math.floor((buffer.byteLength - headerBytes) / recordBytes);
  }

  // pick the EEG channels: real signal, on the dominant sample rate
  const sfreqs = samplesPerRecord.map((s) => s / recordDuration);
  const modal = modeOf(sfreqs);
  const keep = [];
  for (let i = 0; i < ns; i++) {
    if (NON_EEG.has(labels[i])) continue;
    if (sfreqs[i] !== modal) continue;
    keep.push(i);
  }
  if (!keep.length) {
    throw new Error("No EEG channels found on a consistent sample rate.");
  }

  const sfreq = modal;
  const nSamplesPerKeptRecord = samplesPerRecord[keep[0]];
  const T = nRecords * nSamplesPerKeptRecord;

  const channelNames = keep.map((i) => labels[i]);
  const data = keep.map(() => new Float32Array(T));

  // scale = physical units per digital step, then into microvolts
  const scale = keep.map((i) => {
    const gain =
      (physMax[i] - physMin[i]) / (digMax[i] - digMin[i] || 1);
    return gain * unitToMicrovolts(dims[i]);
  });
  const offsetPhys = keep.map((i) => physMin[i]);
  const offsetDig = keep.map((i) => digMin[i]);

  const view = new DataView(buffer);
  let base = headerBytes;

  // offset (in samples within a record) where each signal starts
  const sigStart = new Array(ns);
  let acc = 0;
  for (let i = 0; i < ns; i++) {
    sigStart[i] = acc;
    acc += samplesPerRecord[i];
  }

  for (let r = 0; r < nRecords; r++) {
    for (let k = 0; k < keep.length; k++) {
      const i = keep[k];
      const nSmp = samplesPerRecord[i];
      let bytePos = base + sigStart[i] * bytesPerSample;
      const outBase = r * nSmp;
      const arr = data[k];
      const sc = scale[k];
      const oP = offsetPhys[k];
      const oD = offsetDig[k];
      for (let s = 0; s < nSmp; s++) {
        const digital = isBDF
          ? readInt24(view, bytePos)
          : view.getInt16(bytePos, true);
        bytePos += bytesPerSample;
        arr[outBase + s] = (digital - oD) * sc + oP;
      }
    }
    base += recordBytes;
  }

  const known = channelNames.filter((n) => POSITION_BY_NAME[n] !== undefined);

  return {
    channelNames,
    sfreq,
    nSamples: T,
    data,
    duration: T / sfreq,
    markers: [],
    name: fileName,
    knownPositionCount: known.length,
  };
}

// ---------------------------------------------------------------------------

function readFloats(buf, start, n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = parseFloat(ascii(buf, start + i * 8, 8));
  return out;
}

function readInts(buf, start, n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = parseInt(ascii(buf, start + i * 8, 8), 10);
  return out;
}

function readInt24(view, pos) {
  const b0 = view.getUint8(pos);
  const b1 = view.getUint8(pos + 1);
  const b2 = view.getUint8(pos + 2);
  let val = b0 | (b1 << 8) | (b2 << 16);
  if (val & 0x800000) val -= 0x1000000; // sign extend
  return val;
}

function modeOf(arr) {
  const counts = new Map();
  let best = arr[0];
  let bestN = 0;
  for (const v of arr) {
    const c = (counts.get(v) || 0) + 1;
    counts.set(v, c);
    if (c > bestN) {
      bestN = c;
      best = v;
    }
  }
  return best;
}
