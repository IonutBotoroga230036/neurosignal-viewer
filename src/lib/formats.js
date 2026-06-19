// Format detection + dispatch.
//
// Mirrors the loaders dict in the backend's formats.py: detect the format from
// the extension (falling back to magic bytes), then route to the registered
// loader. Every loader is `async (file, options) => Recording`, so the rest of
// the app never has to know which format it's looking at.
//
// Adding a new format later is one line: write a loader, register it.
//   registerLoader("gdf", loadGDF);

import { parseCSV } from "./csvParser.js";
import { parseEDF } from "./edf.js";
import { loadFIF } from "./fif.js";

// --- loaders -------------------------------------------------------------

async function loadCSV(file, options) {
  return parseCSV(file, options);
}

async function loadEDFBDF(file) {
  const buffer = await file.arrayBuffer();
  return parseEDF(buffer, file.name);
}

// --- registry ------------------------------------------------------------

const LOADERS = {
  csv: loadCSV,
  edf: loadEDFBDF,
  bdf: loadEDFBDF,
  fif: loadFIF,
};

export function registerLoader(ext, loader) {
  LOADERS[ext.toLowerCase()] = loader;
}

export const SUPPORTED_EXTENSIONS = () => Object.keys(LOADERS);

// --- detection -----------------------------------------------------------

const MAGIC = [
  { match: (b) => b[0] === 0xff, format: "bdf" }, // BioSemi BDF
  {
    match: (b) =>
      String.fromCharCode(...b.slice(0, 8)) === "0       ",
    format: "edf",
  },
];

export async function detectFormat(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (LOADERS[ext]) return ext;

  // unknown extension: sniff the first 8 bytes
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  for (const { match, format } of MAGIC) {
    if (match(head)) return format;
  }
  throw new Error(
    `Unrecognized format ".${ext}". Supported: ${SUPPORTED_EXTENSIONS().join(", ")}.`
  );
}

// --- the one function the UI calls --------------------------------------

export async function loadFile(file, options = {}) {
  const format = await detectFormat(file);
  const loader = LOADERS[format];
  if (!loader) throw new Error(`No loader registered for "${format}".`);
  return loader(file, { ...options, format });
}
