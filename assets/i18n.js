/* Tiny i18n helper for EdubbaX content pages.
   [data-t="key"]  -> textContent
   [data-h="key"]  -> innerHTML (trusted, page-authored strings only)
   a[data-l]       -> internal link, gets ?lang=xx appended
   T[lang].title / T[lang].desc -> document title and meta description */
window.edxI18n = function (T, onChange) {
  var langs = Object.keys(T), cur = langs[0];
  function apply(l) {
    var s = T[l] || T[langs[0]], fb = T[langs[0]];
    cur = l;
    document.documentElement.lang = l;
    document.querySelectorAll('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); el.textContent = s[k] != null ? s[k] : (fb[k] || ''); });
    document.querySelectorAll('[data-h]').forEach(function (el) { var k = el.getAttribute('data-h'); el.innerHTML = s[k] != null ? s[k] : (fb[k] || ''); });
    document.querySelectorAll('a[data-l]').forEach(function (a) { var base = a.getAttribute('data-l'), parts = base.split('#'); a.href = parts[0] + (parts[0].indexOf('?') > -1 ? '&' : '?') + 'lang=' + l + (parts[1] ? '#' + parts[1] : ''); });
    document.querySelectorAll('.lang button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.l === l)); });
    if (s.title) document.title = s.title;
    var md = document.querySelector('meta[name=description]'); if (md && s.desc) md.setAttribute('content', s.desc);
    try { var u = new URL(location.href); u.searchParams.set('lang', l); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
    try { localStorage.setItem('edx_lang', l); } catch (e) {}
    if (onChange) onChange(l, s);
  }
  document.querySelectorAll('.lang button').forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.l); }); });
  var q = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
  if (!T[q]) { try { q = localStorage.getItem('edx_lang') || ''; } catch (e) { q = ''; } }
  if (!T[q]) { var n = (navigator.language || '').slice(0, 2).toLowerCase(); q = T[n] ? n : langs[0]; }
  apply(q);
  return { get lang() { return cur; }, set: apply };
};
