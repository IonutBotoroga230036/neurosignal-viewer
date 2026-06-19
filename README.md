# NeuroSignal Viewer

A browser EEG workstation. You sign in, organise recordings into projects,
import participant files, and inspect each recording as a scrolling multi-channel
trace view alongside a live 3D scalp topography. A non-destructive preprocessing
pipeline (DC removal, filters, re-referencing) is applied at view time and can be
toggled, reordered, and scoped to one participant or the whole project, the way
BrainVision Analyzer treats its operation list.

This is the front end for the NeuroSignal platform. It runs fully in the browser
today and is structured so the heavy and sensitive parts (real auth, batch
processing, format reading like FIF) move to your backend later without the UI
changing.

## Run it

Node 18+ required (`node --version`). From the project folder:

```bash
npm install
npm run dev      # opens http://localhost:5173
```

Edit any file in `src/` and the browser hot-reloads. You only restart `npm run
dev` for config changes (vite/tailwind) or new dependencies.

```bash
npm run build    # production bundle into dist/
npm run preview  # serve the built bundle
```

## Using it

1. Create an account (testing only, see the security note below) and sign in.
2. Create a project. Projects keep their participants and pipeline together.
3. Import data: `+ files` for individual recordings, `+ folder` for a whole
   directory (only `.edf .bdf .fif .csv` are kept). Each file becomes a
   participant. `+ simulated` adds a synthetic 64-channel recording to test with.
4. Click a participant to view it.
5. Build a preprocessing pipeline (it starts with high-pass, notch, low-pass).
   Toggle steps with the checkbox, reorder with the arrows, edit cutoffs inline.

## Controls

- Space: play / pause.
- Scroll over the traces: zoom the time window. Shift+scroll: zoom amplitude.
- Click and drag the traces: scrub through time (works paused or playing).
- Drag the head: rotate. Scroll over it: zoom.
- Drag the timeline: jump. Markers appear there as colored ticks.

## Preprocessing pipeline

Raw EEG (especially BioSemi BDF) carries a large per-channel DC offset, so raw
traces sit far off their channel band and look misaligned. The pipeline fixes
this and more. It is non-destructive: the original samples are never changed; the
steps run in order on a copy each time you change them.

Steps available: DC offset removal, linear detrend, high-pass, low-pass, notch
(line noise), and common average reference. Filters are zero-phase (forward +
backward biquads), which is what EEG analysis expects.

Scope: the pipeline is saved per project and applied to every participant. Switch
the scope toggle to "this participant" to give the selected recording its own
override (shown with an `override` tag in the participant list); "reset to project
pipeline" removes the override.

Note: filtering runs in the browser on the full recording when you change the
pipeline. That is fine for single files but will be slow on very large ones, and
batch-processing an entire dataset belongs on the backend, not here. The pipeline
you build is the portable recipe to hand to that backend.

## Markers

Imported files bring their own events: BioSemi BDF trigger codes (rising edges on
the Status channel) and EDF+/BDF+ annotations. Each distinct label gets a stable
color, shown in the sidebar legend, on the timeline, and labelled at the base of
each event line in the traces.

## Headset vs extra channels

Only montage electrodes (the headset) render on the head and in the traces. Other
channels a file carries (externals, EOG, status, spare references) are listed in
the sidebar's channels panel rather than cluttering the views.

## Data model

The whole UI consumes one shape, the Recording:

```
{ channelNames: string[], sfreq, nSamples, data: Float32Array[] (µV),
  duration, markers: [{ time, label, code? }] }
```

The simulator, the CSV/EDF/BDF parsers, the pipeline, and (later) an API response
all produce this shape, so nothing downstream cares where it came from.

## Architecture

```
src/
  lib/
    store.js     accounts + projects in localStorage (testing)
    idb.js       imported file blobs in IndexedDB (persist across reloads)
    formats.js   detect format -> route to a loader (registry)
    edf.js       EDF/BDF reader + marker extraction
    csvParser.js CSV -> Recording
    fif.js       FIF loader (routes to the backend)
    dsp.js       filters + applyPipeline (non-destructive)
    pipeline.js  step definitions + default pipeline
    markers.js   stable colors per event label
    montage.js   sphere-fit BioSemi-64 electrode positions
    eegData.js   Recording shape, simulator, amplitude->color
  hooks/usePlayback.js   the rAF playhead (no per-frame React renders)
  components/
    Login.jsx          sign in / sign up
    Projects.jsx       project list + create
    Workspace.jsx      participants, pipeline, and the viewer
    PipelinePanel.jsx  toggle / reorder / edit steps
    EEGTraceView.jsx   2D traces (canvas): zoom, pan, markers
    BrainView3D.jsx    3D topography (react-three-fiber)
    Timeline.jsx       transport + scrubber + markers
  App.jsx              router: login -> projects -> workspace
```

The playhead lives in a single ref. The trace canvas and the 3D view each read it
every frame in their own loop, so playback holds 60fps with 64 channels without
re-rendering React. Only coarse state (gain, window, pipeline, selection) goes
through React.

## Security and persistence (read this)

Accounts are stored UNENCRYPTED in localStorage. This exists only to build out the
multi-user flow; it is not real authentication. Do not put anything sensitive
behind it. The intended path is your FastAPI backend with proper auth, RBAC, and a
SQL database; every function in `store.js` maps to an endpoint you can swap in
without touching the UI.

Imported files are stored as blobs in IndexedDB so projects survive a reload.
They live in that one browser. Clearing site data removes them.

## Where this goes next

- Move auth and projects to the backend (RBAC + SQL); `store.js` is the seam.
- Run filtering in a Web Worker so large files don't block the UI.
- Real batch processing and `.fif` reading on the backend (return the Recording
  shape as JSON); `fif.js` already has the fetch stubbed.
- Export filtered recordings (download, or via the backend) once batch lands.
- A settings panel over the existing seams: marker palette (`markers.js`),
  electrode size and spread (`BrainView3D.jsx`), default gain/window.
- Group multiple files (runs/sessions) under one participant when needed; today
  one file is one participant.
