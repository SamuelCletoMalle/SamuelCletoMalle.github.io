/* Movimiento del diseño editorial ligado al scroll:
   - el menú pasa a cristal al bajar
   - en el inicio, "SAMUEL" y "CLETO" se separan y la foto se reduce
   - los títulos gigantes crecen al entrar
   - los proyectos flotan a distintas velocidades */
(function () {
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav = document.getElementById('nav');
  var hero = document.querySelector('.hero2');
  var chapters = [].slice.call(document.querySelectorAll('.chapter'));
  var floats = [].slice.call(document.querySelectorAll('.float[data-speed]'));
  var wide = matchMedia('(min-width: 961px)');
  var ticking = false;

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function update() {
    ticking = false;
    var y = window.scrollY || 0, vh = innerHeight;
    if (nav) nav.classList.toggle('is-scrolled', y > 30);
    if (reduce) return;

    if (hero && wide.matches) hero.style.setProperty('--s', clamp(y / vh).toFixed(4));
    else if (hero) hero.style.setProperty('--s', 0);

    for (var i = 0; i < chapters.length; i++) {
      var r = chapters[i].getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      chapters[i].style.setProperty('--p', clamp((vh - r.top) / (vh * 0.75)).toFixed(4));
    }

    for (var j = 0; j < floats.length; j++) {
      var f = floats[j];
      if (!wide.matches) { f.style.setProperty('--py', '0px'); continue; }
      var fr = f.getBoundingClientRect();
      var center = fr.top + fr.height / 2 - (parseFloat(f.style.getPropertyValue('--py')) || 0);
      var py = (center - vh / 2) * -parseFloat(f.dataset.speed || 0);
      f.style.setProperty('--py', py.toFixed(1) + 'px');
    }
  }

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (wide.addEventListener) wide.addEventListener('change', onScroll);
  update();
})();
