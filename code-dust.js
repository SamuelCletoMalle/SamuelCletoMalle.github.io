/* Polvo de código: caracteres dorados que flotan detrás de toda la web.
   Suben despacio, se mueven con el scroll a distintas profundidades y se apartan del ratón. */
(function () {
  var host = document.querySelector('.bg');
  if (!host) return;
  var canvas = document.createElement('canvas');
  canvas.className = 'dust';
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  host.appendChild(canvas);

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CHARS = '{}()[]<>;:=+*/01#$&!?.';
  var W = 0, H = 0, dpr = 1, ps = [], raf = 0, last = 0, mx = -999, my = -999;

  function color() {
    var light = document.documentElement.getAttribute('data-theme') === 'light';
    return light ? [150, 80, 20] : [255, 190, 110];
  }
  var rgb = color();

  function make(i, n) {
    var z = Math.random();                     // profundidad: 0 lejos, 1 cerca
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      z: z,
      s: 8 + z * 9,                            // tamaño
      v: 0.08 + z * 0.35,                      // velocidad de subida
      a: 0.08 + z * 0.32,                      // opacidad
      c: Math.random() < 0.35 ? '·' : CHARS[(Math.random() * CHARS.length) | 0],
      ph: Math.random() * 6.28, ox: 0, oy: 0
    };
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    var n = Math.round(Math.min(150, (W * H) / 9000));
    ps = [];
    for (var i = 0; i < n; i++) ps.push(make(i, n));
    draw(0);
  }

  function draw(dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var sy = window.scrollY || 0;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (dt) {
        p.y -= p.v * dt;
        p.ph += 0.0015 * dt;
        if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
        // el ratón empuja un poco las partículas cercanas
        var px = p.x + Math.sin(p.ph) * 6 * p.z, py = ((p.y - sy * p.z * 0.25) % (H + 40) + H + 40) % (H + 40) - 20;
        var dx = px + p.ox - mx, dy = py + p.oy - my, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { var d = Math.sqrt(d2) || 1, f = (1 - d / 118) * 2.2; p.ox += dx / d * f; p.oy += dy / d * f; }
        p.ox *= 0.94; p.oy *= 0.94;
      }
      var x = p.x + Math.sin(p.ph) * 6 * p.z + p.ox;
      var y = ((p.y - sy * p.z * 0.25) % (H + 40) + H + 40) % (H + 40) - 20 + p.oy;
      ctx.globalAlpha = p.a;
      ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
      ctx.font = '500 ' + p.s.toFixed(0) + 'px "Geist Mono", ui-monospace, monospace';
      ctx.fillText(p.c, x, y);
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    var dt = last ? Math.min(50, now - last) / 16.7 : 1;
    last = now;
    draw(dt);
    if (!document.hidden) raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', function () { clearTimeout(resize.t); resize.t = setTimeout(resize, 150); });
  new MutationObserver(function () { rgb = color(); if (reduce) draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if (reduce) { window.addEventListener('scroll', function () { draw(0); }, { passive: true }); return; }
  window.addEventListener('pointermove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', function () { mx = my = -999; });
  document.addEventListener('visibilitychange', function () { last = 0; if (!document.hidden && !raf) raf = requestAnimationFrame(loop); });
  raf = requestAnimationFrame(loop);
})();
