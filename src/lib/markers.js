// Marker color assignment.
//
// Markers arrive from a recording with a `label` (a trigger code or an
// annotation string). Here we give every distinct label a stable color so
// events of the same type read the same everywhere (timeline + traces).
//
// The palette lives here for now; the future settings panel will let users
// override it by passing their own palette into assignMarkerColors().

export const DEFAULT_MARKER_PALETTE = [
  "#e0a458", // amber
  "#6cb4c4", // teal
  "#c4849b", // mauve
  "#8fb573", // sage
  "#a88fc4", // lavender
  "#d4756b", // terracotta
  "#7c9fd4", // slate blue
  "#c4b46c", // gold
  "#6cc49a", // mint
  "#b06cc4", // violet
];

export function assignMarkerColors(markers, palette = DEFAULT_MARKER_PALETTE) {
  const colorByLabel = new Map();
  let next = 0;

  const colored = markers.map((m) => {
    const label = String(m.label ?? "event");
    if (!colorByLabel.has(label)) {
      colorByLabel.set(label, palette[next % palette.length]);
      next += 1;
    }
    return { ...m, label, color: colorByLabel.get(label) };
  });

  const legend = [...colorByLabel.entries()].map(([label, color]) => {
    const count = colored.filter((m) => m.label === label).length;
    return { label, color, count };
  });

  return { markers: colored, legend };
}
