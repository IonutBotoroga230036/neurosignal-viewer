// Preprocessing step definitions for the BrainVision-Analyzer-style operation
// list. Each step has a type, an enabled flag, and params. The PipelinePanel
// renders/edits these; dsp.applyPipeline() runs them in order.

let idCounter = 0;
const uid = () => `step_${Date.now()}_${idCounter++}`;

export const STEP_TYPES = {
  demean: { label: "DC offset removal", params: [] },
  detrend: { label: "Linear detrend", params: [] },
  highpass: {
    label: "High-pass filter",
    params: [{ key: "freq", label: "Hz", default: 1, min: 0.1, max: 40, step: 0.1 }],
  },
  lowpass: {
    label: "Low-pass filter",
    params: [{ key: "freq", label: "Hz", default: 40, min: 1, max: 200, step: 1 }],
  },
  notch: {
    label: "Notch (line noise)",
    params: [{ key: "freq", label: "Hz", default: 50, min: 1, max: 100, step: 1 }],
  },
  car: { label: "Common average reference", params: [] },
};

export function makeStep(type) {
  const def = STEP_TYPES[type];
  const params = {};
  for (const p of def.params) params[p.key] = p.default;
  return { id: uid(), type, enabled: true, params };
}

// A reasonable default for raw EEG: kill DC + drift, remove line noise, band-limit.
export function defaultPipeline() {
  return [
    makeStep("highpass"),
    makeStep("notch"),
    makeStep("lowpass"),
  ];
}
