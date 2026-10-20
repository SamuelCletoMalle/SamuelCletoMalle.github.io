(function () {
  var root = document.documentElement;
  root.classList.add('js');

  // Pantalla de carga: barra de progreso breve, luego entra la página
  var loader = document.getElementById('loader');
  function finish() {
    if (!loader) return;
    loader.classList.add('is-done');
    root.classList.remove('loading');
    setTimeout(function () { loader.remove(); }, 700);
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
  } else { finish(); }

  // Idiomas: el español es el texto del HTML, el resto sale de i18n.js
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
    current = l;
    var d = dict(l);
    nodes.forEach(function (el) {
      el.innerHTML = (l === 'es' || d[el.dataset.i18n] == null) ? el.dataset.es : d[el.dataset.i18n];
    });
    root.lang = l;
    document.title = d._title;
    document.querySelector('meta[name="description"]').setAttribute('content', d._desc);
    select.value = l;
    if (save) { try { localStorage.setItem('lang', l); } catch (e) {} }
  }
  select.addEventListener('change', function () { setLang(select.value, true); });
  var start = '';
  try { start = localStorage.getItem('lang') || ''; } catch (e) {}
  if (!start) start = (navigator.language || 'es').slice(0, 2).toLowerCase();
  setLang(['es', 'en', 'fr', 'de'].indexOf(start) > -1 ? start : 'es', false);

  // Tema claro / oscuro
  document.getElementById('theme').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#070b14' : '#eef2fa');
  });

  // Aparición de bloques al entrar en pantalla y sección activa en la barra
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });

    var links = {};
    document.querySelectorAll('.nav__links a').forEach(function (a) { links[a.dataset.s] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(links).forEach(function (k) { links[k].classList.toggle('is-on', k === e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { so.observe(s); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Copiar correo
  var btn = document.getElementById('copy');
  var label = document.getElementById('copy-t');
  var status = document.getElementById('copy-status');
  var email = 'samuelcletomalle@gmail.com';
  btn.addEventListener('click', function () {
    var done = function (ok) {
      var d = dict(current);
      label.textContent = ok ? d._copied : d._copyfail;
      status.textContent = ok ? d._status_ok : d._status_fail;
      setTimeout(function () { label.innerHTML = current === 'es' ? label.dataset.es : (dict(current).copy || label.dataset.es); }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); });
    } else { done(false); }
  });
})();
