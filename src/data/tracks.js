// Music tracks (see src/engine/music.js for the format).
// Placeholder title theme - the final per-level tracks come in M9.

import { rep } from '../engine/music.js';

// Chord loop: Am | F | C | G, 16 steps per bar.
const arp = (a, b, c) => rep(`${a}:1 ${b}:1 ${c}:1 ${b}:1`, 4);

export const TRACKS = {
  title: {
    bpm: 108,
    channels: [
      {
        wave: 'pulse25', vol: 0.16, // lead
        notes: [
          'E5:4 C5:2 D5:2 E5:4 A5:4',
          'G5:4 F5:2 E5:2 F5:4 A4:4',
          'G5:4 E5:2 G5:2 C6:4 B5:4',
          'A5:4 G5:2 E5:2 D5:4 R:4',
        ].join(' '),
      },
      {
        wave: 'pulse50', vol: 0.07, // arpeggio
        notes: [arp('A3', 'C4', 'E4'), arp('F3', 'A3', 'C4'), arp('C4', 'E4', 'G4'), arp('G3', 'B3', 'D4')].join(' '),
      },
      {
        wave: 'triangle', vol: 0.3, // bass
        notes: ['A2:4 R:2 A2:2 A3:4 R:2 A2:2', 'F2:4 R:2 F2:2 F3:4 R:2 F2:2',
          'C3:4 R:2 C3:2 C4:4 R:2 C3:2', 'G2:4 R:2 G2:2 G3:4 R:2 G2:2'].join(' '),
      },
      {
        wave: 'noise', vol: 0.12,
        notes: 'K:2 H:2 S:2 H:2 K:2 H:2 S:2 H:2',
      },
    ],
  },

  // Intro cutscene: slow, dreamy D major (D | Bm | G | A), plane-over-the-pampas mood.
  intro: {
    bpm: 84,
    channels: [
      {
        wave: 'pulse25', vol: 0.13, // lead
        notes: [
          'F#5:4 A5:4 F#5:4 D5:4',
          'D5:4 F#5:4 B5:6 R:2',
          'B5:4 G5:4 D5:4 B4:4',
          'C#5:4 E5:4 A5:6 R:2',
        ].join(' '),
      },
      {
        wave: 'pulse50', vol: 0.06, // arpeggio
        notes: [arp('D4', 'F#4', 'A4'), arp('B3', 'D4', 'F#4'), arp('G3', 'B3', 'D4'), arp('A3', 'C#4', 'E4')].join(' '),
      },
      {
        wave: 'triangle', vol: 0.28, // bass
        notes: 'D2:8 A2:8 B1:8 F#2:8 G1:8 D2:8 A1:8 E2:8',
      },
      {
        wave: 'noise', vol: 0.05, // soft hats
        notes: 'H:2 R:2 H:2 R:2 H:2 R:2 H:2 R:2',
      },
    ],
  },
};
