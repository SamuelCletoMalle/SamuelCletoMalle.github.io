/* Música del Olimpo: "Temple Ambient" en bucle, bajita.
   - Arranca sola (o con el primer clic si el navegador lo bloquea); el botón de la lira la para.
   - Se reproduce con Web Audio para que el bucle no tenga cortes.
   - Cuando la corona de laurel se posa en la estatua suenan unas campanas suaves. */
(function () {
  var btn = document.getElementById('music');
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!btn || !AC) { if (btn) btn.hidden = true; return; }

  var SRC = 'assets/musica/olimpo-loop.mp3?v=1';
  var VOLUMEN = 0.22;        // bajita
  var KEY = 'musica';
  var ctx = null, master = null, song = null, buffer = null, loading = null, playing = false;

  function build() {
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  }
  function load() {
    if (buffer) return Promise.resolve(buffer);
    if (loading) return loading;
    loading = fetch(SRC).then(function (r) { return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (ok, ko) { ctx.decodeAudioData(ab, ok, ko); }); })
      .then(function (b) { buffer = b; return b; });
    return loading;
  }
  function fade(to, sec) {
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + sec);
  }

  function start() {
    if (!ctx) build();
    playing = true; render();
    ctx.resume();
    btn.classList.add('is-loading');
    load().then(function (b) {
      btn.classList.remove('is-loading');
      if (!playing) return;
      if (!song) {
        song = ctx.createBufferSource(); song.buffer = b; song.loop = true;
        song.connect(master); song.start();
      }
      fade(VOLUMEN, 3);
    }).catch(function () { btn.classList.remove('is-loading'); playing = false; render(); });
  }
  function stop() {
    playing = false; render();
    if (!ctx) return;
    fade(0, 1.2);
    setTimeout(function () { if (!playing && ctx) ctx.suspend(); }, 1300);
  }
  function render() {
    btn.classList.toggle('is-on', playing);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
  }
  function save(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }

  btn.addEventListener('click', function () {
    if (playing) { stop(); save(false); } else { start(); save(true); }
  });

  // arranca sola. Si el navegador bloquea el sonido sin interacción,
  // empieza en el primer clic, toque o tecla del visitante (salvo que antes la apagara).
  function autostart() {
    start();
    if (ctx.state === 'running') return;
    var go = function (e) {
      ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (n) { window.removeEventListener(n, go, true); });
      if (e.target && e.target.closest && e.target.closest('#music')) return; // el botón ya decide
      if (playing) { ctx.resume(); } else { start(); }
    };
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach(function (n) { window.addEventListener(n, go, true); });
  }
  if (saved() !== '0') autostart();

  // con la pestaña oculta se pausa
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // campanas suaves cuando la corona se posa
  function bell(f, t, vel) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 * vel, t + .005);
    g.gain.exponentialRampToValueAtTime(.0004, t + 3.5);
    g.connect(master);
    [[1, 1], [2.76, .35], [5.4, .15]].forEach(function (p) {
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * p[0]; og.gain.value = p[1];
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 3.6);
    });
  }
  var hero = document.querySelector('.hero2');
  if (hero) {
    var was = false;
    new MutationObserver(function () {
      var now = hero.classList.contains('is-crowned');
      if (now && !was && playing && ctx) {
        var t = ctx.currentTime + .05;
        [587.3, 740, 880, 1174.7].forEach(function (f, i) { bell(f, t + i * .1, 1 - i * .12); });
      }
      was = now;
    }).observe(hero, { attributes: true, attributeFilter: ['class'] });
  }
})();
