#!/usr/bin/env python3
"""
Regenerates the <head> and the closing <script> tags of every page from
tools/site.config.json, so SEO / social / icon / schema markup lives in ONE
place instead of ten copies.  Also regenerates sitemap.xml.

    python3 tools/build.py

Page bodies are NOT touched; edit them directly in the .html files.
Inline <style> blocks that already exist in a page head are preserved.
"""
import json, re, html, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "tools" / "site.config.json").read_text(encoding="utf8"))
BASE = CFG["baseUrl"]
esc = lambda s: html.escape(s, quote=True)

CSP_TMPL = ("default-src 'self'; "
       "script-src 'self'{script}; "
       "style-src 'self'{style} https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
       "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
       "img-src 'self' data: https://images.unsplash.com https://cdn-icons-png.flaticon.com https://*.google.com https://*.gstatic.com; "
       "media-src 'self'; frame-src https://www.google.com; "
       "form-action 'self'; connect-src {connect}; "
       "base-uri 'self'; object-src 'none'; upgrade-insecure-requests")

CSP = CSP_TMPL.format(connect="'self'", script="", style="")
def csp_for(fname):
    """index.html loads the AI voice assistant component from the private backend (aiOrigin); contact.html may reach the Vercel mail API."""
    api = CFG.get("apiOrigin", "").strip()
    ai = CFG.get("aiOrigin", "").strip()
    if fname == "index.html" and ai:
        return CSP_TMPL.format(connect="'self' " + ai, script=" " + ai, style=" " + ai)
    return CSP_TMPL.format(connect="'self' " + api if fname == "contact.html" and api else "'self'", script="", style="")

def url(page):  return BASE + page["path"]

def schema(fname, page):
    pid, wid = BASE + "#person", BASE + "#website"
    person = {
        "@type": "Person", "@id": pid, "name": CFG["author"], "alternateName": CFG["alternateName"],
        "url": BASE, "image": BASE + "social/md-faysal-hossain-mern-stack-developer-og-image.jpg", "jobTitle": CFG["jobTitle"],
        "description": "Certified MERN Stack Developer, Web Designer, SEO Expert and NSDA Certified Trainer based in Dhaka, Bangladesh, available for remote projects worldwide.",
        "email": "mailto:" + CFG["email"], "telephone": CFG["telephone"],
        "knowsAbout": CFG["knowsAbout"],
        "hasCredential": [{"@type": "EducationalOccupationalCredential", "credentialCategory": c,
                           "recognizedBy": {"@type": "Organization", "name": o}} for c, o in CFG["credentials"]],
        "address": {"@type": "PostalAddress", "addressLocality": "Dhaka", "addressCountry": "BD"},
        "worksFor": {"@type": "Organization", "name": "Freelance"},
        "sameAs": CFG["sameAs"],
    }
    service = {
        "@type": "ProfessionalService", "@id": BASE + "#service", "name": "MD Faysal Hossain - MERN Stack Developer",
        "url": BASE, "image": BASE + "social/md-faysal-hossain-mern-stack-developer-og-image.jpg", "logo": BASE + "icons/md-faysal-hossain-web-app-icon-512.png",
        "description": "Web development, eCommerce, CMS, SEO and training services for remote clients in the USA, UK, Canada, Australia and Europe.",
        "founder": {"@id": pid}, "telephone": CFG["telephone"], "email": CFG["email"], "priceRange": "$$",
        "address": {"@type": "PostalAddress", "addressLocality": "Dhaka", "addressCountry": "BD"},
        "geo": {"@type": "GeoCoordinates", "latitude": CFG["geo"]["lat"], "longitude": CFG["geo"]["lng"]},
        "hasMap": CFG["mapUrl"], "areaServed": "Worldwide", "sameAs": CFG["sameAs"],
        "potentialAction": {"@type": "ReviewAction", "target": CFG["reviewUrl"]},
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Web Development Services", "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n, "description": d}} for n, d in [
                ("MERN Stack Development", "Full-stack web development using MongoDB, Express.js, React.js, and Node.js"),
                ("Ecommerce Development", "Custom ecommerce platforms with Shopify, WooCommerce, and payment gateway integration"),
                ("CMS Development", "Custom WordPress, Wix, and Shopify CMS solutions"),
                ("SEO Optimization", "On-page SEO, technical SEO, and digital marketing strategies")]]},
    }
    website = {"@type": "WebSite", "@id": wid, "name": CFG["siteName"], "url": BASE,
               "inLanguage": "en", "author": {"@id": pid}, "publisher": {"@id": pid}}
    webpage = {"@type": "ProfilePage" if page["type"] == "profile" else "WebPage", "@id": url(page) + "#webpage",
               "url": url(page), "name": page["title"], "description": page["description"], "inLanguage": "en",
               "isPartOf": {"@id": wid}, "about": {"@id": pid},
               "primaryImageOfPage": {"@type": "ImageObject", "url": BASE + "social/md-faysal-hossain-mern-stack-developer-og-image.jpg", "width": 1200, "height": 630},
               "speakable": {"@type": "SpeakableSpecification", "cssSelector": ["h1", "main p"]}}
    if page["type"] == "profile": webpage["mainEntity"] = {"@id": pid}
    graph = [person, service, website, webpage]
    if fname != "index.html":
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE},
            {"@type": "ListItem", "position": 2, "name": page["name"], "item": url(page)}]})
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":"))

