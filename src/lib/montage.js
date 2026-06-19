// Real BioSemi 64-channel electrode positions (10-10 system), extracted
// from MNE's standard montage. A sphere was fit to the electrodes to find
// the true head center and radius, so every electrode sits at radius ~1
// around the origin. Cz is the vertex of the head: (0, 1, 0), NOT the
// center. The center (0,0,0) is deep inside the head, where no electrode is.
// Axes are three.js: x right, y up, z toward viewer; the nose faces -z.

export const MONTAGE_64 = [
  { name: "Fp1", x: -0.3088, y: -0.0349, z: -0.9505 },
  { name: "AF7", x: -0.5874, y: -0.0349, z: -0.8085 },
  { name: "AF3", x: -0.4062, y: 0.2756, z: -0.8712 },
  { name: "F1", x: -0.287, y: 0.6428, z: -0.7103 },
  { name: "F3", x: -0.545, y: 0.5, z: -0.673 },
  { name: "F5", x: -0.729, y: 0.2588, z: -0.6337 },
  { name: "F7", x: -0.8085, y: -0.0349, z: -0.5874 },
  { name: "FT7", x: -0.9505, y: -0.0349, z: -0.3088 },
  { name: "FC5", x: -0.8879, y: 0.309, z: -0.3408 },
  { name: "FC3", x: -0.6764, y: 0.6428, z: -0.3596 },
  { name: "FC1", x: -0.3747, y: 0.848, z: -0.3747 },
  { name: "C1", x: -0.3907, y: 0.9205, z: -0.0 },
  { name: "C3", x: -0.7193, y: 0.6947, z: -0.0 },
  { name: "C5", x: -0.9336, y: 0.3584, z: -0.0 },
  { name: "T7", x: -0.9994, y: -0.0349, z: -0.0 },
  { name: "TP7", x: -0.9505, y: -0.0349, z: 0.3088 },
  { name: "CP5", x: -0.8879, y: 0.309, z: 0.3408 },
  { name: "CP3", x: -0.6764, y: 0.6428, z: 0.3596 },
  { name: "CP1", x: -0.3747, y: 0.848, z: 0.3747 },
  { name: "P1", x: -0.287, y: 0.6428, z: 0.7103 },
  { name: "P3", x: -0.545, y: 0.5, z: 0.673 },
  { name: "P5", x: -0.729, y: 0.2588, z: 0.6337 },
  { name: "P7", x: -0.8085, y: -0.0349, z: 0.5874 },
  { name: "P9", x: -0.7332, y: -0.4226, z: 0.5327 },
  { name: "PO7", x: -0.5874, y: -0.0349, z: 0.8085 },
  { name: "PO3", x: -0.4062, y: 0.2756, z: 0.8712 },
  { name: "O1", x: -0.3088, y: -0.0349, z: 0.9505 },
  { name: "Iz", x: 0.0, y: -0.4226, z: 0.9063 },
  { name: "Oz", x: 0.0, y: -0.0349, z: 0.9994 },
  { name: "POz", x: 0.0, y: 0.3584, z: 0.9336 },
  { name: "Pz", x: 0.0, y: 0.6947, z: 0.7193 },
  { name: "CPz", x: 0.0, y: 0.9205, z: 0.3907 },
  { name: "Fpz", x: 0.0, y: -0.0349, z: -0.9994 },
  { name: "Fp2", x: 0.3088, y: -0.0349, z: -0.9505 },
  { name: "AF8", x: 0.5874, y: -0.0349, z: -0.8085 },
  { name: "AF4", x: 0.4062, y: 0.2756, z: -0.8712 },
  { name: "AFz", x: 0.0, y: 0.3584, z: -0.9336 },
  { name: "Fz", x: 0.0, y: 0.6947, z: -0.7193 },
  { name: "F2", x: 0.287, y: 0.6428, z: -0.7103 },
  { name: "F4", x: 0.545, y: 0.5, z: -0.673 },
  { name: "F6", x: 0.729, y: 0.2588, z: -0.6337 },
  { name: "F8", x: 0.8085, y: -0.0349, z: -0.5874 },
  { name: "FT8", x: 0.9505, y: -0.0349, z: -0.3088 },
  { name: "FC6", x: 0.8879, y: 0.309, z: -0.3408 },
  { name: "FC4", x: 0.6764, y: 0.6428, z: -0.3596 },
  { name: "FC2", x: 0.3747, y: 0.848, z: -0.3747 },
  { name: "FCz", x: 0.0, y: 0.9205, z: -0.3907 },
  { name: "Cz", x: 0.0, y: 1.0, z: -0.0 },
  { name: "C2", x: 0.3907, y: 0.9205, z: -0.0 },
  { name: "C4", x: 0.7193, y: 0.6947, z: -0.0 },
  { name: "C6", x: 0.9336, y: 0.3584, z: -0.0 },
  { name: "T8", x: 0.9994, y: -0.0349, z: -0.0 },
  { name: "TP8", x: 0.9505, y: -0.0349, z: 0.3088 },
  { name: "CP6", x: 0.8879, y: 0.309, z: 0.3408 },
  { name: "CP4", x: 0.6764, y: 0.6428, z: 0.3596 },
  { name: "CP2", x: 0.3747, y: 0.848, z: 0.3747 },
  { name: "P2", x: 0.287, y: 0.6428, z: 0.7103 },
  { name: "P4", x: 0.545, y: 0.5, z: 0.673 },
  { name: "P6", x: 0.729, y: 0.2588, z: 0.6337 },
  { name: "P8", x: 0.8085, y: -0.0349, z: 0.5874 },
  { name: "P10", x: 0.7332, y: -0.4226, z: 0.5327 },
  { name: "PO8", x: 0.5874, y: -0.0349, z: 0.8085 },
  { name: "PO4", x: 0.4062, y: 0.2756, z: 0.8712 },
  { name: "O2", x: 0.3088, y: -0.0349, z: 0.9505 },
];

export const CHANNEL_NAMES = MONTAGE_64.map((e) => e.name);

export const POSITION_BY_NAME = Object.fromEntries(
  MONTAGE_64.map((e) => [e.name, [e.x, e.y, e.z]])
);
