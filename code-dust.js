/* Polvo de código: caracteres dorados que flotan detrás de toda la web.
   Optimizado: 30 fps como máximo, 3 tamaños de letra (un solo cambio de fuente por tamaño),
   menos partículas en móvil y pausa total con la pestaña oculta o al mover la página rápido. */
(function () {
  var host = document.querySelector('.bg');
  if (!host) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'dust';
  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;
  host.appendChild(canvas);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = matchMedia('(pointer: coarse)').matches;
  var CHARS = '{}()[]<>;:=+*/01#$&!?.';
  var SIZES = [9, 12, 16];
  var W = 0, H = 0, dpr = 1, groups = [[], [], []], raf = 0, last = 0, mx = -999, my = -999;
  var FRAME = 1000 / 20;
  var SLEEP_AFTER = 7000, lastActive = performance.now(); // se duerme si nadie hace nada

  function color() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    return light ? 'rgb(140,105,30)' : 'rgb(232,200,120)';
  }
  var fill = color();

  function resize() {
    W = innerWidth; H = innerHeight;
    dpr = 1; // letras pequeñas y difusas: no hace falta más resolución
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var n = Math.round(Math.min(coarse ? 55 : 120, (W * H) / (coarse ? 14000 : 10000)));
    groups = [[], [], []];
    for (var i = 0; i < n; i++) {
      var g = i % 3, z = (g + Math.random()) / 3;   // grupo = profundidad
      groups[g].push({
        x: Math.random() * W, y: Math.random() * H, z: z,
        v: 0.1 + z * 0.4, a: 0.08 + z * 0.3,
        c: Math.random() < 0.35 ? '·' : CHARS[(Math.random() * CHARS.length) | 0],
        ph: Math.random() * 6.28, ox: 0, oy: 0
      });
    }
    draw(0);
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fill;
    var sy = window.scrollY || 0, span = H + 40;
    for (var g = 0; g < 3; g++) {
      ctx.font = '500 ' + SIZES[g] + 'px "Geist Mono", ui-monospace, monospace';
      var list = groups[g];
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        if (dt) {
          p.y -= p.v * dt;
          p.ph += 0.0015 * dt * 16.7;
          if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        }
        var x = p.x + Math.sin(p.ph) * 6 * p.z;
        var y = ((p.y - sy * p.z * 0.25) % span + span) % span - 20;
        if (dt && mx > -900) {
          var dx = x + p.ox - mx, dy = y + p.oy - my, d2 = dx * dx + dy * dy;
          if (d2 < 14000) { var d = Math.sqrt(d2) || 1, f = (1 - d / 118) * 2.2 * dt; p.ox += dx / d * f; p.oy += dy / d * f; }
        }
        if (dt) { p.ox *= Math.pow(0.94, dt); p.oy *= Math.pow(0.94, dt); }
        ctx.globalAlpha = p.a;
        ctx.fillText(p.c, x + p.ox, y + p.oy);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (now - lastActive > SLEEP_AFTER) { raf = 0; return; }  // dormido hasta la próxima interacción
    raf = requestAnimationFrame(loop);
    if (now - last < FRAME) return;              // 30 fps como máximo
    var dt = last ? Math.min(3, (now - last) / 16.7) : 1;
    last = now;
    draw(dt);
  }
  function start() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  resize();
  window.addEventListener('resize', function () { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  new MutationObserver(function () { fill = color(); draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduce) { window.addEventListener('scroll', function () { requestAnimationFrame(function () { draw(0); }); }, { passive: true }); return; }
  if (!coarse) {
    window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', function () { mx = my = -999; });
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  function wake() { lastActive = performance.now(); start(); }
  ['scroll', 'pointermove', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, wake, { passive: true }); });
  start();
})();