def head(fname, page, inline_styles):
    pre = "/" if page.get("absolute") else ""          # 404 is served from any depth -> root-relative
    robots = page.get("robots")
    indexable = robots is None
    full = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    t, d, u = esc(page["title"]), esc(page["description"]), url(page)
    assert len(page["title"]) <= 60, (fname, "title", len(page["title"]))
    assert len(page["description"]) <= 160, (fname, "description", len(page["description"]))
    h = []
    a = h.append
    # --- core / technical
    a('<meta charset="UTF-8" />')
    a('<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />')
    a('<meta http-equiv="X-UA-Compatible" content="IE=edge" />')
    a(f'<meta http-equiv="Content-Security-Policy" content="{esc(csp_for(fname))}" />')
    a('<meta name="referrer" content="strict-origin-when-cross-origin" />')
    a('<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />')
    a(f'<meta name="theme-color" content="{CFG["themeColor"]}" />')
    a(f'<title>{t}</title>')
    a(f'<meta name="description" content="{d}" />')
    # --- robots
    a(f'<meta name="robots" content="{robots or full}" />')
    for bot in ("googlebot", "bingbot"):
        a(f'<meta name="{bot}" content="{robots or full}" />')
    if indexable:
        a('<meta name="googlebot-news" content="index, follow" />')
        a('<meta name="googlebot-image" content="index, follow" />')
        a('<meta name="googlebot-video" content="index, follow, max-video-preview:-1" />')
    # --- identity
    a(f'<meta name="author" content="{esc(CFG["author"])}" />')
    a('<meta name="rating" content="general" />')
    a(f'<meta name="application-name" content="{esc(CFG["siteName"])}" />')
    a(f'<meta name="apple-mobile-web-app-title" content="{esc(CFG["author"])}" />')
    a('<meta name="mobile-web-app-capable" content="yes" />')
    a('<meta name="apple-mobile-web-app-capable" content="yes" />')
    a('<meta name="msapplication-TileColor" content="#0d47a1" />')
    a(f'<meta name="msapplication-config" content="{pre}browserconfig.xml" />')
    if page["path"] == "":
        a(f'<meta name="keywords" content="{esc(CFG["keywords"])}" />')
        for tok in CFG["verification"]:
            a(f'<meta name="google-site-verification" content="{esc(tok)}" />')
    # --- canonical / alternate
    a(f'<link rel="canonical" href="{u}" />')
    a(f'<link rel="alternate" hreflang="en" href="{u}" />')
    a(f'<link rel="alternate" hreflang="x-default" href="{u}" />')
    # --- Open Graph
    og = [("og:type", page["type"]), ("og:url", u), ("og:title", page["title"]), ("og:description", page["description"]),
          ("og:site_name", CFG["siteName"]), ("og:locale", CFG["locale"]),
          ("og:image", BASE + page.get("ogImage", "social/md-faysal-hossain-mern-stack-developer-og-image.jpg")), ("og:image:secure_url", BASE + page.get("ogImage", "social/md-faysal-hossain-mern-stack-developer-og-image.jpg")),
          ("og:image:type", "image/jpeg"), ("og:image:width", "1200"), ("og:image:height", "630"),
          ("og:image:alt", "MD Faysal Hossain - MERN Stack Developer, Web Designer and SEO Expert")]
    if page["type"] == "profile":
        og += [("profile:first_name", "Faysal"), ("profile:last_name", "Hossain"),
               ("profile:username", "faysalbyte"), ("profile:gender", "male")]
    for k, v in og: a(f'<meta property="{k}" content="{esc(v)}" />')
    # --- Twitter / X
    tw = [("twitter:card", "summary_large_image"), ("twitter:site", CFG["twitter"]), ("twitter:creator", CFG["twitter"]),
          ("twitter:title", page["title"]), ("twitter:description", page["description"]),
          ("twitter:image", BASE + page.get("ogImage", "social/md-faysal-hossain-mern-stack-developer-twitter-card.jpg")),
          ("twitter:image:alt", "MD Faysal Hossain - MERN Stack Developer")]
    for k, v in tw: a(f'<meta name="{k}" content="{esc(v)}" />')
    a('<meta name="pinterest-rich-pin" content="true" />')
    # --- icons / manifest
    a(f'<link rel="icon" href="{pre}favicon.ico" sizes="48x48" />')
    a(f'<link rel="icon" type="image/svg+xml" href="{pre}icons/md-faysal-hossain-favicon.svg" />')
    a(f'<link rel="icon" type="image/png" sizes="32x32" href="{pre}icons/md-faysal-hossain-favicon-32x32.png" />')
    a(f'<link rel="icon" type="image/png" sizes="16x16" href="{pre}icons/md-faysal-hossain-favicon-16x16.png" />')
    a(f'<link rel="apple-touch-icon" sizes="180x180" href="{pre}icons/md-faysal-hossain-apple-touch-icon.png" />')
    a(f'<link rel="mask-icon" href="{pre}icons/md-faysal-hossain-safari-pinned-tab.svg" color="#e95b24" />')
    a(f'<link rel="manifest" href="{pre}site.webmanifest" />')
    if indexable:
        a(f'<link rel="alternate" type="text/plain" href="{BASE}llms.txt" title="LLM-readable site summary" />')
        a(f'<link rel="sitemap" type="application/xml" title="Sitemap" href="{pre}sitemap.xml" />')
    # --- performance hints
    a('<link rel="preconnect" href="https://fonts.googleapis.com" />')
    a('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />')
    if page.get("preloadImage"):
        pi = page["preloadImage"]; href = pi if pi.startswith("http") else pre + pi
        typ = ' type="image/webp"' if href.endswith(".webp") else ""
        extra = ""
        if page.get("preloadSrcset"):
            extra = f' imagesrcset="{esc(page["preloadSrcset"])}" imagesizes="{esc(page["preloadSizes"])}"'
        a(f'<link rel="preload" as="image" href="{href}"{typ}{extra} fetchpriority="high" />')
    # Third-party stylesheets are loaded without blocking first paint: media="print" + common.js flips
    # it to "all" (inline onload is blocked by the CSP).  <noscript> keeps them working without JS.
    GF = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
    FA = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
    a(f'<link rel="stylesheet" href="{GF}" media="print" data-defer-css />')
    a(f'<link rel="stylesheet" href="{FA}" media="print" data-defer-css crossorigin="anonymous" referrerpolicy="no-referrer" />')
    a(f'<noscript><link rel="stylesheet" href="{GF}" /><link rel="stylesheet" href="{FA}" crossorigin="anonymous" referrerpolicy="no-referrer" /></noscript>')
    for c in page["css"]: a(f'<link rel="stylesheet" href="{pre}{c}" />')
    for c in page.get("noscriptCss", []): a(f'<noscript><link rel="stylesheet" href="{pre}{c}" /></noscript>')
    for s in inline_styles: a(s)
    a(f'<script type="application/ld+json">{schema(fname, page)}</script>')
    return "<head>" + "".join(h) + "</head>"

