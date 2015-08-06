(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var ChordProgression = require('./lib/chord-progression');

module.exports = function createNewChordProgression(scale, progression, chordLength) {
    return new ChordProgression(scale, progression, chordLength);
};

},{"./lib/chord-progression":2}],2:[function(require,module,exports){
var piu = require('piu');

function ChordProgression(scale, progression, chordLength) {
    if(!scale || !progression) {
        throw new Error('Expected 2 arguments but received 0.');
    }

    if(!scale.notes || !scale.transpose) {
        throw new Error('Invalid argument: TeoriaScale.');
    }

    if(!(progression instanceof Array) || progression.filter(function(n) { return typeof n !== 'number'; }).length > 0) {
        throw new Error('Invalid argument: Integer Array.');
    }

    if(chordLength && chordLength !== 3 && chordLength !== 4) {
        throw new Error('Invalid argument: Supported chord lengths are 3 and 4.');
    }

    this.chordLength = chordLength || 3;
    this.notes = scale.notes();
    this.chords = progression.map(function(n) {
        return this._parseChord(n - 1);
    }.bind(this));
}

ChordProgression.prototype._parseChord = function _parseChord(n) {
    var rootNote = this.notes[n],
        chordNotes = [],
        chordName,
        i;

    if(!rootNote) {
        throw new Error('Invalid Progression: Scale has ' + this.notes.length + ' degrees.');
    }

    for(i = 0; i < this.chordLength; i++) {
        chordNotes.push(this.notes[(n + (2 * i)) % this.notes.length]);
    }

    chordName = piu.name(piu.infer(chordNotes)[0]);
    chordName = chordName.replace(/^([A-G]|b|#)+/, '');

    return rootNote.chord(chordName);
};

ChordProgression.prototype.getChords = function getChords() {
    return this.chords;
};

ChordProgression.prototype.getChord = function getChord(n) {
    return this.chords[n];
};

ChordProgression.prototype.simple = function simple() {
    return this.chords.map(function(chord) {
        return chord.notes().map(function(note) {
            return note.toString();
        });
    });
};

module.exports = ChordProgression;

},{"piu":3}],3:[function(require,module,exports){
var triads = require('./lib/triads');
var infer = require('./lib/infer');
var name = require('./lib/name');

module.exports = exports = { infer: infer, triads: triads, name: name };

},{"./lib/infer":5,"./lib/name":6,"./lib/triads":7}],4:[function(require,module,exports){
// Return all combinations of k elements in set of length n
exports.k_combinations = function k_combinations(set, k) {
  var i, j, combs = [], head, tailcombs, n = set.length, x;

  if (k > n || k <= 0) return combs;
  if (k === n) return [set];
  if (k === 1) return set.map(function(el) { return [el]; });

  for (i = 0; i < (n - k + 1); i++) {
    head = [set[i]];
    tailcombs = k_combinations(set.slice(i + 1), k - 1);

    for (j = 0, x = tailcombs.length; j < x; j++) {
      combs.push(head.concat(tailcombs[j]));
    }
  }

  return combs;
};

// Return all permutations of the set
exports.permutate = function permutate(set) {
  function p(set, index, callback) {
    // Swap elements i1 and i2 in array a[]
    function swap(a, i1, i2) {
      var t = a[i1];
      a[i1] = a[i2];
      a[i2] = t;
    }

    if (index == set.length - 1)
      callback(set);
    else {
      p(set, index + 1, callback);

      for (var i = index + 1; i < set.length; i++) {
        swap(set, i, index);
        p(set, index + 1, callback);
        swap(set, i, index);
      }
    }
  }

  if (!set || !set.length) return [];

  var permutations = [];
  p(set, 0, function(a) { permutations.push(a.slice(0)); });

  return permutations;
};

},{}],5:[function(require,module,exports){
var possibleTriads  = require('./triads')
  , combi           = require('./combinatorics');

module.exports = function infer(notes, enharmonics) {
  var triads, chords = [];

  if (enharmonics) {
    var n = notes.length;
    notes = notes.map(function(note) {
      return [note].concat(note.enharmonics());
    });

    // Flatten it
    notes = [].concat.apply([], notes);

    chords = combi.k_combinations(notes, n).map(function(notecombi) {
      return infer(notecombi);
    });

    return [].concat.apply([], chords);
  }

  // Special case for power-chords (which aren't actual chords)
  if (notes.length === 2) {
    var root = notes[0], interval = root.interval(notes[1])
      , val = interval.value(), num = Math.abs(val);

    if ((num !== 4 && num !== 5) || interval.quality() !== 'P')
      return [];

    if (val === -5 || val === 4)
      root = notes[1];

    return [{
      root: root.name().toUpperCase() + root.accidental(),
      type: '5',
      exts: []
    }];
  }

  triads = possibleTriads(notes);
  triads.forEach(function(triad) {
    var indexes = triad.notes.map(function(n) { return n.toString(true); });
    var chromas = triad.notes.map(function(n) { return n.chroma(); });
    var root = triad.notes[0], extensions = [];

    var exts = notes.filter(function(note) {
      return indexes.indexOf(note.toString(true)) === -1;
    });

    for (var i = 0, length = exts.length; i < length; i++) {
      var ext = exts[i];
      var interval = root.interval(ext);
      if (chromas.indexOf(ext.chroma()) !== -1 ||
          Math.abs(interval.qualityValue()) > 2) return;

      interval = interval.direction() === 'down' ?  interval.invert() : interval;
      var q = interval.quality();
      var num = interval.number();

      if (num === 2 || num === 4)
        interval.coord[0]++;
      else if (num === 3 && triad.type.indexOf('sus') !== -1)
        return; // No thirds in sus chords
      else if (q === 'A' && num !== 2 && num !== 4)
        return;
      else if (q === 'd' && num !== 4 && !(num === 7 && triad.type === 'dim'))
        return;
      else if (q === 'dd' || q === 'AA')
        return;

      extensions.push(interval);
    }

    // Sort descending
    extensions.sort(function(a, b) { return b.number() - a.number(); });

    chords.push({
      root: root.name().toUpperCase() + root.accidental(),
      type: triad.type,
      exts: extensions
    });
  });

  return chords;
};

},{"./combinatorics":4,"./triads":7}],6:[function(require,module,exports){
// Normal quality values
var normal = {
 '6': 1,
 '7': 0,
 '9': 1,
 '11': 0,
 '13': 1
};

// Return chord type and extensions in the correct order
function order(type, name) {
  if (type === '' || type === 'M') return name;
  if (type === 'm') return type + name;
  if (type === 'aug') return name + '#5';
  if (type === 'm#5') return 'm' + name + '#5';
  if (type === 'dim') return name === 'b7' ? 'dim7' : 'm' + name + 'b5';
  if (type === 'Mb5') return name + 'b5';
  else return name + type;
}

// Return (if necessary) the sign to prepend an extension
function sign(extension) {
  var num = extension.number().toString()
    , diff = normal[num] - extension.qualityValue();

  if (diff === 1)
    return 'b';
  if (diff === -1)
    return num === '7' ? 'maj' : '#';
  else
    return '';
}


module.exports = exports = function(chord) {
  var root = chord.root, type = chord.type, exts = chord.exts, rest;

  if (!exts.length) // Triad
    rest = type;
  else if (exts.length === 1) { // Tetrad
    var num = exts[0].number();
    var asign = sign(exts[0]);
    var name = (num === 6 || num === 7) ? (asign + num) : ('add' + asign + num);

    rest = order(type, name);
  } else {
    // TODO: Implement naming for higher order chords
    console.log('chord', root, type, exts.toString());
  }


  if (/^[b#]/.test(rest))
    return root + '(' + rest + ')';
  else
    return root + rest;
};

},{}],7:[function(require,module,exports){
var combi = require('./combinatorics');

var kTriads = {
  '': ['M3', 'P5'],
  'm': ['m3', 'P5'],
  'aug': ['M3', 'A5'],
  'dim': ['m3', 'd5'],
  'sus2': ['M2', 'P5'],
  'sus4': ['P4', 'P5'],
  'sus2#5': ['M2', 'A5'],
  'sus2b5': ['M2', 'd5'],
  'sus4#5': ['P4', 'A5'],
  'sus4b5': ['P4', 'd5'],
  'Mb5': ['M3', 'd5'],
  'm#5': ['m3', 'A5']
};

function compareArray(first, second) {
  for (var i = 0, length = first.length; i < length; i++)
    if (first[i] !== second[i]) return false;

  return true;
}

// Get all possible triad combinations of a set of notes
module.exports = exports = function(notes) {
  var combs = [], triads = [], names = [], n = [], root, third, fifth, type;

  // Unique notes (for now, we handle all notes octave-agnostic)
  notes.forEach(function(note) {
    if (names.indexOf(note.toString(true)) === -1) {
      n.push(note);
      names.push(note.toString(true));
    }
  });

  // Get all k combinations and each of their permutations
  combi.k_combinations(n, 3).forEach(function(comb) {
    combi.permutate(comb).forEach(function(perm) {
      combs.push(perm);
    });
  });

  // Filter out triads with roots with double accidentals (Cx, Ebb, etc)
  combs
  .filter(function(triad) {
    return triad[0].name() !== triad[1].name() &&
           triad[0].name() !== triad[2].name() &&
           triad[1].name() !== triad[2].name() &&
           Math.abs(triad[0].accidentalValue()) < 2 &&
           Math.abs(triad[1].accidentalValue()) < 3 &&
           Math.abs(triad[2].accidentalValue()) < 3;
  })
  .forEach(function(triad) {
    root = triad[0];

    third = root.interval(triad[1]);
    third = third.direction() === 'down' ? third.invert().simple(true) : third.simple();
    fifth = root.interval(triad[2]);
    fifth = fifth.direction() === 'down' ? fifth.invert().simple(true) : fifth.simple();

    third = third.toString();
    fifth = fifth.toString();

    for (type in kTriads) {
      if (compareArray(kTriads[type], [third, fifth]))
        triads.push({ notes: triad, type: type });
    }
  });

  return triads;
};

},{"./combinatorics":4}],8:[function(require,module,exports){
var Note = require('./lib/note');
var Interval = require('./lib/interval');
var Chord = require('./lib/chord');
var Scale = require('./lib/scale');

// never thought I would write this, but: Legacy support
function intervalConstructor(from, to) {
  // Construct a Interval object from string representation
  if (typeof from === 'string')
    return Interval.toCoord(from);

  if (typeof to === 'string' && from instanceof Note)
    return Interval.from(from, Interval.toCoord(to));

  if (to instanceof Interval && from instanceof Note)
    return Interval.from(from, to);

  if (to instanceof Note && from instanceof Note)
    return Interval.between(from, to);

  throw new Error('Invalid parameters');
}

intervalConstructor.toCoord = Interval.toCoord;
intervalConstructor.from = Interval.from;
intervalConstructor.between = Interval.between;
intervalConstructor.invert = Interval.invert;

function noteConstructor(name, duration) {
  if (typeof name === 'string')
    return Note.fromString(name, duration);
  else
    return new Note(name, duration);
}

noteConstructor.fromString = Note.fromString;
noteConstructor.fromKey = Note.fromKey;
noteConstructor.fromFrequency = Note.fromFrequency;
noteConstructor.fromMIDI = Note.fromMIDI;

function chordConstructor(name, symbol) {
  if (typeof name === 'string') {
    var root, octave;
    root = name.match(/^([a-h])(x|#|bb|b?)/i);
    if (root && root[0]) {
      octave = typeof symbol === 'number' ? symbol.toString(10) : '4';
      return new Chord(Note.fromString(root[0].toLowerCase() + octave),
                            name.substr(root[0].length));
    }
  } else if (name instanceof Note)
    return new Chord(name, symbol);

  throw new Error('Invalid Chord. Couldn\'t find note name');
}

function scaleConstructor(tonic, scale) {
  tonic = (tonic instanceof Note) ? tonic : teoria.note(tonic);
  return new Scale(tonic, scale);
}

var teoria = {
  note: noteConstructor,

  chord: chordConstructor,

  interval: intervalConstructor,

  scale: scaleConstructor,

  Note: Note,
  Chord: Chord,
  Scale: Scale,
  Interval: Interval
};

require('./lib/sugar')(teoria);
exports = module.exports = teoria;

},{"./lib/chord":9,"./lib/interval":10,"./lib/note":12,"./lib/scale":13,"./lib/sugar":14}],9:[function(require,module,exports){
var daccord = require('daccord');
var knowledge = require('./knowledge');
var Note = require('./note');
var Interval = require('./interval');

function Chord(root, name) {
  if (!(this instanceof Chord)) return new Chord(root, name);
  name = name || '';
  this.name = root.name().toUpperCase() + root.accidental() + name;
  this.symbol = name;
  this.root = root;
  this.intervals = [];
  this._voicing = [];

  var bass = name.split('/');
  if (bass.length === 2 && bass[1].trim() !== '9') {
    name = bass[0];
    bass = bass[1].trim();
  } else {
    bass = null;
  }

  this.intervals = daccord(name).map(Interval.toCoord)
  this._voicing = this.intervals.slice();

  if (bass) {
    var intervals = this.intervals, bassInterval, note;
    // Make sure the bass is atop of the root note
    note = Note.fromString(bass + (root.octave() + 1)); // crude

    bassInterval = Interval.between(root, note);
    bass = bassInterval.simple();
    bassInterval = bassInterval.invert().direction('down');

    this._voicing = [bassInterval];
    for (var i = 0, length = intervals.length;  i < length; i++) {
      if (!intervals[i].simple().equal(bass))
        this._voicing.push(intervals[i]);
    }
  }
}

Chord.prototype = {
  notes: function() {
    var root = this.root;
    return this.voicing().map(function(interval) {
      return root.interval(interval);
    });
  },

  simple: function() {
    return this.notes().map(function(n) { return n.toString(true); });
  },

  bass: function() {
    return this.root.interval(this._voicing[0]);
  },

  voicing: function(voicing) {
    // Get the voicing
    if (!voicing) {
      return this._voicing;
    }

    // Set the voicing
    this._voicing = [];
    for (var i = 0, length = voicing.length; i < length; i++) {
      this._voicing[i] = Interval.toCoord(voicing[i]);
    }

    return this;
  },

  resetVoicing: function() {
    this._voicing = this.intervals;
  },

  dominant: function(additional) {
    additional = additional || '';
    return new Chord(this.root.interval('P5'), additional);
  },

  subdominant: function(additional) {
    additional = additional || '';
    return new Chord(this.root.interval('P4'), additional);
  },

  parallel: function(additional) {
    additional = additional || '';
    var quality = this.quality();

    if (this.chordType() !== 'triad' || quality === 'diminished' ||
        quality === 'augmented') {
      throw new Error('Only major/minor triads have parallel chords');
    }

    if (quality === 'major') {
      return new Chord(this.root.interval('m3', 'down'), 'm');
    } else {
      return new Chord(this.root.interval('m3', 'up'));
    }
  },

  quality: function() {
    var third, fifth, seventh, intervals = this.intervals;

    for (var i = 0, length = intervals.length; i < length; i++) {
      if (intervals[i].number() === 3) {
        third = intervals[i];
      } else if (intervals[i].number() === 5) {
        fifth = intervals[i];
      } else if (intervals[i].number() === 7) {
        seventh = intervals[i];
      }
    }

    if (!third) {
      return;
    }

    third = (third.direction() === 'down') ? third.invert() : third;
    third = third.simple().toString();

    if (fifth) {
      fifth = (fifth.direction === 'down') ? fifth.invert() : fifth;
      fifth = fifth.simple().toString();
    }

    if (seventh) {
      seventh = (seventh.direction === 'down') ? seventh.invert() : seventh;
      seventh = seventh.simple().toString();
    }

    if (third === 'M3') {
      if (fifth === 'A5') {
        return 'augmented';
      } else if (fifth === 'P5') {
        return (seventh === 'm7') ? 'dominant' : 'major';
      }

      return 'major';
    } else if (third === 'm3') {
      if (fifth === 'P5') {
        return 'minor';
      } else if (fifth === 'd5') {
        return (seventh === 'm7') ? 'half-diminished' : 'diminished';
      }

      return 'minor';
    }
  },

  chordType: function() { // In need of better name
    var length = this.intervals.length, interval, has, invert, i, name;

    if (length === 2) {
      return 'dyad';
    } else if (length === 3) {
      has = {first: false, third: false, fifth: false};
      for (i = 0; i < length; i++) {
        interval = this.intervals[i];
        invert = interval.invert();
        if (interval.base() in has) {
          has[interval.base()] = true;
        } else if (invert.base() in has) {
          has[invert.base()] = true;
        }
      }

      name = (has.first && has.third && has.fifth) ? 'triad' : 'trichord';
    } else if (length === 4) {
      has = {first: false, third: false, fifth: false, seventh: false};
      for (i = 0; i < length; i++) {
        interval = this.intervals[i];
        invert = interval.invert();
        if (interval.base() in has) {
          has[interval.base()] = true;
        } else if (invert.base() in has) {
          has[invert.base()] = true;
        }
      }

      if (has.first && has.third && has.fifth && has.seventh) {
        name = 'tetrad';
      }
    }

    return name || 'unknown';
  },

  get: function(interval) {
    if (typeof interval === 'string' && interval in knowledge.stepNumber) {
      var intervals = this.intervals, i, length;

      interval = knowledge.stepNumber[interval];
      for (i = 0, length = intervals.length; i < length; i++) {
        if (intervals[i].number() === interval) {
          return this.root.interval(intervals[i]);
        }
      }

      return null;
    } else {
      throw new Error('Invalid interval name');
    }
  },

  interval: function(interval) {
    return new Chord(this.root.interval(interval), this.symbol);
  },

  transpose: function(interval) {
    this.root.transpose(interval);
    this.name = this.root.name().toUpperCase() +
                this.root.accidental() + this.symbol;

    return this;
  },

  toString: function() {
    return this.name;
  }
};

module.exports = Chord;

},{"./interval":10,"./knowledge":11,"./note":12,"daccord":16}],10:[function(require,module,exports){
var knowledge = require('./knowledge');
var vector = require('./vector');
var toCoord = require('interval-coords');

function Interval(coord) {
  if (!(this instanceof Interval)) return new Interval(coord);
  this.coord = coord;
}

Interval.prototype = {
  name: function() {
    return knowledge.intervalsIndex[this.number() - 1];
  },

  semitones: function() {
    return vector.sum(vector.mul(this.coord, [12, 7]));
  },

  number: function() {
    return Math.abs(this.value());
  },

  value: function() {
    var without = vector.sub(this.coord,
      vector.mul(knowledge.sharp, Math.floor((this.coord[1] - 2) / 7) + 1))
      , i, val;

    i = knowledge.intervalFromFifth[without[1] + 5];
    val = knowledge.stepNumber[i] + (without[0] - knowledge.intervals[i][0]) * 7;

    return (val > 0) ? val : val - 2;
  },

  type: function() {
    return knowledge.intervals[this.base()][0] <= 1 ? 'perfect' : 'minor';
  },

  base: function() {
    var fifth = vector.sub(this.coord, vector.mul(knowledge.sharp, this.qualityValue()))[1], name;
    fifth = this.value() > 0 ? fifth + 5 : -(fifth - 5) % 7;
    fifth = fifth < 0 ? knowledge.intervalFromFifth.length + fifth : fifth;

    name = knowledge.intervalFromFifth[fifth];
    if (name === 'unison' && this.number() >= 8)
      name = 'octave';

    return name;
  },

  direction: function(dir) {
    if (dir) {
      var is = this.value() >= 1 ? 'up' : 'down';
      if (is !== dir)
        this.coord = vector.mul(this.coord, -1);

      return this;
    }
    else
      return this.value() >= 1 ? 'up' : 'down';
  },

  simple: function(ignore) {
    // Get the (upwards) base interval (with quality)
    var simple = knowledge.intervals[this.base()];
    simple = vector.add(simple, vector.mul(knowledge.sharp, this.qualityValue()));

    // Turn it around if necessary
    if (!ignore)
      simple = this.direction() === 'down' ? vector.mul(simple, -1) : simple;

    return new Interval(simple);
  },

  isCompound: function() {
    return this.number() > 8;
  },

  octaves: function() {
    var without, octaves;

    if (this.direction() === 'up') {
      without = vector.sub(this.coord, vector.mul(knowledge.sharp, this.qualityValue()));
      octaves = without[0] - knowledge.intervals[this.base()][0];
    } else {
      without = vector.sub(this.coord, vector.mul(knowledge.sharp, -this.qualityValue()));
      octaves = -(without[0] + knowledge.intervals[this.base()][0]);
    }

    return octaves;
  },

  invert: function() {
    var i = this.base();
    var qual = this.qualityValue();
    var acc = this.type() === 'minor' ? -(qual - 1) : -qual;
    var coord = knowledge.intervals[knowledge.intervalsIndex[9 - knowledge.stepNumber[i] - 1]];
    coord = vector.add(coord, vector.mul(knowledge.sharp, acc));

    return new Interval(coord);
  },

  quality: function(lng) {
    var quality = knowledge.alterations[this.type()][this.qualityValue() + 2];

    return lng ? knowledge.qualityLong[quality] : quality;
  },

  qualityValue: function() {
    if (this.direction() === 'down')
      return Math.floor((-this.coord[1] - 2) / 7) + 1;
    else
      return Math.floor((this.coord[1] - 2) / 7) + 1;
  },

  equal: function(interval) {
      return this.coord[0] === interval.coord[0] &&
          this.coord[1] === interval.coord[1];
  },

  greater: function(interval) {
    var semi = this.semitones();
    var isemi = interval.semitones();

    // If equal in absolute size, measure which interval is bigger
    // For example P4 is bigger than A3
    return (semi === isemi) ?
      (this.number() > interval.number()) : (semi > isemi);
  },

  smaller: function(interval) {
    return !this.equal(interval) && !this.greater(interval);
  },

  add: function(interval) {
    return new Interval(vector.add(this.coord, interval.coord));
  },

  toString: function(ignore) {
    // If given true, return the positive value
    var number = ignore ? this.number() : this.value();

    return this.quality() + number;
  }
}

Interval.toCoord = function(simple) {
  var coord = toCoord(simple);
  if (!coord)
    throw new Error('Invalid simple format interval');

  return new Interval(coord);
}

Interval.from = function(from, to) {
  return from.interval(to);
}

Interval.between = function(from, to) {
  return new Interval(vector.sub(to.coord, from.coord));
}

Interval.invert = function(sInterval) {
  return Interval.toCoord(sInterval).invert().toString();
}

module.exports = Interval;

},{"./knowledge":11,"./vector":15,"interval-coords":20}],11:[function(require,module,exports){
// Note coordinates [octave, fifth] relative to C
module.exports = {
  notes: {
    c: [0, 0],
    d: [-1, 2],
    e: [-2, 4],
    f: [1, -1],
    g: [0, 1],
    a: [-1, 3],
    b: [-2, 5],
    h: [-2, 5]
  },

  intervals: {
    unison: [0, 0],
    second: [3, -5],
    third: [2, -3],
    fourth: [1, -1],
    fifth: [0, 1],
    sixth: [3, -4],
    seventh: [2, -2],
    octave: [1, 0]
  },

  intervalFromFifth: ['second', 'sixth', 'third', 'seventh', 'fourth',
                         'unison', 'fifth'],

  intervalsIndex: ['unison', 'second', 'third', 'fourth', 'fifth',
                      'sixth', 'seventh', 'octave', 'ninth', 'tenth',
                      'eleventh', 'twelfth', 'thirteenth', 'fourteenth',
                      'fifteenth'],

// linaer index to fifth = (2 * index + 1) % 7
  fifths: ['f', 'c', 'g', 'd', 'a', 'e', 'b'],
  accidentals: ['bb', 'b', '', '#', 'x'],

  sharp: [-4, 7],
  A4: [3, 3],

  durations: {
    '0.25': 'longa',
    '0.5': 'breve',
    '1': 'whole',
    '2': 'half',
    '4': 'quarter',
    '8': 'eighth',
    '16': 'sixteenth',
    '32': 'thirty-second',
    '64': 'sixty-fourth',
    '128': 'hundred-twenty-eighth'
  },

  qualityLong: {
    P: 'perfect',
    M: 'major',
    m: 'minor',
    A: 'augmented',
    AA: 'doubly augmented',
    d: 'diminished',
    dd: 'doubly diminished'
  },

  alterations: {
    perfect: ['dd', 'd', 'P', 'A', 'AA'],
    minor: ['dd', 'd', 'm', 'M', 'A', 'AA']
  },

  symbols: {
    'min': ['m3', 'P5'],
    'm': ['m3', 'P5'],
    '-': ['m3', 'P5'],

    'M': ['M3', 'P5'],
    '': ['M3', 'P5'],

    '+': ['M3', 'A5'],
    'aug': ['M3', 'A5'],

    'dim': ['m3', 'd5'],
    'o': ['m3', 'd5'],

    'maj': ['M3', 'P5', 'M7'],
    'dom': ['M3', 'P5', 'm7'],
    'ø': ['m3', 'd5', 'm7'],

    '5': ['P5']
  },

  chordShort: {
    'major': 'M',
    'minor': 'm',
    'augmented': 'aug',
    'diminished': 'dim',
    'half-diminished': '7b5',
    'power': '5',
    'dominant': '7'
  },

  stepNumber: {
    'unison': 1,
    'first': 1,
    'second': 2,
    'third': 3,
    'fourth': 4,
    'fifth': 5,
    'sixth': 6,
    'seventh': 7,
    'octave': 8,
    'ninth': 9,
    'eleventh': 11,
    'thirteenth': 13
  },

  // Adjusted Shearer syllables - Chromatic solfege system
  // Some intervals are not provided for. These include:
  // dd2 - Doubly diminished second
  // dd3 - Doubly diminished third
  // AA3 - Doubly augmented third
  // dd6 - Doubly diminished sixth
  // dd7 - Doubly diminished seventh
  // AA7 - Doubly augmented seventh
  intervalSolfege: {
    'dd1': 'daw',
    'd1': 'de',
    'P1': 'do',
    'A1': 'di',
    'AA1': 'dai',
    'd2': 'raw',
    'm2': 'ra',
    'M2': 're',
    'A2': 'ri',
    'AA2': 'rai',
    'd3': 'maw',
    'm3': 'me',
    'M3': 'mi',
    'A3': 'mai',
    'dd4': 'faw',
    'd4': 'fe',
    'P4': 'fa',
    'A4': 'fi',
    'AA4': 'fai',
    'dd5': 'saw',
    'd5': 'se',
    'P5': 'so',
    'A5': 'si',
    'AA5': 'sai',
    'd6': 'law',
    'm6': 'le',
    'M6': 'la',
    'A6': 'li',
    'AA6': 'lai',
    'd7': 'taw',
    'm7': 'te',
    'M7': 'ti',
    'A7': 'tai',
    'dd8': 'daw',
    'd8': 'de',
    'P8': 'do',
    'A8': 'di',
    'AA8': 'dai'
  }
}

},{}],12:[function(require,module,exports){
var scientific = require('scientific-notation');
var helmholtz = require('helmholtz');
var knowledge = require('./knowledge');
var vector = require('./vector');
var Interval = require('./interval');

function pad(str, ch, len) {
  for (; len > 0; len--) {
    str += ch;
  }

  return str;
}


function Note(coord, duration) {
  if (!(this instanceof Note)) return new Note(coord, duration);
  duration = duration || {};

  this.duration = { value: duration.value || 4, dots: duration.dots || 0 };
  this.coord = coord;
}

Note.prototype = {
  octave: function() {
    return this.coord[0] + knowledge.A4[0] - knowledge.notes[this.name()][0] +
      this.accidentalValue() * 4;
  },

  name: function() {
    return knowledge.fifths[this.coord[1] + knowledge.A4[1] - this.accidentalValue() * 7 + 1];
  },

  accidentalValue: function() {
    return Math.round((this.coord[1] + knowledge.A4[1] - 2) / 7);
  },

  accidental: function() {
    return knowledge.accidentals[this.accidentalValue() + 2];
  },

  /**
   * Returns the key number of the note
   */
  key: function(white) {
    if (white)
      return this.coord[0] * 7 + this.coord[1] * 4 + 29;
    else
      return this.coord[0] * 12 + this.coord[1] * 7 + 49;
  },

  /**
  * Returns a number ranging from 0-127 representing a MIDI note value
  */
  midi: function() {
    return this.key() + 20;
  },

  /**
   * Calculates and returns the frequency of the note.
   * Optional concert pitch (def. 440)
   */
  fq: function(concertPitch) {
    concertPitch = concertPitch || 440;

    return concertPitch *
      Math.pow(2, (this.coord[0] * 12 + this.coord[1] * 7) / 12);
  },

  /**
   * Returns the pitch class index (chroma) of the note
   */
  chroma: function() {
    var value = (vector.sum(vector.mul(this.coord, [12, 7])) - 3) % 12;

    return (value < 0) ? value + 12 : value;
  },

  interval: function(interval) {
    if (typeof interval === 'string') interval = Interval.toCoord(interval);

    if (interval instanceof Interval)
      return new Note(vector.add(this.coord, interval.coord));
    else if (interval instanceof Note)
      return new Interval(vector.sub(interval.coord, this.coord));
  },

  transpose: function(interval) {
    this.coord = vector.add(this.coord, interval.coord);
    return this;
  },

  /**
   * Returns the Helmholtz notation form of the note (fx C,, d' F# g#'')
   */
  helmholtz: function() {
    var octave = this.octave();
    var name = this.name();
    name = octave < 3 ? name.toUpperCase() : name.toLowerCase();
    var padchar = octave < 3 ? ',' : '\'';
    var padcount = octave < 2 ? 2 - octave : octave - 3;

    return pad(name + this.accidental(), padchar, padcount);
  },

  /**
   * Returns the scientific notation form of the note (fx E4, Bb3, C#7 etc.)
   */
  scientific: function() {
    return this.name().toUpperCase() + this.accidental() + this.octave();
  },

  /**
   * Returns notes that are enharmonic with this note.
   */
  enharmonics: function(oneaccidental) {
    var key = this.key(), limit = oneaccidental ? 2 : 3;

    return ['m3', 'm2', 'm-2', 'm-3']
      .map(this.interval.bind(this))
      .filter(function(note) {
      var acc = note.accidentalValue();
      var diff = key - (note.key() - acc);

      if (diff < limit && diff > -limit) {
        note.coord = vector.add(note.coord, vector.mul(knowledge.sharp, diff - acc));
        return true;
      }
    });
  },

  solfege: function(scale, showOctaves) {
    var interval = scale.tonic.interval(this), solfege, stroke, count;
    if (interval.direction() === 'down')
      interval = interval.invert();

    if (showOctaves) {
      count = (this.key(true) - scale.tonic.key(true)) / 7;
      count = (count >= 0) ? Math.floor(count) : -(Math.ceil(-count));
      stroke = (count >= 0) ? '\'' : ',';
    }

    solfege = knowledge.intervalSolfege[interval.simple(true).toString()];
    return (showOctaves) ? pad(solfege, stroke, Math.abs(count)) : solfege;
  },

  scaleDegree: function(scale) {
    var inter = scale.tonic.interval(this);

    // If the direction is down, or we're dealing with an octave - invert it
    if (inter.direction() === 'down' ||
       (inter.coord[1] === 0 && inter.coord[0] !== 0)) {
      inter = inter.invert();
    }

    inter = inter.simple(true).coord;

    return scale.scale.reduce(function(index, current, i) {
      var coord = Interval.toCoord(current).coord;
      return coord[0] === inter[0] && coord[1] === inter[1] ? i + 1 : index;
    }, 0);
  },

  /**
   * Returns the name of the duration value,
   * such as 'whole', 'quarter', 'sixteenth' etc.
   */
  durationName: function() {
    return knowledge.durations[this.duration.value];
  },

  /**
   * Returns the duration of the note (including dots)
   * in seconds. The first argument is the tempo in beats
   * per minute, the second is the beat unit (i.e. the
   * lower numeral in a time signature).
   */
  durationInSeconds: function(bpm, beatUnit) {
    var secs = (60 / bpm) / (this.duration.value / 4) / (beatUnit / 4);
    return secs * 2 - secs / Math.pow(2, this.duration.dots);
  },

  /**
   * Returns the name of the note, with an optional display of octave number
   */
  toString: function(dont) {
    return this.name() + this.accidental() + (dont ? '' : this.octave());
  }
};

Note.fromString = function(name, dur) {
  var coord = scientific(name);
  if (!coord) coord = helmholtz(name);
  return new Note(coord, dur);
}

Note.fromKey = function(key) {
  var octave = Math.floor((key - 4) / 12);
  var distance = key - (octave * 12) - 4;
  var name = knowledge.fifths[(2 * Math.round(distance / 2) + 1) % 7];
  var note = vector.add(vector.sub(knowledge.notes[name], knowledge.A4), [octave + 1, 0]);
  var diff = (key - 49) - vector.sum(vector.mul(note, [12, 7]));

  return new Note(diff ? vector.add(note, vector.mul(knowledge.sharp, diff)) : note);
}

Note.fromFrequency = function(fq, concertPitch) {
  var key, cents, originalFq;
  concertPitch = concertPitch || 440;

  key = 49 + 12 * ((Math.log(fq) - Math.log(concertPitch)) / Math.log(2));
  key = Math.round(key);
  originalFq = concertPitch * Math.pow(2, (key - 49) / 12);
  cents = 1200 * (Math.log(fq / originalFq) / Math.log(2));

  return { note: Note.fromKey(key), cents: cents };
}

Note.fromMIDI = function(note) {
  return Note.fromKey(note - 20);
}

module.exports = Note;

},{"./interval":10,"./knowledge":11,"./vector":15,"helmholtz":17,"scientific-notation":21}],13:[function(require,module,exports){
var knowledge = require('./knowledge');
var Interval = require('./interval');

var scales = {
  aeolian: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  blues: ['P1', 'm3', 'P4', 'A4', 'P5', 'm7'],
  chromatic: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'],
  dorian: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
  doubleharmonic: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'],
  harmonicminor: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
  ionian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
  locrian: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
  lydian: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
  majorpentatonic: ['P1', 'M2', 'M3', 'P5', 'M6'],
  melodicminor: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
  minorpentatonic: ['P1', 'm3', 'P4', 'P5', 'm7'],
  mixolydian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
  phrygian: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7']
}

// synonyms
scales.harmonicchromatic = scales.chromatic;
scales.minor = scales.aeolian;
scales.major = scales.ionian;
scales.flamenco = scales.doubleharmonic;

function Scale(tonic, scale) {
  if (!(this instanceof Scale)) return new Scale(tonic, scale);
  var scaleName, i;
  if (!('coord' in tonic)) {
    throw new Error('Invalid Tonic');
  }

  if (typeof scale === 'string') {
    scaleName = scale;
    scale = scales[scale];
    if (!scale)
      throw new Error('Invalid Scale');
  } else {
    for (i in scales) {
      if (scales.hasOwnProperty(i)) {
        if (scales[i].toString() === scale.toString()) {
          scaleName = i;
          break;
        }
      }
    }
  }

  this.name = scaleName;
  this.tonic = tonic;
  this.scale = scale;
}

Scale.prototype = {
  notes: function() {
    var notes = [];

    for (var i = 0, length = this.scale.length; i < length; i++) {
      notes.push(this.tonic.interval(this.scale[i]));
    }

    return notes;
  },

  simple: function() {
    return this.notes().map(function(n) { return n.toString(true); });
  },

  type: function() {
    var length = this.scale.length - 2;
    if (length < 8) {
      return ['di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa'][length] +
        'tonic';
    }
  },

  get: function(i) {
    i = (typeof i === 'string' && i in knowledge.stepNumber) ? knowledge.stepNumber[i] : i;

    return this.tonic.interval(this.scale[i - 1]);
  },

  solfege: function(index, showOctaves) {
    if (index)
      return this.get(index).solfege(this, showOctaves);

    return this.notes().map(function(n) {
      return n.solfege(this, showOctaves);
    });
  },

  interval: function(interval) {
    interval = (typeof interval === 'string') ?
      Interval.toCoord(interval) : interval;
    return new Scale(this.tonic.interval(interval), this.scale);
  },

  transpose: function(interval) {
    var scale = this.interval(interval);
    this.scale = scale.scale;
    this.tonic = scale.tonic;

    return this;
  }
};

module.exports = Scale;

},{"./interval":10,"./knowledge":11}],14:[function(require,module,exports){
var knowledge = require('./knowledge');

module.exports = function(teoria) {
  var Note = teoria.Note;
  var Chord = teoria.Chord;
  var Scale = teoria.Scale;

  Note.prototype.chord = function(chord) {
    chord = (chord in knowledge.chordShort) ? knowledge.chordShort[chord] : chord;

    return new Chord(this, chord);
  }

  Note.prototype.scale = function(scale) {
    return new Scale(this, scale);
  }
}

},{"./knowledge":11}],15:[function(require,module,exports){
module.exports = {
  add: function(note, interval) {
    return [note[0] + interval[0], note[1] + interval[1]];
  },

  sub: function(note, interval) {
    return [note[0] - interval[0], note[1] - interval[1]];
  },

  mul: function(note, interval) {
    if (typeof interval === 'number')
      return [note[0] * interval, note[1] * interval];
    else
      return [note[0] * interval[0], note[1] * interval[1]];
  },

  sum: function(coord) {
    return coord[0] + coord[1];
  }
}

},{}],16:[function(require,module,exports){
var SYMBOLS = {
  'm': ['m3', 'P5'],
  'mi': ['m3', 'P5'],
  'min': ['m3', 'P5'],
  '-': ['m3', 'P5'],

  'M': ['M3', 'P5'],
  'ma': ['M3', 'P5'],
  '': ['M3', 'P5'],

  '+': ['M3', 'A5'],
  'aug': ['M3', 'A5'],

  'dim': ['m3', 'd5'],
  'o': ['m3', 'd5'],

  'maj': ['M3', 'P5', 'M7'],
  'dom': ['M3', 'P5', 'm7'],
  'ø': ['m3', 'd5', 'm7'],

  '5': ['P5'],

  '6/9': ['M3', 'P5', 'M6', 'M9']
};

module.exports = function(symbol) {
  var c, parsing = 'quality', additionals = [], name, chordLength = 2
  var notes = ['P1', 'M3', 'P5', 'm7', 'M9', 'P11', 'M13'];
  var explicitMajor = false;

  function setChord(name) {
    var intervals = SYMBOLS[name];
    for (var i = 0, len = intervals.length; i < len; i++) {
      notes[i + 1] = intervals[i];
    }

    chordLength = intervals.length;
  }

  // Remove whitespace, commas and parentheses
  symbol = symbol.replace(/[,\s\(\)]/g, '');
  for (var i = 0, len = symbol.length; i < len; i++) {
    if (!(c = symbol[i]))
      return;

    if (parsing === 'quality') {
      var sub3 = (i + 2) < len ? symbol.substr(i, 3).toLowerCase() : null;
      var sub2 = (i + 1) < len ? symbol.substr(i, 2).toLowerCase() : null;
      if (sub3 in SYMBOLS)
        name = sub3;
      else if (sub2 in SYMBOLS)
        name = sub2;
      else if (c in SYMBOLS)
        name = c;
      else
        name = '';

      if (name)
        setChord(name);

      if (name === 'M' || name === 'ma' || name === 'maj')
        explicitMajor = true;


      i += name.length - 1;
      parsing = 'extension';
    } else if (parsing === 'extension') {
      c = (c === '1' && symbol[i + 1]) ? +symbol.substr(i, 2) : +c;

      if (!isNaN(c) && c !== 6) {
        chordLength = (c - 1) / 2;

        if (chordLength !== Math.round(chordLength))
          return new Error('Invalid interval extension: ' + c.toString(10));

        if (name === 'o' || name === 'dim')
          notes[3] = 'd7';
        else if (explicitMajor)
          notes[3] = 'M7';

        i += c >= 10 ? 1 : 0;
      } else if (c === 6) {
        notes[3] = 'M6';
        chordLength = Math.max(3, chordLength);
      } else
        i -= 1;

      parsing = 'alterations';
    } else if (parsing === 'alterations') {
      var alterations = symbol.substr(i).split(/(#|b|add|maj|sus|M)/i),
          next, flat = false, sharp = false;

      if (alterations.length === 1)
        return new Error('Invalid alteration');
      else if (alterations[0].length !== 0)
        return new Error('Invalid token: \'' + alterations[0] + '\'');

      var ignore = false;
      alterations.forEach(function(alt, i, arr) {
        if (ignore || !alt.length)
          return ignore = false;

        var next = arr[i + 1], lower = alt.toLowerCase();
        if (alt === 'M' || lower === 'maj') {
          if (next === '7')
            ignore = true;

          chordLength = Math.max(3, chordLength);
          notes[3] = 'M7';
        } else if (lower === 'sus') {
          var type = 'P4';
          if (next === '2' || next === '4') {
            ignore = true;

            if (next === '2')
              type = 'M2';
          }

          notes[1] = type; // Replace third with M2 or P4
        } else if (lower === 'add') {
          if (next === '9')
            additionals.push('M9');
          else if (next === '11')
            additionals.push('P11');
          else if (next === '13')
            additionals.push('M13');

          ignore = true
        } else if (lower === 'b') {
          flat = true;
        } else if (lower === '#') {
          sharp = true;
        } else {
          var token = +alt, quality, intPos;
          if (isNaN(token) || String(token).length !== alt.length)
            return new Error('Invalid token: \'' + alt + '\'');

          if (token === 6) {
            if (sharp)
              notes[3] = 'A6';
            else if (flat)
              notes[3] = 'm6';
            else
              notes[3] = 'M6';

            chordLength = Math.max(3, chordLength);
            return;
          }

          // Calculate the position in the 'note' array
          intPos = (token - 1) / 2;
          if (chordLength < intPos)
            chordLength = intPos;

          if (token < 5 || token === 7 || intPos !== Math.round(intPos))
            return new Error('Invalid interval alteration: ' + token);

          quality = notes[intPos][0];

          // Alterate the quality of the interval according the accidentals
          if (sharp) {
            if (quality === 'd')
              quality = 'm';
            else if (quality === 'm')
              quality = 'M';
            else if (quality === 'M' || quality === 'P')
              quality = 'A';
          } else if (flat) {
            if (quality === 'A')
              quality = 'M';
            else if (quality === 'M')
              quality = 'm';
            else if (quality === 'm' || quality === 'P')
              quality = 'd';
          }

          sharp = flat = false;
          notes[intPos] = quality + token;
        }
      });
      parsing = 'ended';
    } else if (parsing === 'ended') {
      break;
    }
  }

  return notes.slice(0, chordLength + 1).concat(additionals);
}

},{}],17:[function(require,module,exports){
var coords = require('notecoord');
var accval = require('accidental-value');

module.exports = function helmholtz(name) {
  var name = name.replace(/\u2032/g, "'").replace(/\u0375/g, ',');
  var parts = name.match(/^(,*)([a-h])(x|#|bb|b?)([,\']*)$/i);

  if (!parts || name !== parts[0])
    throw new Error('Invalid formatting');

  var note = parts[2];
  var octaveFirst = parts[1];
  var octaveLast = parts[4];
  var lower = note === note.toLowerCase();
  var octave;

  if (octaveFirst) {
    if (lower)
      throw new Error('Invalid formatting - found commas before lowercase note');

    octave = 2 - octaveFirst.length;
  } else if (octaveLast) {
    if (octaveLast.match(/^'+$/) && lower)
      octave = 3 + octaveLast.length;
    else if (octaveLast.match(/^,+$/) && !lower)
      octave = 2 - octaveLast.length;
    else
      throw new Error('Invalid formatting - mismatch between octave ' +
        'indicator and letter case')
  } else
    octave = lower ? 3 : 2;

  var accidentalValue = accval.interval(parts[3].toLowerCase());
  var coord = coords(note.toLowerCase());

  coord[0] += octave;
  coord[0] += accidentalValue[0] - coords.A4[0];
  coord[1] += accidentalValue[1] - coords.A4[1];

  return coord;
};

},{"accidental-value":18,"notecoord":19}],18:[function(require,module,exports){
var accidentalValues = {
  'bb': -2,
  'b': -1,
  '': 0,
  '#': 1,
  'x': 2
};

module.exports = function accidentalNumber(acc) {
  return accidentalValues[acc];
}

module.exports.interval = function accidentalInterval(acc) {
  var val = accidentalValues[acc];
  return [-4 * val, 7 * val];
}

},{}],19:[function(require,module,exports){
// First coord is octaves, second is fifths. Distances are relative to c
var notes = {
  c: [0, 0],
  d: [-1, 2],
  e: [-2, 4],
  f: [1, -1],
  g: [0, 1],
  a: [-1, 3],
  b: [-2, 5],
  h: [-2, 5]
};

module.exports = function(name) {
  return name in notes ? [notes[name][0], notes[name][1]] : null;
};

module.exports.notes = notes;
module.exports.A4 = [3, 3]; // Relative to C0 (scientic notation, ~16.35Hz)
module.exports.sharp = [-4, 7];

},{}],20:[function(require,module,exports){
var pattern = /^(AA|A|P|M|m|d|dd)(-?\d+)$/;

// The interval it takes to raise a note a semitone
var sharp = [-4, 7];

var pAlts = ['dd', 'd', 'P', 'A', 'AA'];
var mAlts = ['dd', 'd', 'm', 'M', 'A', 'AA'];

var baseIntervals = [
  [0, 0],
  [3, -5],
  [2, -3],
  [1, -1],
  [0, 1],
  [3, -4],
  [2, -2],
  [1, 0]
];

module.exports = function(simple) {
  var parser = simple.match(pattern);
  if (!parser) return null;

  var quality = parser[1];
  var number = +parser[2];
  var sign = number < 0 ? -1 : 1;

  number = sign < 0 ? -number : number;

  var lower = number > 8 ? (number % 7 || 7) : number;
  var octaves = (number - lower) / 7;

  var base = baseIntervals[lower - 1];
  var alts = base[0] <= 1 ? pAlts : mAlts;
  var alt = alts.indexOf(quality) - 2;

  // this happens, if the alteration wasn't suitable for this type
  // of interval, such as P2 or M5 (no "perfect second" or "major fifth")
  if (alt === -3) return null;

  return [
    sign * (base[0] + octaves + sharp[0] * alt),
    sign * (base[1] + sharp[1] * alt)
  ];
}

// Copy to avoid overwriting internal base intervals
module.exports.coords = baseIntervals.slice(0);

},{}],21:[function(require,module,exports){
var coords = require('notecoord');
var accval = require('accidental-value');

module.exports = function scientific(name) {
  var format = /^([a-h])(x|#|bb|b?)(-?\d*)/i;

  parser = name.match(format);
  if (!(parser && name === parser[0] && parser[3].length)) return;

  var noteName = parser[1];
  var octave = +parser[3];
  var accidental = parser[2].length ? parser[2].toLowerCase() : '';

  var accidentalValue = accval.interval(accidental);
  var coord = coords(noteName.toLowerCase());

  coord[0] += octave;
  coord[0] += accidentalValue[0] - coords.A4[0];
  coord[1] += accidentalValue[1] - coords.A4[1];

  return coord;
};

},{"accidental-value":22,"notecoord":23}],22:[function(require,module,exports){
arguments[4][18][0].apply(exports,arguments)
},{"dup":18}],23:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19}],24:[function(require,module,exports){
(function (global){
/*global require, module */
'use strict';

var marked0$0 = [fixup_chords].map(regeneratorRuntime.mark);
var teoria = require('teoria'),
    teoriaChordProgression = require('teoria-chord-progression');

var notes = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#'];
var real_notes = {};
var _iteratorNormalCompletion = true;
var _didIteratorError = false;
var _iteratorError = undefined;

try {
  for (var _iterator = notes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
    var n = _step.value;

    real_notes[n] = true;
  }
} catch (err) {
  _didIteratorError = true;
  _iteratorError = err;
} finally {
  try {
    if (!_iteratorNormalCompletion && _iterator['return']) {
      _iterator['return']();
    }
  } finally {
    if (_didIteratorError) {
      throw _iteratorError;
    }
  }
}

var progressions = {
  'Eight bar blues': [1, 5, 4, 4, 1, 5, 1, 5],
  'Canon': [1, 5, 6, 3, 4, 1, 4, 5],
  'I V vi IV': [1, 5, 6, 4],
  'vi V IV V': [6, 5, 4, 5],
  'I V IV V': [1, 5, 4, 5]
};

function canonify_note(note) {
  var name = note.toString(true);
  return name[0].toUpperCase() + name.substr(1);
}

function fixup_chords(chords) {
  var _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, chord, eh, _iteratorNormalCompletion3, _didIteratorError3, _iteratorError3, _iterator3, _step3, note;

  return regeneratorRuntime.wrap(function fixup_chords$(context$1$0) {
    while (1) switch (context$1$0.prev = context$1$0.next) {
      case 0:
        _iteratorNormalCompletion2 = true;
        _didIteratorError2 = false;
        _iteratorError2 = undefined;
        context$1$0.prev = 3;
        _iterator2 = chords[Symbol.iterator]();

      case 5:
        if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
          context$1$0.next = 44;
          break;
        }

        chord = _step2.value;

        if (!(canonify_note(chord.root) in real_notes)) {
          context$1$0.next = 12;
          break;
        }

        context$1$0.next = 10;
        return chord;

      case 10:
        context$1$0.next = 41;
        break;

      case 12:
        eh = chord.root.enharmonics(true);
        _iteratorNormalCompletion3 = true;
        _didIteratorError3 = false;
        _iteratorError3 = undefined;
        context$1$0.prev = 16;
        _iterator3 = eh[Symbol.iterator]();

      case 18:
        if (_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done) {
          context$1$0.next = 27;
          break;
        }

        note = _step3.value;

        if (!(canonify_note(note) in real_notes)) {
          context$1$0.next = 24;
          break;
        }

        context$1$0.next = 23;
        return note.chord(chord.symbol);

      case 23:
        return context$1$0.abrupt('break', 27);

      case 24:
        _iteratorNormalCompletion3 = true;
        context$1$0.next = 18;
        break;

      case 27:
        context$1$0.next = 33;
        break;

      case 29:
        context$1$0.prev = 29;
        context$1$0.t0 = context$1$0['catch'](16);
        _didIteratorError3 = true;
        _iteratorError3 = context$1$0.t0;

      case 33:
        context$1$0.prev = 33;
        context$1$0.prev = 34;

        if (!_iteratorNormalCompletion3 && _iterator3['return']) {
          _iterator3['return']();
        }

      case 36:
        context$1$0.prev = 36;

        if (!_didIteratorError3) {
          context$1$0.next = 39;
          break;
        }

        throw _iteratorError3;

      case 39:
        return context$1$0.finish(36);

      case 40:
        return context$1$0.finish(33);

      case 41:
        _iteratorNormalCompletion2 = true;
        context$1$0.next = 5;
        break;

      case 44:
        context$1$0.next = 50;
        break;

      case 46:
        context$1$0.prev = 46;
        context$1$0.t1 = context$1$0['catch'](3);
        _didIteratorError2 = true;
        _iteratorError2 = context$1$0.t1;

      case 50:
        context$1$0.prev = 50;
        context$1$0.prev = 51;

        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
          _iterator2['return']();
        }

      case 53:
        context$1$0.prev = 53;

        if (!_didIteratorError2) {
          context$1$0.next = 56;
          break;
        }

        throw _iteratorError2;

      case 56:
        return context$1$0.finish(53);

      case 57:
        return context$1$0.finish(50);

      case 58:
      case 'end':
        return context$1$0.stop();
    }
  }, marked0$0[0], this, [[3, 46, 50, 58], [16, 29, 33, 41], [34,, 36, 40], [51,, 53, 57]]);
}

function get_progression(tonic, scale, progression) {
  var chord_names = [];
  var _iteratorNormalCompletion4 = true;
  var _didIteratorError4 = false;
  var _iteratorError4 = undefined;

  try {
    for (var _iterator4 = fixup_chords(teoriaChordProgression(teoria.scale(tonic, scale), progression).getChords())[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
      var chord = _step4.value;

      chord_names.push(chord.name);
    }
  } catch (err) {
    _didIteratorError4 = true;
    _iteratorError4 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion4 && _iterator4['return']) {
        _iterator4['return']();
      }
    } finally {
      if (_didIteratorError4) {
        throw _iteratorError4;
      }
    }
  }

  return chord_names;
}

global.progressions = {
  notes: notes,
  progressions: progressions,
  get_progression: get_progression
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"teoria":8,"teoria-chord-progression":1}]},{},[24]);
