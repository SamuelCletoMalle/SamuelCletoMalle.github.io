(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = matchMedia('(pointer: fine)').matches;

  // Liquid glass: refracción SVG solo en Chromium de escritorio (Safari y Firefox no la pintan bien)
  var brands = (navigator.userAgentData && navigator.userAgentData.brands) || [];
  var isChromium = brands.some(function (b) { return /Chromium/.test(b.brand); });
  if (isChromium && finePointer) root.classList.add('refract');

  // Brillo del cristal que sigue al puntero
  if (finePointer && !reduce) {
    var glassEls = document.getElementsByClassName('glass');
    var raf = 0, px = 0, py = 0;
    window.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        for (var i = 0; i < glassEls.length; i++) {
          var r = glassEls[i].getBoundingClientRect();
          if (r.bottom < -200 || r.top > innerHeight + 200) continue;
          glassEls[i].style.setProperty('--mx', (px - r.left) + 'px');
          glassEls[i].style.setProperty('--my', (py - r.top) + 'px');
        }
      });
    }, { passive: true });
  }

  // ===== Efectos de texto =====

  // Títulos: cada palabra sube desde abajo cuando el bloque entra en pantalla
  function splitHeading(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + w + '</span></span>';
    }).join(' ');
  }

  // Frase grande: se divide en palabras que se iluminan con el scroll
  var statement = document.getElementById('statement');
  var statementWords = [];
  function splitStatement() {
    if (!statement) return;
    var words = statement.textContent.trim().split(/\s+/);
    statement.setAttribute('aria-label', statement.textContent.trim());
    statement.innerHTML = words.map(function (w) { return '<span class="sw" aria-hidden="true">' + w + '</span>'; }).join(' ');
    statementWords = statement.querySelectorAll('.sw');
    updateScroll();
  }

  // Texto que se "descifra" letra a letra
  var scrambleEl = document.getElementById('scramble');
  var scrambleTimer = 0;
  function scramble() {
    if (!scrambleEl || reduce) return;
    var target = scrambleEl.textContent;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*';
    var frame = 0, total = 26;
    clearInterval(scrambleTimer);
    scrambleTimer = setInterval(function () {
      frame++;
      var done = Math.floor(target.length * frame / total);
      var out = '';
      for (var i = 0; i < target.length; i++) {
        var c = target[i];
        out += (i < done || c === ' ' || c === '-') ? c : chars[Math.floor(Math.random() * chars.length)];
      }
      scrambleEl.textContent = out;
      if (frame >= total) { clearInterval(scrambleTimer); scrambleEl.textContent = target; }
    }, 38);
  }

  // Contadores de la tarjeta de cifras
  function countUp() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var end = +el.dataset.count, suf = el.dataset.suffix || '';
      if (reduce) { el.textContent = end + suf; return; }
      var t0 = null, dur = 1100;
      el.textContent = '0' + suf;
      requestAnimationFrame(function step(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + suf;
        if (p < 1) requestAnimationFrame(step);
      });
    });
  }

  // ===== Pantalla de carga =====
  var loader = document.getElementById('loader');
  var started = false;
  function intro() {
    if (started) return;
    started = true;
    setTimeout(scramble, 250);
    setTimeout(countUp, 400);
  }
  function finish() {
    if (!loader) { intro(); return; }
    loader.classList.add('is-done');
    root.classList.remove('loading');
    setTimeout(function () { loader.remove(); }, 700);
    intro();
  }
  if (root.classList.contains('loading')) {
    var bar = document.getElementById('loader-bar');
    var pct = document.getElementById('loader-pct');
    var n = 0;
    var tick = setInterval(function () {
      n = Math.min(100, n + 8 + Math.random() * 12);
      bar.style.transform = 'scaleX(' + n / 100 + ')';
      pct.textContent = Math.floor(n) + '%';
      if (n >= 100) { clearInterval(tick); setTimeout(finish, 180); }
    }, 90);
  }

  // ===== Idiomas: el español es el texto del HTML, el resto sale de i18n.js =====
  var ES_META = {
    _title: document.title,
    _desc: document.querySelector('meta[name="description"]').getAttribute('content'),
    _copied: 'Email copiado', _copyfail: 'No se pudo copiar',
    _status_ok: 'Correo copiado al portapapeles', _status_fail: 'No se pudo copiar el correo'
  };
  var nodes = document.querySelectorAll('[data-i18n]');
  nodes.forEach(function (el) { el.dataset.es = el.innerHTML; });
  var select = document.getElementById('lang');
  var current = 'es';

  function dict(l) { return l === 'es' ? ES_META : Object.assign({}, ES_META, (window.I18N || {})[l] || {}); }
  function setLang(l, save) {
    if (l !== 'es' && !(window.I18N && window.I18N[l])) l = 'es';
    var changed = l !== current;
    current = l;
    var d = dict(l);
    nodes.forEach(function (el) {
      el.innerHTML = (l === 'es' || d[el.dataset.i18n] == null) ? el.dataset.es : d[el.dataset.i18n];
    });
    root.lang = l;
    document.title = d._title;
    document.querySelector('meta[name="description"]').setAttribute('content', d._desc);
    select.value = l;
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      if (!el.dataset.esPh) el.dataset.esPh = el.placeholder;
      el.placeholder = (l === 'es' || d[el.dataset.i18nPh] == null) ? el.dataset.esPh : d[el.dataset.i18nPh];
    });
    document.querySelectorAll('h2.split').forEach(splitHeading);
    splitStatement();
    moveIndicator();
    if (save && changed) scramble();
    if (save) { try { localStorage.setItem('lang', l); } catch (e) {} }
  }
  select.addEventListener('change', function () { setLang(select.value, true); });

  // ===== Tema claro / oscuro =====
  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#060912' : '#eef1f8');
  }
  document.getElementById('theme').addEventListener('click', toggleTheme);

  // ===== Menú: indicador de cristal que se desliza a la sección activa =====
  var ind = document.getElementById('nav-ind');
  var links = {};
  var activeLink = null;
  document.querySelectorAll('.nav__links a').forEach(function (a) { links[a.dataset.s] = a; });
  function moveIndicator() {
    if (!ind) return;
    if (!activeLink || !activeLink.offsetWidth) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.width = activeLink.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + activeLink.offsetLeft + 'px)';
  }
  window.addEventListener('resize', moveIndicator);

  // ===== Scroll: barra de progreso y frase que se ilumina =====
  var progress = document.getElementById('progress');
  var ticking = false;
  function updateScroll() {
    ticking = false;
    var max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    if (statementWords.length) {
      var r = statement.getBoundingClientRect();
      var p = reduce ? 1 : (innerHeight * 0.82 - r.top) / (r.height + innerHeight * 0.3);
      var lit = Math.round(Math.max(0, Math.min(1, p)) * statementWords.length);
      for (var i = 0; i < statementWords.length; i++) statementWords[i].classList.toggle('on', i < lit);
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });

  // Arranque del idioma (tras definir todo lo que usa setLang)
  var start = '';
  try { start = localStorage.getItem('lang') || ''; } catch (e) {}
  if (!start) start = (navigator.language || 'es').slice(0, 2).toLowerCase();
  setLang(['es', 'en', 'fr', 'de'].indexOf(start) > -1 ? start : 'es', false);
  if (!root.classList.contains('loading')) finish();

  // ===== Entradas escalonadas en las rejillas =====
  if (!reduce) {
    document.querySelectorAll('.projects, .now, .edu, .certs, .stack, .faqs').forEach(function (grid) {
      Array.prototype.forEach.call(grid.children, function (c, i) {
        if (c.classList.contains('reveal')) c.style.transitionDelay = (i % 3) * 90 + 'ms';
      });
    });
  }

  // ===== Aparición al entrar en pantalla y sección activa =====
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        el.classList.add('is-in');
        io.unobserve(el);
        // quita el retraso al terminar para que el hover responda al instante
        setTimeout(function () { el.style.transitionDelay = ''; }, 1300);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        activeLink = links[e.target.id] || null;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-on', links[k] === activeLink); });
        moveIndicator();
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { so.observe(s); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // ===== Inclinación 3D suave en las tarjetas de proyecto =====
  if (finePointer && !reduce) {
    document.querySelectorAll('.proj').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(1000px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  }

  // ===== Copiar correo =====
  var btn = document.getElementById('copy');
  var label = document.getElementById('copy-t');
  var status = document.getElementById('copy-status');
  var email = 'samuelcletomalle@gmail.com';
  function copyEmail() {
    var done = function (ok) {
      var d = dict(current);
      label.textContent = ok ? d._copied : d._copyfail;
      status.textContent = ok ? d._status_ok : d._status_fail;
      setTimeout(function () { label.innerHTML = current === 'es' ? label.dataset.es : (dict(current).copy || label.dataset.es); }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); });
    } else { done(false); }
  }
  btn.addEventListener('click', copyEmail);

  // ===== Hora local en Madrid =====
  var clock = document.getElementById('clock');
  function tickClock() {
    if (!clock) return;
    try {
      clock.textContent = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date());
    } catch (e) { clock.remove(); clock = null; }
  }
  tickClock();
  setInterval(tickClock, 15000);

  // ===== Paleta de comandos (Ctrl+K) =====
  var dlg = document.getElementById('cmdk');
  var input = document.getElementById('cmdk-in');
  var list = document.getElementById('cmdk-list');
  if (dlg && typeof dlg.showModal === 'function') {
    var sel = 0, shown = [];
    function t(key, fallback) { var d = dict(current); return d[key] || fallback; }
    function commands() {
      var out = [];
      document.querySelectorAll('.nav__links a').forEach(function (a) {
        out.push({ label: a.textContent.trim(), hint: '#', run: function () { location.hash = a.getAttribute('href'); document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } });
      });
      out.push({ label: document.querySelector('[data-i18n="nav_contact"]').textContent.trim(), hint: '#', run: function () { document.getElementById('contacto').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); } });
      out.push({ label: t('cmd_copy', 'Copiar email'), hint: '@', run: copyEmail });
      out.push({ label: t('cv', 'Descargar CV'), hint: 'PDF', run: function () { var l = document.createElement('a'); l.href = 'assets/CV_SamuelCleto.pdf'; l.download = 'CV_SamuelCleto.pdf'; document.body.appendChild(l); l.click(); l.remove(); } });
      out.push({ label: t('cmd_theme', 'Cambiar tema'), hint: '◐', run: toggleTheme });
      out.push({ label: 'GitHub', hint: '↗', run: function () { window.open('https://github.com/SamuelCletoMalle', '_blank', 'noopener'); } });
      out.push({ label: 'LinkedIn', hint: '↗', run: function () { window.open('https://www.linkedin.com/in/samuelcletomalle', '_blank', 'noopener'); } });
      return out;
    }
    function render() {
      var q = input.value.trim().toLowerCase();
      shown = commands().filter(function (c) { return c.label.toLowerCase().indexOf(q) > -1; });
      if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
      list.innerHTML = '';
      shown.forEach(function (c, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', i === sel ? 'true' : 'false');
        li.innerHTML = '<span></span><kbd></kbd>';
        li.firstChild.textContent = c.label;
        li.lastChild.textContent = c.hint;
        li.addEventListener('mousemove', function () { if (sel !== i) { sel = i; render(); } });
        li.addEventListener('click', function () { run(i); });
        list.appendChild(li);
      });
    }
    function run(i) { var c = shown[i]; dlg.close(); if (c) setTimeout(c.run, 60); }
    function open() { input.value = ''; sel = 0; render(); dlg.showModal(); input.focus(); }
    document.getElementById('cmdk-open').addEventListener('click', open);
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dlg.open ? dlg.close() : open(); }
    });
    input.addEventListener('input', function () { sel = 0; render(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); render(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(sel); }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  } else {
    var ob = document.getElementById('cmdk-open'); if (ob) ob.remove();
  }
})();
