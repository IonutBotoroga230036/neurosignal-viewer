import FileLoader from "./FileLoader.jsx";
import { CHANNEL_NAMES } from "../lib/montage.js";

const MONTAGE_NAMES = new Set(CHANNEL_NAMES);

function Slider({ label, value, min, max, step, onChange, unit }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-widest text-bone-500">
          {label}
        </label>
        <span className="font-mono text-xs text-bone-300">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

export default function Sidebar({
  recording,
  gain,
  setGain,
  windowSeconds,
  setWindowSeconds,
  colorRange,
  setColorRange,
  onLoadSimulated,
  onLoad,
  onError,
  error,
}) {
  const withPos = recording
    ? recording.channelNames.filter((n) => MONTAGE_NAMES.has(n)).length
    : 0;

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 overflow-y-auto border-r border-ink-700 bg-ink-850 p-5">
      <div>
        <h1 className="font-display text-lg font-semibold tracking-tight text-bone-100">
          NeuroSignal
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-bone-500">
          viewer · v0.1
        </p>
      </div>

      <section className="space-y-3">
        <SectionLabel>signal</SectionLabel>
        <Slider
          label="gain"
          value={gain}
          min={5}
          max={1000}
          step={5}
          unit=" µV"
          onChange={setGain}
        />
        <Slider
          label="window"
          value={windowSeconds}
          min={2}
          max={30}
          step={1}
          unit=" s"
          onChange={setWindowSeconds}
        />
        <Slider
          label="color range"
          value={colorRange}
          min={10}
          max={120}
          step={5}
          unit=" µV"
          onChange={setColorRange}
        />
      </section>

      <section className="space-y-3">
        <SectionLabel>recording</SectionLabel>
        {recording ? (
          <dl className="space-y-1 font-mono text-xs text-bone-300">
            <Row k="name" v={truncate(recording.name, 22)} />
            <Row k="channels" v={recording.channelNames.length} />
            <Row k="mapped" v={`${withPos} / ${recording.channelNames.length}`} />
            <Row k="rate" v={`${recording.sfreq} Hz`} />
            <Row k="length" v={`${recording.duration.toFixed(1)} s`} />
          </dl>
        ) : (
          <p className="font-mono text-xs text-bone-500">no recording</p>
        )}
        <button
          onClick={onLoadSimulated}
          className="w-full rounded border border-ink-600 py-1.5 font-mono text-xs text-bone-300 transition hover:border-bone-500 hover:text-bone-100"
        >
          load simulated 64-ch
        </button>
      </section>

      <section className="space-y-3">
        <SectionLabel>load your data</SectionLabel>
        <FileLoader onLoad={onLoad} onError={onError} />
        {error && (
          <p className="rounded border border-[#c4565640] bg-[#c4565610] px-2 py-1 font-mono text-[11px] text-[#d98a8a]">
            {error}
          </p>
        )}
      </section>

      <section className="mt-auto space-y-2 border-t border-ink-700 pt-4">
        <SectionLabel>next</SectionLabel>
        <p className="font-mono text-[10px] leading-relaxed text-bone-500">
          point this at your NeuroSignal API: POST a file to /v1/preprocess,
          poll the job, then load the cleaned result here to compare raw vs
          clean.
        </p>
      </section>
    </aside>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="border-b border-ink-700 pb-1 font-mono text-[10px] uppercase tracking-widest text-bone-500">
      {children}
    </h2>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <dt className="text-bone-500">{k}</dt>
      <dd className="text-bone-100">{v}</dd>
    </div>
  );
}

function truncate(s, n) {
  return s && s.length > n ? s.slice(0, n - 1) + "…" : s;
}
