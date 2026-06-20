// Per-user display settings, persisted in localStorage. These are preferences,
// not data: the settings panel reads and writes this, and the views consume it.
// Kept separate from montage.js (positions are ground truth, never a setting).

import { DEFAULT_BANDS } from "./bands.js";

const key = (user) => `ns_settings_${user}`;

export function defaultSettings() {
  return {
    colorMode: "amplitude",          // "amplitude" | "band"
    bands: DEFAULT_BANDS.map((b) => ({ ...b })),
    markerColors: {},                // label -> hex override
    hiddenMarkers: [],               // labels to hide everywhere
    markerFontSize: 9,               // px, trace event labels
  };
}

export function loadSettings(user) {
  try {
    const raw = localStorage.getItem(key(user));
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(user, settings) {
  localStorage.setItem(key(user), JSON.stringify(settings));
}
