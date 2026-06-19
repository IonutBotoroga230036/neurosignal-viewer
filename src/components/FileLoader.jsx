import { useRef, useState } from "react";
import { loadFile } from "../lib/formats.js";

export default function FileLoader({ onLoad, onError }) {
  const inputRef = useRef(null);
  const [sfreq, setSfreq] = useState(256);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      // sfreq is only used by the CSV loader; binary loaders read it from the file
      const recording = await loadFile(file, {
        sfreq: Number(sfreq),
        ignoreColumns: ["timestamp", "time", "index", "sample", "marker"],
      });
      onLoad(recording);
    } catch (err) {
      onError?.(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block font-mono text-[10px] uppercase tracking-widest text-bone-500">
        sampling rate · CSV only (Hz)
      </label>
      <input
        type="number"
        value={sfreq}
        onChange={(e) => setSfreq(e.target.value)}
        className="w-full rounded border border-ink-600 bg-ink-900 px-2 py-1 font-mono text-sm text-bone-100 focus:border-bone-500 focus:outline-none"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded border border-dashed px-3 py-6 text-center text-xs transition ${
          dragOver
            ? "border-bone-300 bg-ink-800 text-bone-100"
            : "border-ink-600 text-bone-500 hover:border-ink-500"
        }`}
      >
        {busy ? "reading…" : "drop a file, or click to choose"}
        <input
          ref={inputRef}
          type="file"
          accept=".edf,.bdf,.fif,.csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-bone-500">
        .edf and .bdf read directly · .fif via the API · .csv needs the rate above
      </p>
    </div>
  );
}
