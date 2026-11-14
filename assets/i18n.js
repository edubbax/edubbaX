/* EdubbaX content pages: language switching, shared navigation, menu and SEO tags.
   [data-t="key"]  -> textContent
   [data-h="key"]  -> innerHTML (trusted, page-authored strings only)
   [data-ta="key"] -> aria-label
   a[data-l]       -> internal link; gets ?lang=xx for non-default languages
   T[lang].title / T[lang].desc -> document title, meta description, Open Graph */
(function () {
  var SITE = 'https://edubbax.vercel.app';
  var DEF = 'az';
  var LOCALE = { az: 'az_AZ', tr: 'tr_TR', en: 'en_US' };
  var NAV = {
    az: { skip: 'Əsas məzmuna keç', menu: 'Menyu', navLabel: 'Əsas menyu', footLabel: 'Sayt xəritəsi', nCourses: 'Kurslar üçün', nPlans: 'Planlar', nSample: 'Nümunə hesabat', nDemo: 'Demo', nInv: 'İnvestorlar', nWait: 'Pilot müraciəti', nPrivacy: 'Məxfilik', nTerms: 'İstifadə şərtləri', nHome: 'Ana səhifə', ctaPilot: 'Pilot üçün müraciət et', ctaShort: 'Pilot' },
    tr: { skip: 'Ana içeriğe geç', menu: 'Menü', navLabel: 'Ana menü', footLabel: 'Site haritası', nCourses: 'Kurslar için', nPlans: 'Planlar', nSample: 'Örnek rapor', nDemo: 'Demo', nInv: 'Yatırımcılar', nWait: 'Pilot başvurusu', nPrivacy: 'Gizlilik', nTerms: 'Kullanım şartları', nHome: 'Ana sayfa', ctaPilot: 'Pilot için başvur', ctaShort: 'Pilot' },
    en: { skip: 'Skip to main content', menu: 'Menu', navLabel: 'Main menu', footLabel: 'Site map', nCourses: 'For centres', nPlans: 'Plans', nSample: 'Sample report', nDemo: 'Demo', nInv: 'Investors', nWait: 'Pilot application', nPrivacy: 'Privacy', nTerms: 'Terms of use', nHome: 'Home', ctaPilot: 'Apply for the pilot', ctaShort: 'Pilot' }
  };
  function langUrl(path, l) {
    var parts = path.split('#'), base = parts[0];
    var q = l === DEF ? '' : (base.indexOf('?') > -1 ? '&' : '?') + 'lang=' + l;
    return base + q + (parts[1] ? '#' + parts[1] : '');
  }
  function setMeta(sel, attr, val) { var m = document.querySelector(sel); if (m) m.setAttribute(attr, val); }

  window.edxI18n = function (T, onChange) {
    var langs = Object.keys(T), cur = DEF;
    function apply(l) {
      var s = Object.assign({}, NAV[l] || NAV[DEF], T[l] || T[DEF]), fb = Object.assign({}, NAV[DEF], T[DEF]);
      cur = l;
      document.documentElement.lang = l;
      document.querySelectorAll('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); el.textContent = s[k] != null ? s[k] : (fb[k] || ''); });
      document.querySelectorAll('[data-h]').forEach(function (el) { var k = el.getAttribute('data-h'); el.innerHTML = s[k] != null ? s[k] : (fb[k] || ''); });
      document.querySelectorAll('[data-ta]').forEach(function (el) { var k = el.getAttribute('data-ta'); el.setAttribute('aria-label', s[k] != null ? s[k] : (fb[k] || '')); });
      document.querySelectorAll('a[data-l]').forEach(function (a) { a.href = langUrl(a.getAttribute('data-l'), l); });
      document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === l)); });
      if (s.title) { document.title = s.title; setMeta('meta[property="og:title"]', 'content', s.title); setMeta('meta[name="twitter:title"]', 'content', s.title); }
      if (s.desc) { setMeta('meta[name=description]', 'content', s.desc); setMeta('meta[property="og:description"]', 'content', s.desc); setMeta('meta[name="twitter:description"]', 'content', s.desc); }
      var url = SITE + langUrl(location.pathname, l);
      setMeta('link[rel=canonical]', 'href', url);
      setMeta('meta[property="og:url"]', 'content', url);
      setMeta('meta[property="og:locale"]', 'content', LOCALE[l] || LOCALE[DEF]);
      try { var u = new URL(location.href); if (l === DEF) u.searchParams.delete('lang'); else u.searchParams.set('lang', l); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
      try { localStorage.setItem('edx_lang', l); localStorage.setItem('edubbax.lang', l); } catch (e) {}
      if (onChange) onChange(l, s);
    }
    document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.l); closeMenu(); }); });
    var q = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
    if (!T[q]) { try { q = localStorage.getItem('edx_lang') || ''; } catch (e) { q = ''; } }
    if (!T[q]) { var n = (navigator.language || '').slice(0, 2).toLowerCase(); q = T[n] ? n : (T[DEF] ? DEF : langs[0]); }
    apply(q);
    return { get lang() { return cur; }, set: apply };
  };

  /* ---- shared navigation behaviour ---- */
  var burger, mnav;
  function closeMenu() { if (!mnav) return; mnav.classList.remove('open'); document.body.classList.remove('menu-open'); if (burger) burger.setAttribute('aria-expanded', 'false'); }
  function initNav() {
    var page = document.body.getAttribute('data-page');
    document.querySelectorAll('[data-page-link]').forEach(function (a) { if (a.getAttribute('data-page-link') === page) a.setAttribute('aria-current', 'page'); });
    burger = document.querySelector('.burger'); mnav = document.getElementById('mnav');
    if (burger && mnav) {
      burger.addEventListener('click', function () {
        var open = !mnav.classList.contains('open');
        mnav.classList.toggle('open', open); document.body.classList.toggle('menu-open', open);
        burger.setAttribute('aria-expanded', String(open));
        if (open) { var f = mnav.querySelector('a'); if (f) f.focus(); }
      });
      mnav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mnav.classList.contains('open')) { closeMenu(); burger.focus(); } });
      window.addEventListener('resize', function () { if (window.innerWidth > 940) closeMenu(); });
    }
    var mcta = document.querySelector('.mcta'), stop = document.querySelectorAll('[data-mcta-hide]');
    if (mcta && stop.length && 'IntersectionObserver' in window) {
      var vis = new Set();
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) vis.add(e.target); else vis.delete(e.target); }); mcta.classList.toggle('hide', vis.size > 0); });
      stop.forEach(function (el) { io.observe(el); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initNav); else initNav();
})();