def build_page(fname, page):
    p = ROOT / fname
    src = p.read_text(encoding="utf8")
    m = re.search(r"<head>.*?</head>", src, re.S)
    styles = re.findall(r"<style>.*?</style>", m.group(0), re.S)
    out = src[:m.start()] + head(fname, page, styles) + src[m.end():]
    pre = "/" if page.get("absolute") else ""
    # closing scripts: drop every local <script src=...> and re-add the configured ones
    out = re.sub(r'<script src="[^"]+"(?: defer)?\s*></script>', "", out)
    tags = "".join(f'<script src="{src}" defer></script>' for src in (s.replace("{aiOrigin}", CFG.get("aiOrigin", "").strip()) if "{aiOrigin}" in s else pre + s for s in page["scripts"]))
    out = out.replace("</body>", tags + "</body>")
    if not out.lower().startswith("<!doctype html>"): out = "<!doctype html>" + out
    p.write_text(out, encoding="utf8")

def build_sitemap():
    ns = ('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
          'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" '
          'xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    rows = []
    for fname, page in CFG["pages"].items():
        if page.get("sitemap") is False: continue
        loc = esc(url(page))
        imgs = page.get("sitemapImages") or [["social/md-faysal-hossain-mern-stack-developer-og-image.jpg", page["name"] + " - MD Faysal Hossain"]]
        img_xml = "".join(f'    <image:image>\n      <image:loc>{esc(BASE + p)}</image:loc>\n'
                          f'      <image:title>{esc(t)}</image:title>\n    </image:image>\n' for p, t in imgs)
        rows.append(f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{CFG["lastmod"]}</lastmod>\n'
                    f'    <changefreq>{page["changefreq"]}</changefreq>\n    <priority>{page["priority"]}</priority>\n'
                    f'    <xhtml:link rel="alternate" hreflang="en" href="{loc}" />\n'
                    f'    <xhtml:link rel="alternate" hreflang="x-default" href="{loc}" />\n{img_xml}  </url>')
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<?xml-stylesheet type="text/xsl" href="sitemap.xsl"?>\n'
                                      f'<urlset {ns}>\n' + "\n".join(rows) + "\n</urlset>\n", encoding="utf8")

