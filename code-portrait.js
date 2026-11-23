/* Retrato hecho de código.
   La foto se dibuja con caracteres de Java, Python, JavaScript y SQL.
   Al pasar el ratón aparece una lupa que muestra la foto real y aparta las letras.
   Al hacer clic se alterna entre "código" y "foto". */
(function () {
  var tile = document.querySelector('.tile--photo');
  var img = tile && tile.querySelector('.photo__img');
  if (!tile || !img) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'code-portrait';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = matchMedia('(hover: none)').matches;

  var CODE = 'public class Samuel { public static void main(String[] args) { System.out.println("Hola"); } } ' +
    'def aprender(tema): return tema.practicar() for dia in range(365): codigo += 1 ' +
    'const app = () => { return <Balanz /> } import React from "react" ' +
    'SELECT nombre FROM proyectos WHERE estado = "activo"; git commit -m "feat: nueva idea" ' +
    'if (bug) { debug(); } else { deploy(); } while (true) { aprender(); } ';
  var GLITCH = '01{}[]()<>=+*/;:#$%&@?!';

  var W = 0, H = 0, dpr = 1, cw = 8, ch = 10, cols = 0, rows = 0, sil = null;
  var cache = null, cacheOk = false, glitches = []; // imagen de las letras ya colocadas, para el reposo
  var parts = [];            // partículas: una por celda con brillo suficiente
  var running = false, visible = true, raf = 0, idleTimer = 0, t0 = 0, lastT = 0;
  var mouse = { x: -9999, y: -9999, on: false };
  var lens = { x: 0, y: 0, r: 0, target: 0 };
  var photoMode = false;      // true = foto completa
  var reveal = 0;             // 0 código, 1 foto (animado)
  var lastMove = 0;
  var ready = false;

  // Rampa de color según brillo: azul profundo -> cian -> blanco
  function rampColor(l) {
    var stops = [[70, 62, 48], [168, 121, 44], [226, 183, 90], [250, 246, 232]];
    var x = Math.min(0.999, Math.max(0, l)) * (stops.length - 1);
    var i = Math.floor(x), f = x - i, a = stops[i], b = stops[i + 1];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' + Math.round(a[1] + (b[1] - a[1]) * f) + ',' + Math.round(a[2] + (b[2] - a[2]) * f) + ')';
  }

  // Color del carácter: color real de la foto con un toque dorado.
  // En tema claro se oscurece para que se lea sobre el fondo crema.
  function isLight() { return document.documentElement.getAttribute('data-theme') === 'light'; }
  function mixColor(r, g, b, l, m) {
    if (isLight()) {
      var d = 0.42 + 0.25 * (1 - l);
      return 'rgb(' + Math.round(r * d * 0.7 + 90 * 0.3) + ',' + Math.round(g * d * 0.7 + 64 * 0.3) + ',' + Math.round(b * d * 0.7 + 18 * 0.3) + ')';
    }
    var a = rampColor(l).match(/\d+/g);
    var k = 0.6;              // mezcla de color real y dorado
    var boost = 1.35;
    return 'rgb(' + Math.min(255, Math.round((r * boost) * (1 - k) + a[0] * k)) + ',' +
      Math.min(255, Math.round((g * boost) * (1 - k) + a[1] * k)) + ',' +
      Math.min(255, Math.round((b * boost) * (1 - k) + a[2] * k)) + ')';
  }

  // Calcula el recorte tipo object-fit: cover con object-position 50% 18%
  function coverRect(iw, ih, w, h) {
    var s = Math.max(w / iw, h / ih);
    var dw = iw * s, dh = ih * s;
    return { x: (w - dw) * 0.5, y: (h - dh) * 0.18, w: dw, h: dh };
  }

  function build() {
    // tamaño sin transformaciones (la foto puede estar escalada por el scroll)
    W = Math.max(1, Math.round(tile.offsetWidth));
    H = Math.max(1, Math.round(tile.offsetHeight));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';

    cw = Math.max(5.5, Math.min(8.5, W / 54));
    ch = cw * 1.28;
    cols = Math.floor(W / cw);
    rows = Math.floor(H / ch);

    // Muestra la foto a la resolución de la rejilla
    var off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    var o = off.getContext('2d');
    var cr = coverRect(img.naturalWidth, img.naturalHeight, cols * cw, rows * ch);
    o.drawImage(img, cr.x / cw, cr.y / ch, cr.w / cw, cr.h / ch);
    var data;
    try { data = o.getImageData(0, 0, cols, rows).data; }
    catch (e) { return false; } // canvas contaminado (p. ej. abierto como file://)

    // rango de brillo de la persona (la foto viene recortada: se usa la transparencia)
    var inside = [];
    for (var yy = 0; yy < rows * 0.6; yy++) for (var xx = 0; xx < cols; xx++) {
      var j = (yy * cols + xx) * 4;
      if (data[j + 3] > 200) inside.push((0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]) / 255);
    }
    inside.sort(function (a, b) { return a - b; });
    var lo = inside.length ? inside[Math.floor(inside.length * 0.05)] : 0.1;
    var hi = inside.length ? inside[Math.floor(inside.length * 0.97)] : 0.9;
    if (hi - lo < 0.1) hi = lo + 0.1;

    var prev = parts;
    parts = [];
    var k = 0;
    for (var y = 0; y < rows; y++) {
      for (var x = 0; x < cols; x++) {
        var i = (y * cols + x) * 4;
        var A = data[i + 3] / 255;
        if (A < 0.3) continue;                                            // fuera de la silueta: nada
        var R0 = data[i], G0 = data[i + 1], B0 = data[i + 2];
        var l = (0.2126 * R0 + 0.7152 * G0 + 0.0722 * B0) / 255;
        l = Math.min(1, Math.max(0, (l - lo) / (hi - lo)));
        l = Math.pow(l, 1.25);
        var m = A;
        var fade = Math.min(1, (rows - y) / (rows * 0.3));                // los hombros se funden abajo
        // dentro de la silueta hay un mínimo, así el pelo y la ropa oscura se ven
        l = Math.max(l, 0.2 * A);
        l *= A * fade;
        if (l < 0.05) continue;
        var hx = x * cw + cw / 2, hy = y * ch + ch / 2;
        var p = prev[k] && !reduce ? prev[k] : null;
        parts.push({
          hx: hx, hy: hy,
          x: p ? p.x : (reduce ? hx : Math.random() * W),
          y: p ? p.y : (reduce ? hy : H + Math.random() * H * 0.6),
          vx: 0, vy: 0,
          l: l,
          c: CODE[(y * cols + x) % CODE.length],
          col: mixColor(R0, G0, B0, l, m),
          d: reduce ? 0 : (y / rows) * 0.9 + Math.random() * 0.35  // retraso de entrada: de arriba a abajo
        });
        k++;
      }
    }
    sil = document.createElement('canvas');
    sil.width = W * dpr; sil.height = H * dpr;
    var sc = sil.getContext('2d');
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    var crS = coverRect(img.naturalWidth, img.naturalHeight, W, H);
    sc.drawImage(img, crS.x, crS.y, crS.w, crS.h);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = isLight() ? '#f7f6f2' : '#070707';
    sc.fillRect(0, 0, W, H);

    cache = document.createElement('canvas');
    cache.width = canvas.width; cache.height = canvas.height;
    cacheOk = false; glitches = [];

    lens.x = lens.x || W / 2; lens.y = lens.y || H * 0.35;
    return true;
  }

  function step(now) {
    raf = 0;
    if (!t0) t0 = now;
    var t = (now - t0) / 1000;
    // pasos de física según el tiempo real (si el dispositivo va lento, se hacen varios por fotograma)
    var sub = lastT ? Math.max(1, Math.min(4, Math.round((now - lastT) / 16.7))) : 1;
    lastT = now;

    // Lupa: sigue al ratón; en táctil, deriva sola tras un rato sin tocar
    var auto = touch && now - lastMove > 2200 && now - lastMove < 6500; // en móvil solo unos segundos
    if (mouse.on) { var e = 1 - Math.pow(0.75, sub); lens.x += (mouse.x - lens.x) * e; lens.y += (mouse.y - lens.y) * e; lens.target = Math.min(W, H) * 0.2; }
    else if (auto && !reduce) {
      lens.x = W * (0.5 + 0.28 * Math.sin(t * 0.55));
      lens.y = H * (0.36 + 0.16 * Math.sin(t * 0.9 + 1));
      lens.target = Math.min(W, H) * 0.15;
    } else lens.target = 0;
    lens.r += (lens.target - lens.r) * (1 - Math.pow(0.82, sub));

    reveal += ((photoMode ? 1 : 0) - reveal) * (reduce ? 1 : 1 - Math.pow(0.92, sub));

    var quiet = cacheOk && lens.r < 0.5 && lens.target === 0 && reveal < 0.001;
    if (quiet) { idleFrame(t); return schedule(true, true); }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (sil) {
      // la silueta aparece a la vez que las letras
      ctx.globalAlpha = Math.min(1, reduce ? 1 : t / 1.2) * 0.94;
      ctx.drawImage(sil, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // Letras
    var R = lens.r * 1.35, R2 = R * R;
    var fs = ch * 1.0;
    ctx.font = '500 ' + fs.toFixed(1) + 'px "Geist Mono", ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var alive = 1 - reveal;
    var lightNow = isLight();
    var settled = true;
    if (alive > 0.01) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!reduce) {
          var tt = t - p.d;
          if (tt < 0) { settled = false; continue; }
          for (var n = 0; n < sub; n++) {
            var ax = (p.hx - p.x) * 0.055, ay = (p.hy - p.y) * 0.055;
            if (lens.r > 2) {
              var dx = p.x - lens.x, dy = p.y - lens.y, d2 = dx * dx + dy * dy;
              if (d2 < R2 && d2 > 0.01) {
                var d = Math.sqrt(d2), f = (1 - d / R) * 7.5;
                ax += dx / d * f; ay += dy / d * f;
              }
            }
            p.vx = (p.vx + ax) * 0.8; p.vy = (p.vy + ay) * 0.8;
            p.x += p.vx; p.y += p.vy;
          }
          if (Math.abs(p.vx) + Math.abs(p.vy) > 0.05) settled = false;
          // parpadeo: alguna letra cambia de vez en cuando
          if (Math.random() < 0.0016) p.g = GLITCH[(Math.random() * GLITCH.length) | 0];
          else if (p.g && Math.random() < 0.04) p.g = null;
        }
        ctx.globalAlpha = Math.min(1, (lightNow ? 0.62 : 0.32) + p.l * 1.15) * alive;
        ctx.fillStyle = p.g ? '#fff6dc' : p.col;
        ctx.fillText(p.g || p.c, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;

    // en cuanto las letras se quedan quietas, se guarda la imagen para el reposo
    if (!reduce && settled && t > 2 && lens.r < 0.5 && lens.target === 0 && reveal < 0.001 && cache) {
      var cc = cache.getContext('2d');
      cc.setTransform(1, 0, 0, 1, 0, 0);
      cc.clearRect(0, 0, cache.width, cache.height);
      cc.drawImage(canvas, 0, 0);
      cacheOk = true;
    } else if (!settled || lens.r >= 0.5) cacheOk = false;

    // Foto real: dentro de la lupa, o entera en modo foto
    var cr = coverRect(img.naturalWidth, img.naturalHeight, W, H);
    var photoR = Math.max(lens.r, reveal * Math.hypot(W, H));
    if (photoR > 1.5) {
      ctx.save();
      ctx.beginPath();
      var cx = reveal > 0.01 && lens.r < 2 ? W / 2 : lens.x, cy = reveal > 0.01 && lens.r < 2 ? H * 0.35 : lens.y;
      ctx.arc(cx, cy, photoR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cr.x, cr.y, cr.w, cr.h);
      ctx.restore();
      if (lens.r > 2 && reveal < 0.95) {
        // borde de cristal de la lupa
        ctx.beginPath();
        ctx.arc(lens.x, lens.y, lens.r, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.shadowColor = 'rgba(226,183,90,.9)'; ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;
        var g = ctx.createRadialGradient(lens.x - lens.r * 0.35, lens.y - lens.r * 0.45, 0, lens.x, lens.y, lens.r);
        g.addColorStop(0, 'rgba(255,255,255,.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fill();
      }
    }

    // Línea de escaneo muy suave
    if (!reduce && alive > 0.5) {
      var sy = ((t * 70) % (H + 120)) - 60;
      var sg = ctx.createLinearGradient(0, sy - 60, 0, sy + 2);
      sg.addColorStop(0, 'rgba(255,236,180,0)'); sg.addColorStop(1, 'rgba(255,236,180,.55)');
      ctx.globalCompositeOperation = 'source-atop'; // solo ilumina las letras, no el fondo
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 60, W, 62);
      ctx.globalCompositeOperation = 'source-over';
    }

    var needMore = !reduce && (!settled || lens.r > 0.5 || lens.target > 0 || Math.abs(reveal - (photoMode ? 1 : 0)) > 0.002 || alive > 0.01);
    var idle = settled && lens.r < 0.5 && lens.target === 0 && Math.abs(reveal - (photoMode ? 1 : 0)) < 0.002;
    schedule(needMore, idle);
  }

  // Reposo: se pinta la imagen guardada, unas pocas letras que parpadean y la línea de escaneo
  function idleFrame(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cache, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var now = performance.now();
    if (parts.length && Math.random() < 0.6) glitches.push({ p: parts[(Math.random() * parts.length) | 0], until: now + 120 + Math.random() * 260, c: GLITCH[(Math.random() * GLITCH.length) | 0] });
    if (glitches.length) {
      ctx.font = '500 ' + ch.toFixed(1) + 'px "Geist Mono", ui-monospace, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var bg = isLight() ? '#f7f6f2' : '#070707';
      glitches = glitches.filter(function (gl) {
        if (gl.until < now) return false;
        ctx.fillStyle = bg; ctx.fillRect(gl.p.hx - cw / 2, gl.p.hy - ch / 2, cw, ch);
        ctx.fillStyle = '#fff6dc'; ctx.fillText(gl.c, gl.p.hx, gl.p.hy);
        return true;
      });
    }
    // la línea de escaneo pasa una vez cada 6 segundos (y no se pinta nada entre pasadas)
    var ph = t % SWEEP_EVERY;
    if (ph < SWEEP_TIME) {
      var sy = (ph / SWEEP_TIME) * (H + 120) - 60;
      var sg = ctx.createLinearGradient(0, sy - 60, 0, sy + 2);
      sg.addColorStop(0, 'rgba(255,236,180,0)'); sg.addColorStop(1, 'rgba(255,236,180,.55)');
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 60, W, 62);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  var SWEEP_EVERY = 6, SWEEP_TIME = 1.6;
  function sweeping() { return t0 && ((performance.now() - t0) / 1000) % SWEEP_EVERY < SWEEP_TIME + 0.1; }

  function schedule(needMore, idle) {
    if (!(needMore && running && visible)) return;
    if (idle) {
      lastT = 0;
      // reposo: 30 fps solo mientras pasa la línea; entre pasadas, 5 fps para el parpadeo de letras
      idleTimer = setTimeout(function () { idleTimer = 0; kick(); }, sweeping() ? 33 : 200);
    } else raf = requestAnimationFrame(step);
  }

  function kick() {
    if (!running || !visible || raf) return;
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; } // sal del modo reposo al momento
    if (!visible) lastT = 0;
    raf = requestAnimationFrame(step);
  }

  function start() {
    if (!img.naturalWidth) return;
    if (!build()) return; // si no se puede leer la foto, se queda la imagen normal
    if (!ready) {
      tile.insertBefore(canvas, img.nextSibling);
      tile.classList.add('has-code');
      ready = true;
      addHint();
    }
    running = true;
    lastMove = performance.now();
    kick();
  }

  // Pista pequeña sobre la foto
  var hint;
  function addHint() {
    hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'code-hint';
    hint.innerHTML = '<span class="code-hint__dot"></span><span class="code-hint__t"></span>';
    tile.appendChild(hint);
    setHintText();
    hint.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
  }
  function hintText() {
    var lang = document.documentElement.lang;
    var T = {
      es: ['Ver foto', 'Ver código'], en: ['Show photo', 'Show code'],
      fr: ['Voir la photo', 'Voir le code'], de: ['Foto zeigen', 'Code zeigen']
    }[lang] || ['Ver foto', 'Ver código'];
    return photoMode ? T[1] : T[0];
  }
  function setHintText() { if (hint) hint.querySelector('.code-hint__t').textContent = hintText(); }
  function toggle() { photoMode = !photoMode; tile.classList.toggle('is-photo', photoMode); setHintText(); kick(); if (reduce) step(performance.now()); }

  // Eventos
  tile.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / (r.width || W)); mouse.y = (e.clientY - r.top) * (H / (r.height || H)); mouse.on = true;
    lastMove = performance.now();
    if (reduce) { lens.x = mouse.x; lens.y = mouse.y; lens.r = Math.min(W, H) * 0.2; step(performance.now()); }
    kick();
  });
  tile.addEventListener('pointerleave', function () {
    mouse.on = false; lastMove = performance.now();
    if (reduce) { lens.r = 0; step(performance.now()); }
    kick();
  });
  tile.addEventListener('click', toggle);

  new MutationObserver(setHintText).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  // al cambiar de tema se recalculan los colores de las letras
  new MutationObserver(function () {
    if (!ready) return;
    for (var i = 0; i < parts.length; i++) parts[i].col = null;
    if (build()) { kick(); if (reduce) step(performance.now()); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(tile);
  }
  document.addEventListener('visibilitychange', function () { visible = !document.hidden; kick(); });

  var rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (ready && build()) { kick(); if (reduce) step(performance.now()); } }, 150);
  });

  // Espera a la foto y a la fuente mono para que las letras salgan bien
  function go() {
    var f = document.fonts && document.fonts.load ? document.fonts.load('500 12px "Geist Mono"') : Promise.resolve();
    f.catch(function () {}).then(function () {
      // con pantalla de carga, arranca cuando se quita
      var root = document.documentElement;
      if (root.classList.contains('loading')) {
        var mo = new MutationObserver(function () {
          if (!root.classList.contains('loading')) { mo.disconnect(); start(); }
        });
        mo.observe(root, { attributes: true, attributeFilter: ['class'] });
      } else start();
    });
  }
  if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go);
})();
