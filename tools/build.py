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

CSP = ("default-src 'self'; "
       "script-src 'self'; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
       "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
       "img-src 'self' data: https://images.unsplash.com https://cdn-icons-png.flaticon.com https://*.google.com https://*.gstatic.com; "
       "media-src 'self'; frame-src https://www.google.com; "
       "form-action 'self' https://formspree.io; connect-src 'self' https://formspree.io; "
       "base-uri 'self'; object-src 'none'; upgrade-insecure-requests")

def url(page):  return BASE + page["path"]

def schema(fname, page):
    pid, wid = BASE + "#person", BASE + "#website"
    person = {
        "@type": "Person", "@id": pid, "name": CFG["author"], "alternateName": CFG["alternateName"],
        "url": BASE, "image": BASE + "social/og-image.jpg", "jobTitle": CFG["jobTitle"],
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
        "url": BASE, "image": BASE + "social/og-image.jpg", "logo": BASE + "icons/icon-512.png",
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
               "primaryImageOfPage": {"@type": "ImageObject", "url": BASE + "social/og-image.jpg", "width": 1200, "height": 630},
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
    a(f'<meta http-equiv="Content-Security-Policy" content="{esc(CSP)}" />')
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
          ("og:image", BASE + "social/og-image.jpg"), ("og:image:secure_url", BASE + "social/og-image.jpg"),
          ("og:image:type", "image/jpeg"), ("og:image:width", "1200"), ("og:image:height", "630"),
          ("og:image:alt", "MD Faysal Hossain - MERN Stack Developer, Web Designer and SEO Expert")]
    if page["type"] == "profile":
        og += [("profile:first_name", "Faysal"), ("profile:last_name", "Hossain"),
               ("profile:username", "faysalbyte"), ("profile:gender", "male")]
    for k, v in og: a(f'<meta property="{k}" content="{esc(v)}" />')
    # --- Twitter / X
    tw = [("twitter:card", "summary_large_image"), ("twitter:site", CFG["twitter"]), ("twitter:creator", CFG["twitter"]),
          ("twitter:title", page["title"]), ("twitter:description", page["description"]),
          ("twitter:image", BASE + "social/twitter-card.jpg"),
          ("twitter:image:alt", "MD Faysal Hossain - MERN Stack Developer")]
    for k, v in tw: a(f'<meta name="{k}" content="{esc(v)}" />')
    a('<meta name="pinterest-rich-pin" content="true" />')
    # --- icons / manifest
    a(f'<link rel="icon" href="{pre}favicon.ico" sizes="48x48" />')
    a(f'<link rel="icon" type="image/svg+xml" href="{pre}icons/favicon.svg" />')
    a(f'<link rel="icon" type="image/png" sizes="32x32" href="{pre}icons/favicon-32x32.png" />')
    a(f'<link rel="icon" type="image/png" sizes="16x16" href="{pre}icons/favicon-16x16.png" />')
    a(f'<link rel="apple-touch-icon" sizes="180x180" href="{pre}icons/apple-touch-icon.png" />')
    a(f'<link rel="mask-icon" href="{pre}icons/safari-pinned-tab.svg" color="#e95b24" />')
    a(f'<link rel="manifest" href="{pre}site.webmanifest" />')
    if indexable:
        a(f'<link rel="alternate" type="text/plain" href="{BASE}llms.txt" title="LLM-readable site summary" />')
        a(f'<link rel="sitemap" type="application/xml" title="Sitemap" href="{pre}sitemap.xml" />')
    # --- performance hints
    a('<link rel="preconnect" href="https://fonts.googleapis.com" />')
    a('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />')
    if page.get("preloadImage"):
        a(f'<link rel="preload" as="image" href="{pre}{page["preloadImage"]}" type="image/webp" fetchpriority="high" />')
    a('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />')
    a('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />')
    for c in page["css"]: a(f'<link rel="stylesheet" href="{pre}{c}" />')
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
    tags = "".join(f'<script src="{pre}{s}" defer></script>' for s in page["scripts"])
    out = out.replace("</body>", tags + "</body>")
    if not out.lower().startswith("<!doctype html>"): out = "<!doctype html>" + out
    p.write_text(out, encoding="utf8")

def build_sitemap():
    ns = ('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
          'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
    rows = []
    for fname, page in CFG["pages"].items():
        if page.get("sitemap") is False: continue
        rows.append(f'  <url>\n    <loc>{esc(url(page))}</loc>\n    <lastmod>{CFG["lastmod"]}</lastmod>\n'
                    f'    <changefreq>{page["changefreq"]}</changefreq>\n    <priority>{page["priority"]}</priority>\n'
                    f'    <image:image>\n      <image:loc>{BASE}social/og-image.jpg</image:loc>\n'
                    f'      <image:title>{esc(page["name"])} - MD Faysal Hossain</image:title>\n    </image:image>\n  </url>')
    (ROOT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset {ns}>\n' + "\n".join(rows) + "\n</urlset>\n", encoding="utf8")

if __name__ == "__main__":
    for f, pg in CFG["pages"].items(): build_page(f, pg)
    build_sitemap()
    print("built", len(CFG["pages"]), "pages + sitemap.xml")
