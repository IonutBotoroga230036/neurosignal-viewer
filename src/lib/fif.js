// FIF loader.
//
// FIF is MNE's native format and has no practical JavaScript parser, so it is
// read on the server: your NeuroSignal backend already loads it via MNE. This
// loader is the seam where the browser hands the file to that backend and gets
// the shared Recording shape back as JSON.
//
// Until the endpoint exists it throws a clear message rather than failing
// silently. To enable it, stand up an endpoint that returns:
//   { channelNames: string[], sfreq: number, data: number[][] (µV) }
// and uncomment the fetch below.

export async function loadFIF(file /*, options */) {
  throw new Error(
    "FIF files are read server-side via MNE. Wire loadFIF() to your " +
      "NeuroSignal API (see src/lib/fif.js) to enable it."
  );

  // --- reference implementation, enable when the endpoint is ready ---
  //
  // const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
  // const form = new FormData();
  // form.append("file", file);
  //
  // const res = await fetch(`${API_BASE}/v1/recordings/load`, {
  //   method: "POST",
  //   body: form,
  // });
  // if (!res.ok) throw new Error(`Server failed to read FIF (${res.status}).`);
  // const json = await res.json();
  //
  // return {
  //   channelNames: json.channelNames,
  //   sfreq: json.sfreq,
  //   nSamples: json.data[0].length,
  //   data: json.data.map((ch) => Float32Array.from(ch)),
  //   duration: json.data[0].length / json.sfreq,
  //   markers: json.markers || [],
  //   name: file.name,
  // };
}
