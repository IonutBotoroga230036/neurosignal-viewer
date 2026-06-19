// Parse a generic EEG CSV into a Recording.
//
// Expected shape (the common OpenBCI / generic export form):
//   - first row = header with channel names
//   - each subsequent row = one sample, one column per channel
//   - values in microvolts
//
// Sampling frequency cannot be inferred from a plain CSV, so the caller must
// pass it in (the UI asks for it on upload). Columns whose names are not real
// electrodes (e.g. "timestamp", "index") are dropped automatically if you list
// them in `ignoreColumns`.

import Papa from "papaparse";
import { POSITION_BY_NAME } from "./montage.js";

export function parseCSV(file, { sfreq, ignoreColumns = [] } = {}) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          resolve(buildRecording(results, file.name, sfreq, ignoreColumns));
        } catch (err) {
          reject(err);
        }
      },
      error: reject,
    });
  });
}

function buildRecording(results, fileName, sfreq, ignoreColumns) {
  const rows = results.data;
  if (!rows.length) throw new Error("CSV is empty.");

  const ignore = new Set(ignoreColumns.map((c) => c.toLowerCase()));
  const allColumns = results.meta.fields || Object.keys(rows[0]);
  const channelNames = allColumns.filter(
    (c) => c && !ignore.has(String(c).toLowerCase())
  );

  if (!channelNames.length) {
    throw new Error("No channel columns found after filtering.");
  }

  const T = rows.length;
  const data = channelNames.map(() => new Float32Array(T));

  for (let i = 0; i < T; i++) {
    const row = rows[i];
    for (let c = 0; c < channelNames.length; c++) {
      const v = row[channelNames[c]];
      data[c][i] = typeof v === "number" && Number.isFinite(v) ? v : 0;
    }
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
