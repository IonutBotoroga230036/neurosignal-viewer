// Settings drawer. Edits the per-user settings object and reports changes up
// via onChange. Covers the topography color mode + band colors/ranges, and
// marker colors / visibility / label size.

export default function SettingsPanel({ settings, onChange, markerLabels = [], onClose }) {
  const set = (patch) => onChange({ ...settings, ...patch });

  const setBand = (i, patch) =>
    set({ bands: settings.bands.map((b, k) => (k === i ? { ...b, ...patch } : b)) });

  const setMarkerColor = (label, color) =>
    set({ markerColors: { ...settings.markerColors, [label]: color } });

  const toggleMarker = (label) => {
    const hidden = new Set(settings.hiddenMarkers);
    hidden.has(label) ? hidden.delete(label) : hidden.add(label);
    set({ hiddenMarkers: [...hidden] });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-full w-[380px] flex-col gap-6 overflow-y-auto border-l border-ink-700 bg-ink-850 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold tracking-tight text-bone-100">Settings</h2>
          <button onClick={onClose} className="font-mono text-xs text-bone-500 hover:text-bone-100">close ✕</button>
        </div>

        {/* topography color mode */}
        <section className="space-y-3">
          <Label>topography color</Label>
          <div className="flex gap-1">
            <Seg active={settings.colorMode === "amplitude"} onClick={() => set({ colorMode: "amplitude" })}>amplitude</Seg>
            <Seg active={settings.colorMode === "band"} onClick={() => set({ colorMode: "band" })}>frequency band</Seg>
          </div>
          {settings.colorMode === "amplitude" && (
            <p className="font-mono text-[10px] text-bone-500">
              electrodes colored by live signal amplitude (blue ↔ bone ↔ red).
            </p>
          )}
          {settings.colorMode === "band" && (
            <div className="space-y-2">
              <p className="font-mono text-[10px] text-bone-500">
                each electrode takes the flat color of its dominant enabled band.
                disable a band to ignore it (useful for delta, which dominates).
              </p>
              <ul className="space-y-1.5">
                {settings.bands.map((b, i) => (
                  <li key={b.name} className="flex items-center gap-2">
                    <button
                      onClick={() => setBand(i, { enabled: !b.enabled })}
                      className={`h-3 w-3 shrink-0 rounded-sm border ${b.enabled ? "border-bone-100 bg-bone-100" : "border-ink-500"}`}
                      title={b.enabled ? "disable" : "enable"}
                    />
                    <input type="color" value={b.color} onChange={(e) => setBand(i, { color: e.target.value })}
                      className="h-5 w-5 shrink-0 cursor-pointer rounded border border-ink-600 bg-transparent" />
                    <span className="w-12 font-mono text-[11px] text-bone-200">{b.name}</span>
                    <input type="number" value={b.lo} step="0.5" onChange={(e) => setBand(i, { lo: Number(e.target.value) })}
                      className="w-12 rounded border border-ink-600 bg-ink-900 px-1 py-0.5 font-mono text-[10px] text-bone-100" />
                    <span className="font-mono text-[10px] text-bone-500">–</span>
                    <input type="number" value={b.hi} step="0.5" onChange={(e) => setBand(i, { hi: Number(e.target.value) })}
                      className="w-12 rounded border border-ink-600 bg-ink-900 px-1 py-0.5 font-mono text-[10px] text-bone-100" />
                    <span className="font-mono text-[10px] text-bone-500">Hz</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* markers */}
        <section className="space-y-3">
          <Label>markers</Label>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-bone-500">label size</span>
            <span className="font-mono text-xs text-bone-300">{settings.markerFontSize} px</span>
          </div>
          <input type="range" min={7} max={20} step={1} value={settings.markerFontSize}
            onChange={(e) => set({ markerFontSize: Number(e.target.value) })} className="w-full" />

          {markerLabels.length === 0 ? (
            <p className="font-mono text-[10px] text-bone-500">load a recording to edit its markers.</p>
          ) : (
            <ul className="space-y-1.5">
              {markerLabels.map((label) => {
                const hidden = settings.hiddenMarkers.includes(label);
                const color = settings.markerColors[label];
                return (
                  <li key={label} className="flex items-center gap-2">
                    <button onClick={() => toggleMarker(label)}
                      className={`h-3 w-3 shrink-0 rounded-sm border ${hidden ? "border-ink-500" : "border-bone-100 bg-bone-100"}`}
                      title={hidden ? "show" : "hide"} />
                    <input type="color" value={color || "#e0a458"} onChange={(e) => setMarkerColor(label, e.target.value)}
                      className="h-5 w-5 shrink-0 cursor-pointer rounded border border-ink-600 bg-transparent" />
                    <span className={`flex-1 truncate font-mono text-[11px] ${hidden ? "text-bone-500 line-through" : "text-bone-200"}`}>{label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <h3 className="border-b border-ink-700 pb-1 font-mono text-[10px] uppercase tracking-widest text-bone-500">{children}</h3>;
}
function Seg({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex-1 rounded px-2 py-1 font-mono text-[10px] transition ${active ? "bg-bone-100 text-ink-900" : "text-bone-500 hover:text-bone-300"}`}>
      {children}
    </button>
  );
}
