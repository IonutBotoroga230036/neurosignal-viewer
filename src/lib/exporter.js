// Export a (filtered) Recording to CSV and trigger a download. First row is
// channel names; one row per sample; values in µV. Heavy for long recordings,
// but it is a deliberate, user-initiated action. Larger / native formats
// (EDF, FIF) belong on the backend.

export function downloadRecordingCSV(recording, filename = "filtered.csv") {
  const { channelNames, data, nSamples } = recording;
  const rows = [channelNames.join(",")];
  for (let i = 0; i < nSamples; i++) {
    let line = "";
    for (let c = 0; c < data.length; c++) {
      if (c) line += ",";
      line += data[c][i].toFixed(3);
    }
    rows.push(line);
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
