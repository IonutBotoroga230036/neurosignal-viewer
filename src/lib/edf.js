// EDF / BDF binary reader.
//
// EDF stores 16-bit signed samples; BDF stores 24-bit and starts with a
// 0xFF + "BIOSEMI" magic prefix. Both parse into the shared Recording shape.
//
// Markers/events are pulled from whichever the file carries:
//   - BioSemi BDF: trigger codes on the "Status" channel (rising edges)
//   - EDF+/BDF+:   annotations on the "* Annotations" channel (TALs)
//
// The core works on an ArrayBuffer so it can be unit-tested outside the browser.

import { POSITION_BY_NAME } from "./montage.js";

const ascii = (buf, start, len) =>
  new TextDecoder("ascii").decode(new Uint8Array(buf, start, len)).trim();

const NON_EEG = new Set([
  "EDF Annotations",
  "BDF Annotations",
  "Status",
  "Marker",
  "Trigger",
]);

const TRIGGER_MASK = 0xff; // low byte of the BioSemi status word

function unitToMicrovolts(dim) {
  const d = dim.toLowerCase();
  if (d === "v") return 1e6;
  if (d === "mv") return 1e3;
  if (d === "uv" || d === "µv" || d === "\u00b5v") return 1;
  if (d === "nv") return 1e-3;
  return 1;
}

export function parseEDF(buffer, fileName = "recording") {
  const isBDF = new Uint8Array(buffer, 0, 1)[0] === 0xff;
  const bytesPerSample = isBDF ? 3 : 2;

  const headerBytes = parseInt(ascii(buffer, 184, 8), 10);
  let nRecords = parseInt(ascii(buffer, 236, 8), 10);
  const recordDuration = parseFloat(ascii(buffer, 244, 8));
  const ns = parseInt(ascii(buffer, 252, 4), 10);
  if (!ns || !recordDuration) {
    throw new Error("File header looks malformed (no signals or zero record length).");
  }

  let off = 256;
  const labels = [];
  for (let i = 0; i < ns; i++) labels.push(ascii(buffer, off + i * 16, 16));
  off += ns * 16;
  off += ns * 80;
  const dims = [];
  for (let i = 0; i < ns; i++) dims.push(ascii(buffer, off + i * 8, 8));
  off += ns * 8;
  const physMin = readFloats(buffer, off, ns); off += ns * 8;
  const physMax = readFloats(buffer, off, ns); off += ns * 8;
  const digMin = readFloats(buffer, off, ns); off += ns * 8;
  const digMax = readFloats(buffer, off, ns); off += ns * 8;
  off += ns * 80;
  const samplesPerRecord = readInts(buffer, off, ns); off += ns * 8;
  off += ns * 32;

  const recordBytes =
    samplesPerRecord.reduce((a, b) => a + b, 0) * bytesPerSample;
  if (!nRecords || nRecords < 0) {
    nRecords = Math.floor((buffer.byteLength - headerBytes) / recordBytes);
  }

  // identify special channels
  const statusIdx = labels.findIndex((l) => l === "Status");
  const annotIdx = labels.findIndex((l) => l.includes("Annotations"));

  // EEG channels: real signal on the dominant sample rate
  const sfreqs = samplesPerRecord.map((s) => s / recordDuration);
  const modal = modeOf(sfreqs);
  const keep = [];
  for (let i = 0; i < ns; i++) {
    if (NON_EEG.has(labels[i])) continue;
    if (sfreqs[i] !== modal) continue;
    keep.push(i);
  }
  if (!keep.length) throw new Error("No EEG channels found on a consistent sample rate.");

  const sfreq = modal;
  const sprKept = samplesPerRecord[keep[0]];
  const T = nRecords * sprKept;
  const channelNames = keep.map((i) => labels[i]);
  const data = keep.map(() => new Float32Array(T));

  const scale = keep.map(
    (i) => ((physMax[i] - physMin[i]) / (digMax[i] - digMin[i] || 1)) * unitToMicrovolts(dims[i])
  );
  const oPhys = keep.map((i) => physMin[i]);
  const oDig = keep.map((i) => digMin[i]);

  // buffers for marker channels
  const statusVals =
    statusIdx >= 0 ? new Int32Array(nRecords * samplesPerRecord[statusIdx]) : null;
  const annotBytes =
    annotIdx >= 0
      ? new Uint8Array(nRecords * samplesPerRecord[annotIdx] * bytesPerSample)
      : null;
  let annotWritten = 0;

  const view = new DataView(buffer);
  const sigStart = new Array(ns);
  let acc = 0;
  for (let i = 0; i < ns; i++) { sigStart[i] = acc; acc += samplesPerRecord[i]; }

  let base = headerBytes;
  for (let r = 0; r < nRecords; r++) {
    // EEG channels
    for (let k = 0; k < keep.length; k++) {
      const i = keep[k];
      const nSmp = samplesPerRecord[i];
      let p = base + sigStart[i] * bytesPerSample;
      const outBase = r * nSmp;
      const arr = data[k], sc = scale[k], oP = oPhys[k], oD = oDig[k];
      for (let s = 0; s < nSmp; s++) {
        const dig = isBDF ? readInt24(view, p) : view.getInt16(p, true);
        p += bytesPerSample;
        arr[outBase + s] = (dig - oD) * sc + oP;
      }
    }
    // status channel (raw digital)
    if (statusVals) {
      const nSmp = samplesPerRecord[statusIdx];
      let p = base + sigStart[statusIdx] * bytesPerSample;
      const outBase = r * nSmp;
      for (let s = 0; s < nSmp; s++) {
        statusVals[outBase + s] = isBDF ? readInt24(view, p) : view.getInt16(p, true);
        p += bytesPerSample;
      }
    }
    // annotation channel (raw bytes)
    if (annotBytes) {
      const nBytes = samplesPerRecord[annotIdx] * bytesPerSample;
      let p = base + sigStart[annotIdx] * bytesPerSample;
      for (let s = 0; s < nBytes; s++) annotBytes[annotWritten++] = view.getUint8(p++);
    }
    base += recordBytes;
  }

  // build markers
  let markers = [];
  if (statusVals) {
    markers = markers.concat(
      extractStatusEvents(statusVals, samplesPerRecord[statusIdx] / recordDuration)
    );
  }
  if (annotBytes) {
    markers = markers.concat(parseAnnotations(annotBytes));
  }
  markers.sort((a, b) => a.time - b.time);

  const known = channelNames.filter((n) => POSITION_BY_NAME[n] !== undefined);

  return {
    channelNames,
    sfreq,
    nSamples: T,
    data,
    duration: T / sfreq,
    markers,
    name: fileName,
    knownPositionCount: known.length,
  };
}

