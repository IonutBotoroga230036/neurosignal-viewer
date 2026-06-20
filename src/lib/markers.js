// Marker color assignment + visibility.
//
// Every distinct event label gets a stable color so the same event type reads
// the same everywhere. The settings panel can override a label's color and hide
// labels entirely (e.g. show only triggers 1-6). Overrides/hidden come from the
// per-user settings; the default palette is the fallback.

export const DEFAULT_MARKER_PALETTE = [
  "#e0a458", "#6cb4c4", "#c4849b", "#8fb573", "#a88fc4",
  "#d4756b", "#7c9fd4", "#c4b46c", "#6cc49a", "#b06cc4",
];

// returns { markers (colored, visible-only), legend (ALL labels w/ hidden flag) }
export function assignMarkerColors(markers, {
  palette = DEFAULT_MARKER_PALETTE,
  overrides = {},
  hidden = [],
} = {}) {
  const hiddenSet = new Set(hidden);
  const colorByLabel = new Map();
  let next = 0;

  const colorFor = (label) => {
    if (overrides[label]) return overrides[label];
    if (!colorByLabel.has(label)) {
      colorByLabel.set(label, palette[next % palette.length]);
      next += 1;
    }
    return colorByLabel.get(label);
  };

  const all = markers.map((m) => {
    const label = String(m.label ?? "event");
    return { ...m, label, color: colorFor(label) };
  });

  const legendMap = new Map();
  for (const m of all) {
    if (!legendMap.has(m.label)) {
      legendMap.set(m.label, { label: m.label, color: m.color, count: 0, hidden: hiddenSet.has(m.label) });
    }
    legendMap.get(m.label).count += 1;
  }

  return {
    markers: all.filter((m) => !hiddenSet.has(m.label)),
    legend: [...legendMap.values()],
  };
}
