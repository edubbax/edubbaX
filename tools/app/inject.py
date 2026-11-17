"""Inject tools/app/public-profile.{js,css} into index.html (idempotent)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
html = (root / "index.html").read_text(encoding="utf-8")
js = (root / "tools/app/public-profile.js").read_text(encoding="utf-8").strip()
css = (root / "tools/app/public-profile.css").read_text(encoding="utf-8").strip()
html = re.sub(r"/\* ---- public-profile\.js ---- \*/.*?/\* ---- end public-profile\.js ---- \*/\n?", "", html, flags=re.S)
html = re.sub(r"/\* ---- public-profile\.css ---- \*/.*?/\* ---- end public-profile\.css ---- \*/\n?", "", html, flags=re.S)
assert html.count("async function boot() {") == 1
html = html.replace("async function boot() {", js + "\n\nasync function boot() {", 1)
i = html.index("</style>")
html = html[:i] + css + "\n" + html[i:]
(root / "index.html").write_text(html, encoding="utf-8")
print("injected", len(js), len(css))