def build_review_share_page(out_dir):
    """share/google-review.html: link preview for the homepage Google Review card.

    The homepage keeps its own default Open Graph tags.  The Share / Copy link buttons in the
    review section share BASE/share/google-review#google-review instead.  Crawlers read this
    page's own og:image (a snapshot of the review card); people are redirected to /#google-review.
    """
    slug = "google-review"
    share_url = f"{BASE}share/{slug}"
    target = "/#google-review"
    title = "Leave a Google Review | MD Faysal Hossain"
    about = "Worked with me? Share your experience on Google. It takes less than a minute."
    img = f"{BASE}social/md-faysal-hossain-google-review-card-share-image.jpg"
    alt = "Google Reviews card with five gold stars and a Leave a review button"
    meta = [("og:type", "website"), ("og:url", share_url), ("og:title", title), ("og:description", about),
            ("og:site_name", CFG["siteName"]), ("og:locale", CFG["locale"]),
            ("og:image", img), ("og:image:secure_url", img), ("og:image:type", "image/jpeg"),
            ("og:image:width", "1200"), ("og:image:height", "630"), ("og:image:alt", alt)]
    tw = [("twitter:card", "summary_large_image"), ("twitter:site", CFG["twitter"]), ("twitter:title", title),
          ("twitter:description", about), ("twitter:image", img), ("twitter:image:alt", alt)]
    lines = ['<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="utf-8" />',
             '<meta name="viewport" content="width=device-width, initial-scale=1" />',
             f'<meta http-equiv="Content-Security-Policy" content="{esc(CSP)}" />',
             f'<title>{esc(title)}</title>', f'<meta name="description" content="{esc(about)}" />',
             '<meta name="robots" content="noindex, follow" />', f'<link rel="canonical" href="{share_url}" />',
             f'<meta http-equiv="refresh" content="0; url={target}" />']
    lines += [f'<meta property="{k}" content="{esc(v)}" />' for k, v in meta]
    lines += [f'<meta name="{k}" content="{esc(v)}" />' for k, v in tw]
    lines += ['</head>', '<body>', '<main>', '<h1>Leave a Google Review</h1>', f'<p>{esc(about)}</p>',
              f'<p><a href="{target}">Open the review section on the homepage</a></p>', '</main>', '</body>', '</html>', '']
    (out_dir / f"{slug}.html").write_text("\n".join(lines), encoding="utf8")
    return 1

