// this was derived experimentally to match Andre Michelle's
// I've no idea how it works out as this...
// it doesn't seem to appear in the ActionScript code anywhere...
var timeUnit = 0.12;

// Create sound samples for the current part of the strum sequence,
// and queue generation of sound samples of the following part.
// The rhythms parts have as fine a granularity as possible to enable
// adjustment of guitar parameters with real-time feedback.
// (The higher strumGenerationsPerRun, the longer the delay between
//  parameter adjustments and samples created with the new parameters.)
function queueStrums(chords, sequenceN, blockStartTime, chordIndex, precacheTime) {
    var playState = document.getElementById("playState").value;
    if (playState == "stopped") {
        return;
    }

    var curStrumStartTime;

    var chord = chords[chordIndex];
    switch(sequenceN % 13) {
        case 0:
            curStrumStartTime = blockStartTime + timeUnit * 0;
            guitar.strumChord(curStrumStartTime,  true,  1.0, chord);
            break;
        case 1:
            curStrumStartTime = blockStartTime + timeUnit * 4;
            guitar.strumChord(curStrumStartTime,  true,  1.0, chord);
            break;
        case 2:
            curStrumStartTime = blockStartTime + timeUnit * 6;
            guitar.strumChord(curStrumStartTime,  false, 0.8, chord);
            break;
        case 3:
            curStrumStartTime = blockStartTime + timeUnit * 10;
            guitar.strumChord(curStrumStartTime, false, 0.8, chord);
            break;
        case 4:
            curStrumStartTime = blockStartTime + timeUnit * 12;
            guitar.strumChord(curStrumStartTime, true,  1.0, chord);
            break;
        case 5:
            curStrumStartTime = blockStartTime + timeUnit * 14;
            guitar.strumChord(curStrumStartTime, false, 0.8, chord);
            break;
        case 6:
            chordIndex = (chordIndex + 1) % chords.length;
            blockStartTime += timeUnit*16;
            break;
    }
    sequenceN++;

    // if we're only generating the next strum 200 ms ahead of the current time,
    // we might be falling behind, so increase the precache time
    if (curStrumStartTime - audioCtx.currentTime < 0.2) {
        precacheTime += 0.1;
    }
    document.getElementById("precacheTime").innerHTML =
        precacheTime.toFixed(1) + " seconds";

    // we try to main a constant time between when the strum
    // has finished generated and when it actually plays
    // the next strum will be played at curStrumStartTime; so start
    // generating the one after the next strum at precacheTime before
    var generateIn = curStrumStartTime - audioCtx.currentTime - precacheTime;
    if (generateIn < 0)
        generateIn = 0;

    nextGenerationCall = function() {
        queueStrums(chords, sequenceN, blockStartTime, chordIndex, precacheTime);
    };
    setTimeout(nextGenerationCall, generateIn * 1000);
}

function startGuitarPlaying(chords) {
    var startSequenceN = 0;
    var blockStartTime = audioCtx.currentTime;
    var startChordIndex = 0;
    var precacheTime = 0.0;
    queueStrums(chords, startSequenceN, blockStartTime, startChordIndex, precacheTime);
}
