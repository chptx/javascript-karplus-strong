# JavaScript Karplus-Strong

[Karplus-Strong](http://en.wikipedia.org/wiki/Karplus–Strong_string_synthesis) guitar synthesizer implemented in
JavaScript using asm.js and Web Audio. (Talk about buzzwords!)

This is a reimplementation based on decompiled ActionScript from André Michelle's
[Karplus-Strong Guitar](http://lab.andre-michelle.com/karplus-strong-guitar). Full credit for the algorithm itself
goes to him.

See http://amid.fish/javascript-karplus-strong for a demo, and for an explanation of how Karplus-Strong synthesis works.

For this fork:
The chord progressions are contained in progressions/progressions.js. The copy used by the demo is produced by browserify. To update it you'll need to do:
```
cd progressions; npm install; npm run-script bundle
```
