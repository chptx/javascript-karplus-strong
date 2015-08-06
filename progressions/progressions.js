/*global require, module */
var teoria = require('teoria'),
    teoriaChordProgression = require('teoria-chord-progression');

const notes = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#'];
var real_notes = {};
for (let n of notes) {
  real_notes[n] = true;
}

const progressions = {
  'Eight bar blues': [1, 5, 4, 4, 1, 5, 1, 5],
  'Canon': [1, 5, 6, 3, 4, 1, 4, 5],
  'I V vi IV': [1, 5, 6, 4],
  'vi V IV V': [6, 5, 4, 5],
  'I V IV V': [1, 5, 4, 5]
};

function canonify_note(note) {
  let name = note.toString(true);
  return name[0].toUpperCase() + name.substr(1);
}

function* fixup_chords(chords) {
  for (let chord of chords) {
    if (canonify_note(chord.root) in real_notes) {
      yield chord;
    } else {
      let eh = chord.root.enharmonics(true);
      for (let note of eh) {
        if (canonify_note(note) in real_notes) {
          yield note.chord(chord.symbol);
          break;
        }
      }
    }
  }
}

function get_progression(tonic, scale, progression) {
  return Array.from(fixup_chords(teoriaChordProgression(teoria.scale(tonic, scale), progression).getChords()), chord => chord.name);
}

global.progressions = {
  notes: notes,
  progressions: progressions,
  get_progression: get_progression
};
