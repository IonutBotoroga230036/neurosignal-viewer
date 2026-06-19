import { useState } from "react";
import { STEP_TYPES, makeStep } from "../lib/pipeline.js";

export default function PipelinePanel({ pipeline, onChange, processing }) {
  const [adding, setAdding] = useState(false);

  const update = (next) => onChange(next);
  const toggle = (i) =>
    update(pipeline.map((s, k) => (k === i ? { ...s, enabled: !s.enabled } : s)));
  const remove = (i) => update(pipeline.filter((_, k) => k !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= pipeline.length) return;
    const next = [...pipeline];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const setParam = (i, key, value) =>
    update(
      pipeline.map((s, k) =>
        k === i ? { ...s, params: { ...s.params, [key]: Number(value) } } : s
      )
    );
  const add = (type) => {
    update([...pipeline, makeStep(type)]);
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      {pipeline.length === 0 && (
        <p className="font-mono text-[10px] text-bone-500">
          no steps. raw data shown as-is (expect large DC offsets).
        </p>
      )}

      <ol className="space-y-1.5">
        {pipeline.map((step, i) => {
          const def = STEP_TYPES[step.type];
          return (
            <li
              key={step.id}
              className={`rounded border px-2 py-1.5 ${
                step.enabled ? "border-ink-600 bg-ink-800" : "border-ink-700 bg-transparent opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggle(i)}
                  className={`h-3 w-3 shrink-0 rounded-sm border ${
                    step.enabled ? "border-bone-100 bg-bone-100" : "border-ink-500"
                  }`}
                  title={step.enabled ? "disable" : "enable"}
                />
                <span className="flex-1 font-mono text-[11px] text-bone-200">
                  {def.label}
                </span>
                <button onClick={() => move(i, -1)} className="px-1 font-mono text-[11px] text-bone-500 hover:text-bone-100" title="move up">↑</button>
                <button onClick={() => move(i, 1)} className="px-1 font-mono text-[11px] text-bone-500 hover:text-bone-100" title="move down">↓</button>
                <button onClick={() => remove(i)} className="px-1 font-mono text-[11px] text-bone-500 hover:text-[#d98a8a]" title="remove">✕</button>
              </div>
              {def.params.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-2 pl-5">
                  {def.params.map((p) => (
                    <label key={p.key} className="flex items-center gap-1 font-mono text-[10px] text-bone-500">
                      <input
                        type="number"
                        value={step.params[p.key]}
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        onChange={(e) => setParam(i, p.key, e.target.value)}
                        className="w-14 rounded border border-ink-600 bg-ink-900 px-1 py-0.5 text-bone-100 focus:border-bone-500 focus:outline-none"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {adding ? (
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(STEP_TYPES).map(([type, def]) => (
            <button
              key={type}
              onClick={() => add(type)}
              className="rounded border border-ink-600 px-1.5 py-1 font-mono text-[10px] text-bone-300 transition hover:border-bone-500 hover:text-bone-100"
            >
              {def.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded border border-dashed border-ink-600 py-1 font-mono text-[11px] text-bone-500 transition hover:border-ink-500 hover:text-bone-300"
        >
          + add step
        </button>
      )}

      {processing && (
        <p className="font-mono text-[10px] text-bone-500">filtering…</p>
      )}
    </div>
  );
}