def build_share_pages():
    """One tiny static page per portfolio card: share/<id>.html.

    Social crawlers (Facebook, WhatsApp, Telegram, X, LinkedIn) do not run JavaScript, so
    a per-card preview needs a real URL with its own Open Graph tags.  The Share button on
    every portfolio card shares BASE/share/<id>; people who open it are redirected to
    portfolio#<id>, which opens that card's details.  Card data is read from portfolio.html.
    """
    src = (ROOT / "portfolio.html").read_text(encoding="utf8")
    out_dir = ROOT / "share"
    out_dir.mkdir(exist_ok=True)
    for old in out_dir.glob("*.html"): old.unlink()
    count = build_review_share_page(out_dir)
    for card in re.findall(r'<div class="card">.*?</div></div></div></div>', src, re.S):
        slug = re.search(r'data-modal="([^"]+)"', card)
        name = re.search(r'<span class="name">([^<]+)</span>', card)
        about = re.search(r'<span class="about-me">([^<]+)</span>', card)
        poster = re.search(r'(?:data-)?poster="(https://images\.unsplash\.com/[^"?]+)', card)
        if not (slug and name and about and poster): continue
        slug, name, about = slug.group(1), html.unescape(name.group(1)), html.unescape(about.group(1))
        img = poster.group(1) + "?auto=format&fit=crop&w=1200&h=630&q=80"
        share_url = f"{BASE}share/{slug}"
        title = f"{name} | Portfolio - MD Faysal Hossain"
        target = f"{BASE}portfolio#{slug}"
        alt = f"{name} - portfolio project by MD Faysal Hossain"
        meta = [("og:type", "article"), ("og:url", share_url), ("og:title", title), ("og:description", about),
                ("og:site_name", CFG["siteName"]), ("og:locale", CFG["locale"]),
                ("og:image", img), ("og:image:secure_url", img), ("og:image:type", "image/jpeg"),
                ("og:image:width", "1200"), ("og:image:height", "630"), ("og:image:alt", alt)]
        tw = [("twitter:card", "summary_large_image"), ("twitter:site", CFG["twitter"]), ("twitter:title", title),
              ("twitter:description", about), ("twitter:image", img), ("twitter:image:alt", alt)]
        lines = ['<!DOCTYPE html>', '<html lang="en">', '<head>', '<meta charset="utf-8" />',
                 '<meta name="viewport" content="width=device-width, initial-scale=1" />',
                 f'<meta http-equiv="Content-Security-Policy" content="{esc(CSP)}" />',
                 f'<title>{esc(title)}</title>', f'<meta name="description" content="{esc(about)}" />',
                 '<meta name="robots" content="noindex, follow" />', f'<link rel="canonical" href="{share_url}" />',
                 f'<meta http-equiv="refresh" content="0; url=/portfolio#{slug}" />']
        lines += [f'<meta property="{k}" content="{esc(v)}" />' for k, v in meta]
        lines += [f'<meta name="{k}" content="{esc(v)}" />' for k, v in tw]
        lines += ['</head>', '<body>', '<main>', f'<h1>{esc(name)}</h1>', f'<p>{esc(about)}</p>',
                  f'<p><a href="/portfolio#{slug}">Open this project in the portfolio</a></p>', '</main>', '</body>', '</html>', '']
        (out_dir / f"{slug}.html").write_text("\n".join(lines), encoding="utf8")
        count += 1
    return count


if __name__ == "__main__":
    for f, pg in CFG["pages"].items(): build_page(f, pg)
    build_sitemap()
    shared = build_share_pages()
    print("built", len(CFG["pages"]), "pages + sitemap.xml +", shared, "share pages")
