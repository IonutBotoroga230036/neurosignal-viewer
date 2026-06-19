# NeuroSignal Viewer

A browser EEG visualizer: a scrolling 64-channel trace view (ActiView style) on
the left, a 3D electrode topography on the right, and a shared transport bar that
scrubs both at once. Loads a simulated recording on first run so you can see it
work immediately, and reads generic EEG CSV files for your own data.

This is the visual front end for the NeuroSignal platform. It runs fully offline
against local files today, and is structured to later call the NeuroSignal API
(`/v1/preprocess`) so you can compare raw vs cleaned signal side by side.

## Run it

You need Node 18+ (you have it if `node --version` prints v18 or higher).

```bash
npm install
npm run dev
```

That opens http://localhost:5173. You should see 64 traces scrolling and the
electrode spheres on the 3D head pulsing with the signal. Drag the head to
rotate, scroll to zoom, drag the timeline to scrub, press play.

```bash
npm run build      # production bundle into dist/
npm run preview     # serve the built bundle
```

## How it's wired

The playhead (current time, in seconds) lives in a single ref, not React state.
The trace canvas and the 3D view each read it every frame in their own loops, so
playback stays at 60fps without re-rendering React 64 times a second. Only coarse
controls (gain, window, play/pause, the loaded recording) go through React state.

```
src/
  lib/
    montage.js     real BioSemi-64 electrode coordinates (10-10 system)
    eegData.js     Recording shape, simulated generator, amplitude→color
    formats.js     detect format → route to a loader (the registry)
    csvParser.js   CSV → Recording
    edf.js         EDF/BDF binary reader → Recording
    fif.js         FIF loader (routes to the API)
  hooks/
    usePlayback.js the rAF playhead loop
  components/
    EEGTraceView.jsx   2D scrolling traces (Canvas)
    BrainView3D.jsx    3D topography (react-three-fiber)
    Timeline.jsx       transport + scrubber + markers
    Sidebar.jsx        controls + data loading
    FileLoader.jsx     drop zone
  App.jsx          layout + state
```

The whole UI consumes one data shape, the Recording (see `eegData.js`). Anything
that can produce that shape (the simulator, the CSV parser, later an API
response) plugs straight in.

## Loading your own data

Drop a file in the sidebar. The format is detected from the extension (with a
magic-byte fallback) and routed to the right loader:

- `.edf` / `.bdf` parse directly in the browser, no server needed. BioSemi BDF
  (what ActiView exports) works, and non-signal channels like Status are dropped
  automatically.
- `.fif` is read server-side via MNE. The loader is stubbed with the fetch ready
  to uncomment once your NeuroSignal endpoint returns the Recording shape.
- `.csv` needs the sampling rate (the field in the sidebar), since a plain CSV
  can't carry it. First row is channel names, one row per sample, values in µV.

Channels whose names match the 10-10 montage (Fp1, Cz, O2, ...) light up on the
3D head; unknown names still show in the trace view. The sidebar shows how many
of your channels were mapped to positions.

Adding a format later is one line. Write an `async (file, options) => Recording`
loader and register it:

```js
import { registerLoader } from "./lib/formats.js";
registerLoader("gdf", loadGDF);
```

## Where this goes next

- Wire the sidebar's load flow to your NeuroSignal `/v1/preprocess` endpoint.
- Add `.edf` / `.bdf` / `.fif` reading (do it server-side via MNE and return the
  Recording shape as JSON; the browser stays format-agnostic).
- The head is a procedural ellipsoid (nose + ears for orientation), so there's
  no external asset to load. Drop in a real GLTF head or cortical mesh later by
  replacing `Head()` in BrainView3D.jsx; keep electrode placement going through
  `onScalp()` so the sensors stay on whatever surface you use.
- Topographic surface interpolation between electrodes (right now color lives on
  the electrodes themselves, which is honest and fast).
