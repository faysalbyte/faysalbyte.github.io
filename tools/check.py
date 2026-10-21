#!/usr/bin/env python3
"""Static site checker: python3 tools/check.py   (exit code 1 on any problem)"""
import json, pathlib, re, sys, urllib.parse
from bs4 import BeautifulSoup

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "tools/site.config.json").read_text(encoding="utf8"))
errors, warns = [], []
E = lambda f, m: errors.append(f"{f}: {m}")
W = lambda f, m: warns.append(f"{f}: {m}")

def exists(ref, page):
    ref = urllib.parse.unquote(ref.split("#")[0].split("?")[0])
    if not ref: return True
    if (ROOT / (ref.lstrip("/") + ".html")).exists() or ref == "/": return True
    p = ROOT / ref.lstrip("/") if (ref.startswith("/") or CFG["pages"].get(page, {}).get("absolute")) and ref.startswith("/") else (ROOT / ref)
    return p.exists()

for page, meta in CFG["pages"].items():
    raw = (ROOT / page).read_text(encoding="utf8")
    soup = BeautifulSoup(raw, "lxml")
    # --- structure
    if not raw.lower().startswith("<!doctype html>"): E(page, "missing doctype")
    if soup.html.get("lang") != "en": E(page, "html lang missing")
    h1 = soup.find_all("h1")
    if len(h1) != 1: E(page, f"{len(h1)} <h1> elements")
    ids = [t["id"] for t in soup.find_all(id=True)]
    for i in {x for x in ids if ids.count(x) > 1}: E(page, f"duplicate id '{i}'")
    idset = set(ids)
    for t in soup.find_all(attrs={"aria-labelledby": True}):
        for ref in t["aria-labelledby"].split():
            if ref not in idset: E(page, f"aria-labelledby -> missing #{ref}")
    for t in soup.find_all(attrs={"aria-controls": True}):
        if t["aria-controls"] not in idset: E(page, f"aria-controls -> missing #{t['aria-controls']}")
    for t in soup.find_all(attrs={"aria-describedby": True}):
        for ref in t["aria-describedby"].split():
            if ref not in idset: E(page, f"aria-describedby -> missing #{ref}")
    for m in re.finditer(r"<\w+[^>]*\s<\w+", raw[raw.find("<body"):]):
        pass
    if re.search(r"</\w+\s+<", raw): E(page, "malformed closing tag (e.g. '</span <span')")
    # --- head
    t = soup.title.string if soup.title else ""
    if t != meta["title"]: E(page, "title mismatch")
    d = soup.find("meta", attrs={"name": "description"})
    if not d or len(d["content"]) > 160: E(page, "description missing/too long")
    canon = soup.find("link", rel="canonical")
    if not canon or not canon["href"].startswith(CFG["baseUrl"]): E(page, "bad canonical")
    for s in soup.find_all("script", type="application/ld+json"):
        try: json.loads(s.string)
        except Exception as ex: E(page, f"invalid JSON-LD: {ex}")
    if "robots" in meta:
        r = soup.find("meta", attrs={"name": "robots"})
        if not r or "noindex" not in r["content"]: E(page, "should be noindex")
    # --- links & assets
    for a in soup.find_all("a", href=True):
        if re.search(r"\.html([#?]|$)", a["href"]) and not a["href"].startswith("http"): E(page, f"link still has .html: {a['href']}")
    for tag, attr in (("a", "href"), ("img", "src"), ("script", "src"), ("link", "href"), ("source", "src"), ("video", "poster")):
        for el in soup.find_all(tag, attrs={attr: True}):
            ref = el[attr]
            if re.match(r"^(https?:|mailto:|tel:|data:|//|#)", ref):
                if tag == "a" and ref.startswith("http") and el.get("target") == "_blank" and "noopener" not in (el.get("rel") or []):
                    W(page, f"target=_blank without rel=noopener: {ref[:60]}")
                if ref.startswith("http://"): E(page, f"insecure http:// URL {ref[:60]}")
                if ref.startswith("#") and len(ref) > 1 and ref[1:] not in idset: E(page, f"anchor {ref} has no target")
                if ref.startswith(CFG["baseUrl"]):                       # absolute self links
                    local = ref[len(CFG["baseUrl"]):].split("#")[0].split("?")[0] or "index"
                    if ".html" in local: E(page, f"self URL still has .html: {ref}")
                    if not ((ROOT / local).exists() or (ROOT / (local + ".html")).exists()): E(page, f"self URL does not exist: {ref}")
                continue
            if ref.startswith("javascript:"): E(page, "javascript: URL"); continue
            if not exists(ref, page):
                (W if ref.startswith("videos/") else E)(page, f"missing file: {ref}")
    # inline style url(&quot;...&quot;) backgrounds
    for el in soup.find_all(style=True):
        for m in re.finditer(r'url\(["\']?([^"\')]+)["\']?\)', el["style"]):
            if not m.group(1).startswith(("http", "data:")) and not exists(m.group(1), page): E(page, f"missing bg image {m.group(1)}")
    # mobile menu present wherever the hamburger is
    if soup.find(id="menuButton") and not soup.find(id="mobileMenu"): E(page, "menu button without #mobileMenu")
    # lazy loading hint
    for img in soup.find_all("img"):
        if not img.get("alt"): E(page, f"img without alt: {img.get('src')}")

# --- shared files
for f in ["robots.txt", "sitemap.xml", "llms.txt", "site.webmanifest", "browserconfig.xml", "favicon.ico", ".well-known/security.txt",
          "icons/favicon.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
          "social/og-image.jpg", "social/twitter-card.jpg", "404.html", ".htaccess", ".nojekyll"]:
    if not (ROOT / f).exists(): E(f, "missing")
json.loads((ROOT / "site.webmanifest").read_text())
sm = BeautifulSoup((ROOT / "sitemap.xml").read_text(), "xml")
for loc in [u.find("loc", recursive=False) for u in sm.find_all("url")]:
    u = loc.text
    if u.startswith(CFG["baseUrl"]):
        rel = u[len(CFG["baseUrl"]):] or "index"
        if ".html" in rel or not (ROOT / (rel + ".html")).exists(): E("sitemap.xml", f"bad url {u}")
if not warns and not errors: print("all checks passed")
for w in warns: print("WARN ", w)
for e in errors: print("ERROR", e)
print(f"{len(errors)} error(s), {len(warns)} warning(s)")
sys.exit(1 if errors else 0)
