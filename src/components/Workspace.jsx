import { useRef, useState, useEffect, useMemo } from "react";
import EEGTraceView from "./EEGTraceView.jsx";
import BrainView3D from "./BrainView3D.jsx";
import Timeline from "./Timeline.jsx";
import PipelinePanel from "./PipelinePanel.jsx";
import { usePlayback } from "../hooks/usePlayback.js";
import { assignMarkerColors } from "../lib/markers.js";
import { generateSimulatedRecording } from "../lib/eegData.js";
import { applyPipeline } from "../lib/dsp.js";
import { defaultPipeline } from "../lib/pipeline.js";
import { CHANNEL_NAMES } from "../lib/montage.js";
import { loadFile } from "../lib/formats.js";
import { putFile, getFile } from "../lib/idb.js";
import { saveProject, newParticipantId } from "../lib/store.js";

const HEADSET = new Set(CHANNEL_NAMES);
const SUPPORTED = [".edf", ".bdf", ".fif", ".csv"];

export default function Workspace({ user, project: initialProject, onBack, onLogout }) {
  const [project, setProject] = useState(() => {
    if (!initialProject.pipeline) {
      const p = { ...initialProject, pipeline: defaultPipeline() };
      saveProject(user, p);
      return p;
    }
    return initialProject;
  });

  const [selectedId, setSelectedId] = useState(null);
  const [raw, setRaw] = useState(null);
  const [filtered, setFiltered] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scope, setScope] = useState("project"); // "project" | "participant"
  const [error, setError] = useState(null);

  const [gain, setGain] = useState(50);
  const [windowSeconds, setWindowSeconds] = useState(8);
  const [colorRange, setColorRange] = useState(40);

  const durationRef = useRef(0);
  const { playheadRef, isPlaying, setIsPlaying, toggle, speed, setSpeed, seek } =
    usePlayback(durationRef);

  const selected = project.participants.find((p) => p.id === selectedId) || null;

  // the pipeline applied to the viewed participant: their override wins
  const effectivePipeline = (selected && selected.pipeline) || project.pipeline;
  // the pipeline currently being edited, per the scope toggle
  const editingPipeline =
    scope === "participant"
      ? (selected && selected.pipeline) || project.pipeline
      : project.pipeline;

  const persist = (next) => { setProject(next); saveProject(user, next); };

  const onChangePipeline = (nextSteps) => {
    if (scope === "participant" && selected) {
      persist({
        ...project,
        participants: project.participants.map((p) =>
          p.id === selected.id ? { ...p, pipeline: nextSteps } : p
        ),
      });
    } else {
      persist({ ...project, pipeline: nextSteps });
    }
  };

  const resetParticipantOverride = () => {
    if (!selected) return;
    persist({
      ...project,
      participants: project.participants.map((p) =>
        p.id === selected.id ? { ...p, pipeline: null } : p
      ),
    });
  };

  // --- import -------------------------------------------------------------
  const fileInput = useRef(null);
  const folderInput = useRef(null);

  const importFiles = async (fileList) => {
    const files = [...fileList].filter((f) =>
      SUPPORTED.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (!files.length) {
      setError("No supported files (.edf .bdf .fif .csv) in that selection.");
      return;
    }
    const added = [];
    for (const f of files) {
      const id = newParticipantId();
      const blobKey = `${project.id}:${id}`;
      await putFile(blobKey, f);
      added.push({ id, name: f.name, fileName: f.name, blobKey, pipeline: null });
    }
    persist({ ...project, participants: [...project.participants, ...added] });
    setError(null);
  };

  // --- select participant -------------------------------------------------
  const selectParticipant = async (p) => {
    setSelectedId(p.id);
    setRaw(null);
    setFiltered(null);
    setIsPlaying(false);
    setLoading(true);
    setError(null);
    try {
      if (p.simulated) {
        setRaw(generateSimulatedRecording());
        return;
      }
      const blob = await getFile(p.blobKey);
      if (!blob) throw new Error("File not in browser cache. Re-import it.");
      const file = new File([blob], p.fileName);
      const rec = await loadFile(file, {
        sfreq: 256,
        ignoreColumns: ["timestamp", "time", "index", "sample", "marker"],
      });
      setRaw(rec);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // --- apply pipeline (off the render path) -------------------------------
  useEffect(() => {
    if (!raw) { setFiltered(null); return; }
    setProcessing(true);
    const handle = setTimeout(() => {
      const out = applyPipeline(raw, effectivePipeline);
      setFiltered(out);
      durationRef.current = out.duration;
      playheadRef.current = 0;
      setProcessing(false);
    }, 10);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, JSON.stringify(effectivePipeline)]);

  // spacebar play/pause
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== "Space") return;
      const t = e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT" || e.target.isContentEditable) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  // derived view data
  const { headsetIndices, extraChannels, markers, legend } = useMemo(() => {
    if (!filtered) return { headsetIndices: [], extraChannels: [], markers: [], legend: [] };
    const headsetIndices = [];
    const extraChannels = [];
    filtered.channelNames.forEach((name, i) => {
      if (HEADSET.has(name)) headsetIndices.push(i);
      else extraChannels.push(name);
    });
    const { markers, legend } = assignMarkerColors(filtered.markers || []);
    return { headsetIndices, extraChannels, markers, legend };
  }, [filtered]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ink-900 text-bone-100">
      {/* sidebar */}
      <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-r border-ink-700 bg-ink-850 p-5">
        <div className="flex items-start justify-between">
          <div>
            <button onClick={onBack} className="font-mono text-[10px] text-bone-500 hover:text-bone-300">
              ← projects
            </button>
            <h1 className="font-display text-base font-semibold tracking-tight text-bone-100">
              {project.name}
            </h1>
          </div>
          <button onClick={onLogout} className="font-mono text-[10px] text-bone-500 hover:text-bone-300">
            log out
          </button>
        </div>

        {/* participants */}
        <section className="space-y-2">
          <SectionLabel>participants</SectionLabel>
          {project.participants.length === 0 ? (
            <p className="font-mono text-[10px] text-bone-500">none yet. import data below.</p>
          ) : (
            <ul className="space-y-1">
              {project.participants.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => selectParticipant(p)}
                    className={`flex w-full items-center justify-between rounded border px-2 py-1.5 text-left font-mono text-[11px] transition ${
                      selectedId === p.id
                        ? "border-bone-500 bg-ink-800 text-bone-100"
                        : "border-ink-700 text-bone-300 hover:border-ink-500"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {p.pipeline && <span className="ml-2 shrink-0 text-bone-500" title="has its own pipeline">override</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-1">
            <button
              onClick={() => fileInput.current?.click()}
              className="flex-1 rounded border border-ink-600 py-1 font-mono text-[11px] text-bone-300 transition hover:border-bone-500 hover:text-bone-100"
            >
              + files
            </button>
            <button
              onClick={() => folderInput.current?.click()}
              className="flex-1 rounded border border-ink-600 py-1 font-mono text-[11px] text-bone-300 transition hover:border-bone-500 hover:text-bone-100"
            >
              + folder
            </button>
          </div>
          <input ref={fileInput} type="file" accept=".edf,.bdf,.fif,.csv" multiple hidden
            onChange={(e) => importFiles(e.target.files)} />
          <input ref={folderInput} type="file" webkitdirectory="" directory="" multiple hidden
            onChange={(e) => importFiles(e.target.files)} />
          <button
            onClick={() => {
              const id = newParticipantId();
              persist({ ...project, participants: [...project.participants, { id, name: "Simulated 64-ch", simulated: true, pipeline: null }] });
            }}
            className="w-full rounded border border-dashed border-ink-600 py-1 font-mono text-[10px] text-bone-500 transition hover:border-ink-500 hover:text-bone-300"
          >
            + simulated (for testing)
          </button>
        </section>

        {/* preprocessing */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <SectionLabel>preprocessing</SectionLabel>
          </div>
          <div className="flex gap-1">
            <ScopeBtn active={scope === "project"} onClick={() => setScope("project")}>project (all)</ScopeBtn>
            <ScopeBtn active={scope === "participant"} onClick={() => setScope("participant")} disabled={!selected}>
              this participant
            </ScopeBtn>
          </div>
          {scope === "participant" && selected?.pipeline && (
            <button onClick={resetParticipantOverride} className="font-mono text-[10px] text-bone-500 hover:text-bone-300">
              reset to project pipeline
            </button>
          )}
          <PipelinePanel pipeline={editingPipeline} onChange={onChangePipeline} processing={processing} />
        </section>

        {/* signal controls */}
        <section className="space-y-3">
          <SectionLabel>signal</SectionLabel>
          <Slider label="gain" value={gain} min={5} max={250} step={5} unit=" µV" onChange={setGain} />
          <Slider label="window" value={windowSeconds} min={1} max={30} step={1} unit=" s" onChange={setWindowSeconds} />
          <Slider label="color range" value={colorRange} min={10} max={120} step={5} unit=" µV" onChange={setColorRange} />
        </section>

        {/* channels + markers (only when viewing) */}
        {filtered && (
          <>
            <section className="space-y-2">
              <SectionLabel>channels</SectionLabel>
              <dl className="space-y-1 font-mono text-xs text-bone-300">
                <Row k="headset (shown)" v={headsetIndices.length} />
                <Row k="extra (hidden)" v={extraChannels.length} />
              </dl>
              {extraChannels.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {extraChannels.map((n) => (
                    <span key={n} className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[10px] text-bone-500">{n}</span>
                  ))}
                </div>
              )}
            </section>
            <section className="space-y-2">
              <SectionLabel>markers</SectionLabel>
              {legend.length ? (
                <ul className="space-y-1">
                  {legend.map((m) => (
                    <li key={m.label} className="flex items-center gap-2 font-mono text-xs">
                      <span className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: m.color }} />
                      <span className="flex-1 truncate text-bone-300">{m.label}</span>
                      <span className="text-bone-500">{m.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-mono text-xs text-bone-500">no markers</p>
              )}
            </section>
          </>
        )}

        {error && (
          <p className="rounded border border-[#c4565640] bg-[#c4565610] px-2 py-1 font-mono text-[11px] text-[#d98a8a]">{error}</p>
        )}

        <section className="mt-auto space-y-2 border-t border-ink-700 pt-4">
          <SectionLabel>shortcuts</SectionLabel>
          <p className="font-mono text-[10px] leading-relaxed text-bone-500">
            space = play/pause · scroll = zoom time · shift+scroll = gain ·
            drag traces = scrub · drag head = rotate
          </p>
        </section>
      </aside>

      {/* main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {!selected ? (
          <Placeholder hasParticipants={project.participants.length > 0} />
        ) : loading ? (
          <Centered>loading {selected.name}…</Centered>
        ) : !filtered ? (
          <Centered>{processing ? "filtering…" : "preparing…"}</Centered>
        ) : (
          <>
            <div className="flex min-h-0 flex-1">
              <section className="min-w-0 flex-1 border-r border-ink-700">
                <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-bone-500">
                    {selected.name}
                  </span>
                  <span className="font-mono text-[10px] text-bone-500">
                    {headsetIndices.length} traces · {processing ? "filtering…" : "filtered"}
                  </span>
                </div>
                <div className="h-[calc(100%-33px)]">
                  <EEGTraceView
                    recording={filtered}
                    playheadRef={playheadRef}
                    gain={gain}
                    windowSeconds={windowSeconds}
                    channelIndices={headsetIndices}
                    markers={markers}
                    setGain={setGain}
                    setWindowSeconds={setWindowSeconds}
                    seek={seek}
                  />
                </div>
              </section>
              <section className="w-[42%] min-w-[320px] max-w-[560px]">
                <BrainView3D recording={filtered} playheadRef={playheadRef} colorRange={colorRange} />
              </section>
            </div>
            <Timeline
              duration={durationRef.current}
              playheadRef={playheadRef}
              isPlaying={isPlaying}
              toggle={toggle}
              speed={speed}
              setSpeed={setSpeed}
              seek={seek}
              markers={markers}
            />
          </>
        )}
      </main>
    </div>
  );
}

function Placeholder({ hasParticipants }) {
  return (
    <Centered>
      {hasParticipants ? "select a participant on the left" : "import data on the left to begin"}
    </Centered>
  );
}
function Centered({ children }) {
  return (
    <div className="flex h-full items-center justify-center font-mono text-sm text-bone-500">
      {children}
    </div>
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
function ScopeBtn({ active, onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded px-2 py-1 font-mono text-[10px] transition ${
        active ? "bg-bone-100 text-ink-900" : "text-bone-500 hover:text-bone-300"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {children}
    </button>
  );
}
function Slider({ label, value, min, max, step, onChange, unit }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-widest text-bone-500">{label}</label>
        <span className="font-mono text-xs text-bone-300">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
