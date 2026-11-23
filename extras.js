/* Extras interactivos:
   1. Terminal que responde a comandos (git log de mi trayectoria, sudo contratar...)
   2. Modo reclutador: todo lo importante en 30 segundos
   3. Stack con física: arrastra y lanza las tecnologías
   4. Confeti dorado y código Konami */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function L() { return root.lang === 'es' ? 'es' : 'en'; }
  function tr(es, en) { return L() === 'es' ? es : en; }
  function mail() {
    var a = document.querySelector('a[href^="mailto:"]');
    return a ? a.getAttribute('href').replace('mailto:', '') : '';
  }
  var LINKEDIN = 'https://www.linkedin.com/in/samuelcletomalle';
  var GITHUB = 'https://github.com/SamuelCletoMalle';
  var CV = 'assets/CV_SamuelCleto.pdf';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function downloadCV() { var a = document.createElement('a'); a.href = CV; a.download = 'CV_SamuelCleto.pdf'; document.body.appendChild(a); a.click(); a.remove(); }

  /* ================= Confeti dorado ================= */
  function confetti(x, y) {
    if (reduce) return;
    var c = document.createElement('canvas');
    c.className = 'confetti';
    document.body.appendChild(c);
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    var cols = ['#e2b75a', '#f6e3a8', '#a8792c', '#ffffff', '#c9a24a'];
    var ox = x == null ? W / 2 : x, oy = y == null ? H * 0.35 : y;
    var ps = [];
    for (var i = 0; i < 160; i++) {
      var a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      ps.push({ x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
        w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, c: cols[i % cols.length], t: Math.random() < .25 });
    }
    var start = performance.now();
    (function f(now) {
      var k = (now - start) / 2600;
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        p.vy += 0.28; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (p.t) { ctx.font = '700 12px "Geist Mono", monospace'; ctx.fillText('{ }', 0, 0); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.sin(p.r * 2)) * p.h + 1);
        ctx.restore();
      });
      if (k < 1) requestAnimationFrame(f); else c.remove();
    })(start);
  }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast glass';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 2600);
    setTimeout(function () { t.remove(); }, 3200);
  }

  /* ================= 1. Terminal ================= */
  var out = document.getElementById('term-out');
  var form = document.getElementById('term-form');
  var input = document.getElementById('term-in');
  if (out && form && input) {
    var hist = [], hi = 0;
    var PS = '<span class="t-ps">samuel@portfolio:~$</span> ';

    function print(html, cls) {
      var d = document.createElement('div');
      d.className = 't-line' + (cls ? ' ' + cls : '');
      d.innerHTML = html;
      out.appendChild(d);
      out.scrollTop = out.scrollHeight;
      return d;
    }
    // escribe varias líneas con un pequeño retraso, como una terminal de verdad
    function typeLines(lines, done) {
      var i = 0;
      (function next() {
        if (i >= lines.length) { if (done) done(); return; }
        var l = lines[i++];
        print(l[0], l[1]);
        setTimeout(next, reduce ? 0 : (l[2] || 45));
      })();
    }

    var CMDS = {
      ayuda: function () {
        var list = [
          ['sobremi', tr('quién soy, en corto', 'who I am, in short')],
          ['git log', tr('mi trayectoria como commits', 'my journey as commits')],
          ['proyectos', tr('lo que he construido', 'what I have built')],
          ['stack', tr('con qué programo', 'what I code with')],
          ['disponibilidad', tr('cuándo puedo empezar', 'when I can start')],
          ['java Samuel', tr('ejecútame', 'run me')],
          ['contacto', tr('cómo hablar conmigo', 'how to reach me')],
          ['cv', tr('descarga mi CV', 'download my CV')],
          ['tema', tr('claro u oscuro', 'light or dark')],
          ['sudo contratar', tr('ya sabes 😉', 'you know 😉')],
          ['limpiar', tr('borra la pantalla', 'clear the screen')]
        ];
        return list.map(function (c) { return ['<span class="t-cmd">' + c[0].padEnd(16, ' ').replace(/ /g, '&nbsp;') + '</span><span class="t-dim">' + c[1] + '</span>', '', 25]; });
      },
      sobremi: function () {
        return [
          [tr('Samuel Cleto Malle · 2º de DAM en Prometeo by thePower.', 'Samuel Cleto Malle · 2nd year of DAM at Prometeo by thePower.')],
          [tr('Empecé en SMR arreglando ordenadores y redes; ahora construyo apps.', 'I started in SMR fixing computers and networks; now I build apps.')],
          [tr('Busco prácticas de <b>desarrollo</b> por convenio.', 'Looking for a <b>development</b> internship.')]
        ];
      },
      'git log': function () {
        var c = [
          ['HEAD -> main', '11/2026', tr('feat: buscando prácticas de desarrollo', 'feat: looking for a development internship')],
          ['', '10/2026', tr('chore: +5 certificaciones (AWS, Cisco, IBM)', 'chore: +5 certifications (AWS, Cisco, IBM)')],
          ['', '09/2026', tr('feat: empiezo 2º de DAM en Prometeo', 'feat: start 2nd year of DAM at Prometeo')],
          ['', '06/2026', tr('fix: verano en logística (Decathlon)', 'fix: summer in logistics (Decathlon)')],
          ['', '05/2025', tr('feat: prácticas de técnico en GEI Ciudad Escolar', 'feat: IT technician internship at GEI Ciudad Escolar')],
          ['', '09/2024', tr('feat: empiezo DAM en IES Luis Vives', 'feat: start DAM at IES Luis Vives')],
          ['', '04/2024', tr('feat: prácticas de sistemas en la UNED', 'feat: systems internship at UNED')],
          ['', '09/2022', tr('init: primer día de SMR', 'init: first day of SMR')]
        ];
        return c.map(function (x, i) {
          var h = (0x9f3a1c + i * 0x1b7d5).toString(16).slice(0, 7);
          return ['<span class="t-gold">' + h + '</span>' + (x[0] ? ' <span class="t-tag">(' + x[0] + ')</span>' : '') + ' <span class="t-dim">' + x[1] + '</span> ' + esc(x[2]), '', 110];
        });
      },
      proyectos: function () {
        return [
          ['<span class="t-gold">●</span> <b>Nexo Pay</b> — ' + tr('app de finanzas personales (React Native + Supabase), hecha aprendiendo con IA. ', 'personal finance app (React Native + Supabase), built while learning with AI. ') + '<a href="https://balanz-app.vercel.app" target="_blank" rel="noopener">' + tr('probar', 'try it') + ' ↗</a>'],
          ['<span class="t-gold">●</span> <b>CRMForge</b> — ' + tr('constructor de CRM a medida (Next.js + Supabase), en desarrollo.', 'custom CRM builder (Next.js + Supabase), in development.')],
          ['<span class="t-gold">●</span> <b>DAM</b> — ' + tr('ejercicios del ciclo en Java y PL/SQL. ', 'course exercises in Java and PL/SQL. ') + '<a href="' + GITHUB + '/DAM" target="_blank" rel="noopener">GitHub ↗</a>'],
          ['<span class="t-gold">●</span> <b>' + tr('Web de reservas con IA', 'Booking site with AI') + '</b> — ' + tr('reservas en 4 pasos y chat con IA.', '4-step booking and AI chat.')]
        ];
      },
      stack: function () {
        return [
          [tr('lenguajes  ', 'languages  ').replace(/ /g, '&nbsp;') + '<span class="t-gold">Java · Python · JavaScript · SQL · HTML/CSS</span>'],
          ['apps/web&nbsp;&nbsp;&nbsp;<span class="t-gold">React · React Native · Expo · Supabase</span>'],
          [tr('sistemas&nbsp;&nbsp;&nbsp;', 'systems&nbsp;&nbsp;&nbsp;&nbsp;') + '<span class="t-gold">Git · GitHub · AWS · ' + tr('redes', 'networking') + ' · Linux</span>']
        ];
      },
      disponibilidad: function () {
        return [
          [tr('ahora&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~4 h al día, compatible con clases', 'now&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;~4 h a day alongside classes')],
          [tr('desde marzo&nbsp;&nbsp;jornada completa', 'from March&nbsp;&nbsp;&nbsp;full time')],
          [tr('convenio&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;lo gestiona Prometeo by thePower', 'agreement&nbsp;&nbsp;&nbsp;handled by Prometeo by thePower')]
        ];
      },
      'java samuel': function () {
        return [
          ['<span class="t-dim">$ javac Samuel.java</span>', '', 300],
          ['<span class="t-dim">$ java Samuel</span>', '', 400],
          [tr('Hola 👋 Soy Samuel.', 'Hi 👋 I am Samuel.'), '', 200],
          [tr('Compilado sin errores. Listo para un equipo real.', 'Compiled with no errors. Ready for a real team.'), 't-ok']
        ];
      },
      contacto: function () {
        var m = mail();
        return [
          ['email&nbsp;&nbsp;&nbsp;&nbsp;<a href="mailto:' + esc(m) + '">' + esc(m) + '</a>'],
          ['linkedin&nbsp;<a href="' + LINKEDIN + '" target="_blank" rel="noopener">linkedin.com/in/samuelcletomalle ↗</a>'],
          ['github&nbsp;&nbsp;&nbsp;<a href="' + GITHUB + '" target="_blank" rel="noopener">github.com/SamuelCletoMalle ↗</a>']
        ];
      },
      cv: function () { downloadCV(); return [[tr('Descargando CV_SamuelCleto.pdf…', 'Downloading CV_SamuelCleto.pdf…'), 't-ok']]; },
      tema: function () { var b = document.getElementById('theme'); if (b) b.click(); return [[tr('Tema cambiado.', 'Theme switched.'), 't-ok']]; },
      'ping samuel': function () {
        return [
          ['PING samuel (127.0.0.1): 56 data bytes', '', 250],
          [tr('64 bytes de samuel: tiempo de respuesta &lt; 24 h', '64 bytes from samuel: reply time &lt; 24 h'), '', 350],
          [tr('64 bytes de samuel: ganas de aprender = 100%', '64 bytes from samuel: will to learn = 100%'), '', 350],
          [tr('--- 0% de paquetes perdidos ---', '--- 0% packet loss ---'), 't-ok']
        ];
      },
      'sudo contratar': function () {
        return [
          [tr('[sudo] contraseña para reclutador: ********', '[sudo] password for recruiter: ********'), '', 700],
          [tr('Comprobando permisos…', 'Checking permissions…'), 't-dim', 600],
          [tr('✔ Permiso concedido. Abriendo el contacto…', '✔ Permission granted. Opening contact…'), 't-ok', 50]
        ];
      },
      oro: function () { confetti(); return [[tr('✨ Modo oro.', '✨ Gold mode.'), 't-gold']]; }
    };
    var ALIAS = { help: 'ayuda', '?': 'ayuda', whoami: 'sobremi', about: 'sobremi', 'ls proyectos': 'proyectos', ls: 'proyectos', projects: 'proyectos',
      'cat disponibilidad.txt': 'disponibilidad', availability: 'disponibilidad', contact: 'contacto', theme: 'tema', 'sudo hire': 'sudo contratar',
      'java samuel.java': 'java samuel', gold: 'oro' };

    function run(raw) {
      var cmd = raw.trim();
      print(PS + esc(cmd), 't-echo');
      if (!cmd) return;
      hist.push(cmd); hi = hist.length;
      var key = cmd.toLowerCase().replace(/\s+/g, ' ');
      if (key === 'limpiar' || key === 'clear' || key === 'cls') { out.innerHTML = ''; return; }
      if (/^rm\s+-rf/.test(key)) { print(tr('Buen intento 😄 Este portfolio tiene copia en GitHub.', 'Nice try 😄 This portfolio is backed up on GitHub.'), 't-warn'); return; }
      if (/^sudo\b/.test(key) && !CMDS[key] && !ALIAS[key]) { print(tr('samuel no está en el archivo sudoers. Prueba <span class="t-cmd">sudo contratar</span>.', 'samuel is not in the sudoers file. Try <span class="t-cmd">sudo hire</span>.'), 't-warn'); return; }
      var fn = CMDS[key] || CMDS[ALIAS[key]];
      if (!fn) { print(tr('comando no encontrado: ', 'command not found: ') + esc(cmd) + tr(' · escribe <span class="t-cmd">ayuda</span>', ' · type <span class="t-cmd">help</span>'), 't-warn'); return; }
      input.disabled = true;
      typeLines(fn(), function () {
        input.disabled = false;
        if (key === 'sudo contratar' || key === 'sudo hire') {
          var r = form.getBoundingClientRect();
          confetti(r.left + r.width / 2, r.top);
          setTimeout(function () { var c = document.getElementById('contacto'); if (c) c.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }, 900);
        } else input.focus({ preventScroll: true });
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value; input.value = ''; run(v); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { if (hi > 0) { hi--; input.value = hist[hi]; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (hi < hist.length - 1) { hi++; input.value = hist[hi]; } else { hi = hist.length; input.value = ''; } e.preventDefault(); }
      else if (e.key === 'Tab') {
        var v = input.value.toLowerCase();
        if (!v) return;
        var all = Object.keys(CMDS).concat(Object.keys(ALIAS), ['limpiar']);
        var m = all.filter(function (k) { return k.indexOf(v) === 0; });
        if (m.length) { e.preventDefault(); input.value = m[0]; }
      }
    });
    out.addEventListener('click', function (e) { if (!e.target.closest('a')) input.focus({ preventScroll: true }); });
    document.querySelectorAll('[data-term]').forEach(function (b) {
      b.addEventListener('click', function () { run(b.getAttribute('data-term')); });
    });

    // mensaje de bienvenida cuando la terminal entra en pantalla
    var greeted = false;
    function greet() {
      if (greeted) return; greeted = true;
      typeLines([
        [tr('Bienvenido a mi terminal. Escribe <span class="t-cmd">ayuda</span> o pulsa un comando de abajo.', 'Welcome to my terminal. Type <span class="t-cmd">help</span> or tap a command below.'), '', 200]
      ]);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { greet(); o.disconnect(); } }, { threshold: 0.4 }).observe(out);
    } else greet();
  }

  /* ================= 2. Modo reclutador ================= */
  var rdlg = document.getElementById('recruiter');
  var ropen = document.getElementById('recruiter-open');
  if (rdlg && ropen && typeof rdlg.showModal === 'function') {
    var timer = 0;
    function fill() {
      var m = mail();
      var mlink = rdlg.querySelector('[data-r-mail]');
      if (mlink) { mlink.href = 'mailto:' + m; mlink.querySelector('span').textContent = m; }
    }
    function openR() {
      fill();
      rdlg.showModal();
      var ring = rdlg.querySelector('.rk__ring');
      var num = rdlg.querySelector('.rk__num');
      var t0 = performance.now();
      cancelAnimationFrame(timer);
      (function tick(now) {
        var left = Math.max(0, 30 - (now - t0) / 1000);
        if (num) num.textContent = Math.ceil(left);
        if (ring) ring.style.setProperty('--p', (1 - left / 30).toFixed(4));
        if (left > 0 && rdlg.open) timer = requestAnimationFrame(tick);
        else if (rdlg.open) rdlg.classList.add('done');
      })(t0);
    }
    ropen.addEventListener('click', openR);
    rdlg.addEventListener('close', function () { cancelAnimationFrame(timer); rdlg.classList.remove('done'); });
    rdlg.addEventListener('click', function (e) { if (e.target === rdlg) rdlg.close(); });
    rdlg.querySelectorAll('[data-r-close]').forEach(function (b) { b.addEventListener('click', function () { rdlg.close(); }); });
    var rcv = rdlg.querySelector('[data-r-cv]');
    if (rcv) rcv.addEventListener('click', function (e) { e.preventDefault(); downloadCV(); });
  } else if (ropen) ropen.remove();

  /* ================= 3. Stack con física ================= */
  var box = document.getElementById('play');
  if (box) {
    var ITEMS = [
      ['Java', 'openjdk'], ['Python', 'python'], ['JavaScript', 'javascript'], ['SQL', 'sqlite'], ['HTML', 'html5'], ['CSS', 'css'],
      ['React', 'react'], ['React Native', 'react'], ['Expo', 'expo'], ['Supabase', 'supabase'], ['Git', 'git'], ['GitHub', 'github'],
      ['AWS', 'amazonwebservices'], ['Linux', 'linux']
    ];
    var bodies = [];
    ITEMS.forEach(function (it) {
      var el = document.createElement('span');
      el.className = 'chip-body';
      el.innerHTML = '<i class="ico" style="--i:var(--ic-' + it[1] + ')"></i>' + it[0];
      box.appendChild(el);
      bodies.push({ el: el, x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, a: 0, drag: false });
    });

    if (reduce) { box.classList.add('static'); }
    else {
      var BW = 0, BH = 0, running = false, rafP = 0, grab = null, lastP = null, lastT = 0;
      function measure() {
        var r = box.getBoundingClientRect(); BW = r.width; BH = r.height;
        bodies.forEach(function (b) { b.w = b.el.offsetWidth; b.h = b.el.offsetHeight; });
      }
      function drop() {
        measure();
        bodies.forEach(function (b, i) {
          b.x = 40 + Math.random() * Math.max(10, BW - 80);
          b.y = -60 - i * 45;
          b.vx = (Math.random() - .5) * 4; b.vy = 0; b.a = (Math.random() - .5) * 30;
        });
        if (!running) { running = true; rafP = requestAnimationFrame(stepP); }
      }
      function stepP(now) {
        var n = bodies.length;
        // pasos de física según el tiempo real, para que vaya igual en dispositivos lentos
        var sub = lastT ? Math.max(1, Math.min(4, Math.round((now - lastT) / 16.7))) : 1;
        lastT = now;
        for (var sIdx = 0; sIdx < sub; sIdx++) integrate(n);
        for (var k = 0; k < n; k++) {
          var c = bodies[k];
          c.el.style.transform = 'translate(' + (c.x - c.w / 2).toFixed(1) + 'px,' + (c.y - c.h / 2).toFixed(1) + 'px) rotate(' + c.a.toFixed(1) + 'deg)';
        }
        rafP = running ? requestAnimationFrame(stepP) : 0;
      }
      function integrate(n) {
        for (var i = 0; i < n; i++) {
          var b = bodies[i];
          if (b.drag) continue;
          b.vy += 0.55;
          b.vx *= 0.995; b.vy *= 0.995;
          b.x += b.vx; b.y += b.vy;
          var hw = b.w / 2, hh = b.h / 2;
          if (b.y + hh > BH) { b.y = BH - hh; b.vy *= -0.42; b.vx *= 0.9; if (Math.abs(b.vy) < 1) b.vy = 0; }
          if (b.x - hw < 0) { b.x = hw; b.vx *= -0.6; }
          if (b.x + hw > BW) { b.x = BW - hw; b.vx *= -0.6; }
          b.a += (b.vx * 0.6 - b.a) * 0.08;
        }
        // choques entre fichas (cajas alineadas, se separan por el eje de menor solape)
        for (var it = 0; it < 3; it++) {
          for (var p = 0; p < n; p++) for (var q = p + 1; q < n; q++) {
            var A = bodies[p], B = bodies[q];
            var ox = (A.w + B.w) / 2 - Math.abs(A.x - B.x), oy = (A.h + B.h) / 2 - Math.abs(A.y - B.y);
            if (ox <= 0 || oy <= 0) continue;
            var wa = A.drag ? 0 : 1, wb = B.drag ? 0 : 1, tot = wa + wb || 1;
            if (ox < oy) {
              var sx = A.x < B.x ? -1 : 1;
              A.x += sx * ox * wa / tot; B.x -= sx * ox * wb / tot;
              var tvx = (A.vx + B.vx) / 2; if (wa) A.vx = tvx; if (wb) B.vx = tvx;
            } else {
              var sy = A.y < B.y ? -1 : 1;
              A.y += sy * oy * wa / tot; B.y -= sy * oy * wb / tot;
              if (sy < 0) { if (wa) A.vy = Math.min(A.vy, 0); if (wb) B.vy *= 0.5; } else { if (wb) B.vy = Math.min(B.vy, 0); if (wa) A.vy *= 0.5; }
            }
          }
        }
      }
      function local(e) { var r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; }
      box.addEventListener('pointerdown', function (e) {
        var el = e.target.closest('.chip-body'); if (!el) return;
        grab = bodies.filter(function (b) { return b.el === el; })[0];
        grab.drag = true; el.classList.add('held');
        box.setPointerCapture(e.pointerId);
        lastP = local(e); e.preventDefault();
      });
      box.addEventListener('pointermove', function (e) {
        if (!grab) return;
        var p = local(e), dt = Math.max(8, p.t - lastP.t);
        grab.vx = (p.x - lastP.x) / dt * 16; grab.vy = (p.y - lastP.y) / dt * 16;
        grab.x = Math.max(grab.w / 2, Math.min(BW - grab.w / 2, p.x));
        grab.y = Math.max(grab.h / 2, Math.min(BH - grab.h / 2, p.y));
        lastP = p;
      });
      function release() { if (!grab) return; grab.drag = false; grab.el.classList.remove('held'); grab = null; }
      box.addEventListener('pointerup', release);
      box.addEventListener('pointercancel', release);
      var shake = document.getElementById('play-shake');
      if (shake) shake.addEventListener('click', function () {
        bodies.forEach(function (b) { b.vy = -8 - Math.random() * 10; b.vx = (Math.random() - .5) * 18; });
      });
      window.addEventListener('resize', function () { measure(); });
      // las fichas caen cuando el recuadro aparece; se pausa fuera de pantalla
      if ('IntersectionObserver' in window) {
        var dropped = false;
        new IntersectionObserver(function (es) {
          if (es[0].isIntersecting) {
            if (!dropped) { dropped = true; drop(); }
            else if (!running) { running = true; rafP = requestAnimationFrame(stepP); }
          } else { running = false; cancelAnimationFrame(rafP); rafP = 0; lastT = 0; }
        }, { threshold: 0.25 }).observe(box);
      } else drop();
    }
  }

  /* ================= 4. Código Konami ================= */
  var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], pos = 0;
  document.addEventListener('keydown', function (e) {
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === seq[pos] ? pos + 1 : (k === seq[0] ? 1 : 0);
    if (pos === seq.length) { pos = 0; confetti(); toast(tr('✨ Modo oro desbloqueado. Escribe "oro" en la terminal.', '✨ Gold mode unlocked. Type "gold" in the terminal.')); }
  });
})();
