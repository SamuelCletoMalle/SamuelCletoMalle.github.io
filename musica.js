/* Música del Olimpo: banda sonora original generada en directo con Web Audio.
   No descarga ningún archivo de audio: coro, cuerdas, lira, timbales y campanas
   se sintetizan en el navegador. Empieza apagada; se activa con el botón de la lira.
   Cuando la corona de laurel se posa en la estatua suena un acorde de campanas. */
(function () {
  var btn = document.getElementById('music');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var KEY = 'musica';
  var ctx = null, master = null, verb = null, dry = null, timer = 0;
  var playing = false, t0 = 0, nextBar = 0, bar = 0, step = 0, nextStep = 0;
  var BPM = 66, BEAT = 60 / BPM, BAR = BEAT * 4;

  // Re menor heroico: Dm  Bb  F  C | Gm  Bb  C  A
  var PROG = [
    [50, 53, 57, 62], [46, 50, 53, 58], [41, 45, 48, 53], [48, 52, 55, 60],
    [43, 46, 50, 55], [46, 50, 53, 58], [48, 52, 55, 60], [45, 49, 52, 57]
  ];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function impulse(sec, decay) {
    var len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = b.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver(); verb.buffer = impulse(4.2, 2.6);
    var wet = ctx.createGain(); wet.gain.value = .55;
    verb.connect(wet); wet.connect(master);
    dry = ctx.createGain(); dry.gain.value = .6; dry.connect(master);
  }
  function out(node, wetAmt) {
    node.connect(dry);
    if (wetAmt) { var s = ctx.createGain(); s.gain.value = wetAmt; node.connect(s); s.connect(verb); }
  }

  // ---------- instrumentos ----------
  function pad(notes, t, dur) {                       // cuerdas graves y cálidas
    var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = .4;
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.05, t + 2.2); g.gain.setValueAtTime(.05, t + dur - .4);
    g.gain.linearRampToValueAtTime(0, t + dur + 2.5);
    f.connect(g); out(g, .9);
    notes.forEach(function (m) {
      [-7, 7].forEach(function (cents) {
        var o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = hz(m - 12); o.detune.value = cents;
        o.connect(f); o.start(t); o.stop(t + dur + 2.6);
      });
    });
  }
  function choir(notes, t, dur) {                     // coro "aah" con formantes
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.035, t + 2.8); g.gain.setValueAtTime(.035, t + dur - .6);
    g.gain.linearRampToValueAtTime(0, t + dur + 3);
    var f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 760; f1.Q.value = 6;
    var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1180; f2.Q.value = 8;
    f1.connect(g); f2.connect(g); out(g, 1.2);
    var vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 5.2; vg.gain.value = 7;
    vib.connect(vg); vib.start(t); vib.stop(t + dur + 3.1);
    notes.slice(1).forEach(function (m) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m + 12);
      vg.connect(o.detune); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + dur + 3.1);
    });
  }
  function lyre(m, t, vel) {                          // cuerda pulsada
    var g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(900, t + 1.2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09 * vel, t + .004);
    g.gain.exponentialRampToValueAtTime(.0005, t + 2.2);
    f.connect(g); out(g, .7);
    [['triangle', 1, 1], ['sine', 2, .35], ['sine', 3, .12]].forEach(function (p) {
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = p[0];
      o.frequency.value = hz(m) * p[1]; og.gain.value = p[2];
      o.connect(og); og.connect(f); o.start(t); o.stop(t + 2.3);
    });
  }
  function timpani(m, t, vel) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(hz(m) * 1.6, t); o.frequency.exponentialRampToValueAtTime(hz(m), t + .09);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.32 * vel, t + .01);
    g.gain.exponentialRampToValueAtTime(.001, t + 1.8);
    o.connect(g); out(g, .5); o.start(t); o.stop(t + 1.9);
  }
  function bell(m, t, vel) {
    var g = ctx.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.05 * vel, t + .005); g.gain.exponentialRampToValueAtTime(.0004, t + 4);
    out(g, 1.4);
    [[1, 1], [2.76, .4], [5.4, .18]].forEach(function (p) {
      var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sine';
      o.frequency.value = hz(m) * p[0]; og.gain.value = p[1]; o.connect(og); og.connect(g); o.start(t); o.stop(t + 4.1);
    });
  }

  // ---------- composición ----------
  var ARP = [0, 1, 2, 3, 2, 3, 1, 2];
  function scheduleBar(t) {
    var ch = PROG[bar % PROG.length], phase = Math.floor(bar / PROG.length) % 4;
    if (bar % 2 === 0) { pad(ch, t, BAR * 2); if (phase > 0) choir(ch, t, BAR * 2); }
    timpani(ch[0] - 12, t, bar % 2 ? .45 : .8);
    if (bar % 4 === 3) { timpani(ch[0] - 12, t + BEAT * 3.5, .4); timpani(ch[0] - 12, t + BEAT * 3.75, .55); }
    if (phase >= 2 && bar % 2 === 0) bell(ch[3] + 12, t + BEAT * 2, .6);
    bar++;
  }
  function scheduleStep(t) {
    var ch = PROG[Math.floor((t - t0 + .001) / BAR) % PROG.length];
    var i = ARP[step % 8], oct = step % 16 >= 8 ? 24 : 12;
    var hum = (Math.random() - .5) * .012;
    lyre(ch[i] + oct, t + hum, step % 4 === 0 ? 1 : .65);
    step++;
  }
  function tick() {
    var ahead = ctx.currentTime + .35;
    while (nextBar < ahead) { scheduleBar(nextBar); nextBar += BAR; }
    while (nextStep < ahead) { scheduleStep(nextStep); nextStep += BEAT / 2; }
  }

  // bajada del Olimpo: glissando de lira descendente + coro al empezar
  function descent(t) {
    var notes = [86, 84, 81, 79, 77, 74, 72, 69, 67, 65, 62];
    notes.forEach(function (m, i) { lyre(m, t + i * .07, .8 - i * .03); });
    choir(PROG[0], t, BAR * 1.5);
    timpani(38, t + notes.length * .07, 1);
  }
  function crown() {                                   // al coronarse
    if (!playing) return;
    var t = ctx.currentTime + .05;
    [74, 78, 81, 86, 90].forEach(function (m, i) { bell(m, t + i * .09, 1 - i * .1); });
    timpani(38, t, 1);
  }

  function start() {
    if (!ctx) build();
    if (ctx.state === 'suspended') ctx.resume();
    var t = ctx.currentTime + .08;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(1.6, t + 2.5);
    descent(t);
    bar = 0; step = 0; nextBar = t + 1.1; nextStep = nextBar; t0 = nextBar;
    clearInterval(timer); timer = setInterval(tick, 90);
    playing = true; render();
  }
  function stop() {
    if (!ctx) return;
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.2);
    clearInterval(timer); timer = 0; playing = false; render();
    setTimeout(function () { if (!playing && ctx) ctx.suspend(); }, 1400);
  }
  function render() {
    btn.classList.toggle('is-on', playing);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  btn.addEventListener('click', function () {
    btn.classList.remove('is-new');
    if (playing) { stop(); save(false); } else { start(); save(true); }
  });
  if (saved() === null) btn.classList.add('is-new');

  // si la dejó encendida, vuelve a sonar con el primer toque o tecla (los navegadores lo exigen)
  if (saved() === '1') {
    var resume = function () {
      ['pointerdown', 'keydown'].forEach(function (e) { window.removeEventListener(e, resume, true); });
      if (!playing) start();
    };
    ['pointerdown', 'keydown'].forEach(function (e) { window.addEventListener(e, resume, true); });
  }

  document.addEventListener('visibilitychange', function () {
    if (!ctx || !playing) return;
    if (document.hidden) { clearInterval(timer); ctx.suspend(); }
    else { ctx.resume().then(function () { nextBar = Math.max(nextBar, ctx.currentTime + .1); nextStep = Math.max(nextStep, ctx.currentTime + .1); timer = setInterval(tick, 90); }); }
  });

  var hero = document.querySelector('.hero2');
  if (hero) {
    var was = false;
    new MutationObserver(function () {
      var now = hero.classList.contains('is-crowned');
      if (now && !was) crown();
      was = now;
    }).observe(hero, { attributes: true, attributeFilter: ['class'] });
  }
})();