// --- marker extraction ---------------------------------------------------

function extractStatusEvents(digital, sfreq) {
  const events = [];
  let prev = digital[0] & TRIGGER_MASK;
  for (let i = 1; i < digital.length; i++) {
    const code = digital[i] & TRIGGER_MASK;
    if (code !== prev) {
      if (code !== 0) events.push({ time: i / sfreq, label: `trigger ${code}`, code });
      prev = code;
    }
  }
  return events;
}

function parseAnnotations(bytes) {
  const events = [];
  const text = new TextDecoder("latin1").decode(bytes);
  for (const tal of text.split("\x00")) {
    if (!tal) continue;
    const segments = tal.split("\x14");
    const timing = segments[0];
    if (!timing || (timing[0] !== "+" && timing[0] !== "-")) continue;
    const onset = parseFloat(timing.split("\x15")[0]);
    if (Number.isNaN(onset)) continue;
    for (let k = 1; k < segments.length; k++) {
      const label = segments[k];
      if (label && label.length) events.push({ time: onset, label });
    }
  }
  return events;
}

// --- byte helpers --------------------------------------------------------

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
  const v = view.getUint8(pos) | (view.getUint8(pos + 1) << 8) | (view.getUint8(pos + 2) << 16);
  return v & 0x800000 ? v - 0x1000000 : v;
}
function modeOf(arr) {
  const counts = new Map();
  let best = arr[0], bestN = 0;
  for (const v of arr) {
    const c = (counts.get(v) || 0) + 1;
    counts.set(v, c);
    if (c > bestN) { bestN = c; best = v; }
  }
  return best;
}
