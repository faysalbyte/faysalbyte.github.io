# Changes

## Bugs fixed
- `profile.jpg` (favicon, og:image, schema) did not exist -> real favicon set + social images generated from your photo.
- Canonical / og:url / schema / sitemap / robots / 404 all pointed to `/portfolio/...`, which does not exist for a `faysalbyte.github.io` user-site repo -> root URLs. (Change `baseUrl` in `tools/site.config.json` if you really deploy under `/portfolio/`.)
- `portfolio.html`, `contact.html` and `skills.html` canonicals duplicated the home page / used a non-existent URL.
- `skills.html`: malformed `</span <span ...>` removed the animated brand dots.
- "Home" was highlighted on every page -> the current page is highlighted.
- Hamburger did nothing on thank-you, privacy, terms, ai-info, entity-map (no `#mobileMenu`) -> added.
- Skills page attached 3 conflicting menu listeners (+1 from contact.js) -> one shared implementation.
- Footer link labelled "Skills" went to Portfolio.
- Two Font Awesome versions (5.6.3 + 6.x) loaded together -> single 6.5.0.
- Unused LinkedIn badge script removed (render-blocking third party, no badge on the page).
- Contact map used placeholder coordinates -> your Google Business Profile embed.
- Contact form never used the existing "Sent" button state and `_next` pointed at a wrong URL -> AJAX submit, "Sent" animation, redirect to `thank-you.html`, error message on failure, honeypot field.
- Contact info section had `aria-labelledby` to a missing id; SVG `xmlns="http://w3.org"`; `target=""`.
- `entity-map.html`: WordPress icon used the solid style (blank) -> brand style.
- 404 page: `/portfolio/` link and `javascript:history.back()` (blocked by CSP) -> `/` and a data attribute handled in `common.js`.
- Skills carousels: `aria-pressed` was never updated; autoplay ignored `prefers-reduced-motion`; timers restarted for missing elements.
- Home parallax ran `requestAnimationFrame` forever -> stops when settled.
- robots.txt blocked GPTBot/ClaudeBot etc. (against your AI-search goal) and listed folders that do not exist; it also lived in a path crawlers never read.
- sitemap listed the noindex thank-you page and a missing image.
- `schema` email `hello@faysalbyte.github.io` does not exist -> your Gmail.
- `cookie-banner.js` pointed to `/portfolio/privacy.html`, and unguarded `localStorage` (it is still not loaded on any page, as before).

## Reusable code
- `common.js`: menu, year, reduced-motion, history-back (was copy-pasted in 4 files).
- `tools/site.config.json` + `tools/build.py`: one source for every `<head>`, JSON-LD and the sitemap.
- Page JS files are now readable (un-minified) and contain page-specific logic only. CSS was left untouched on purpose so the design cannot shift.

## Added
favicon set, social images (OG 1200x630, LinkedIn, X, Pinterest, WhatsApp), `site.webmanifest`, `browserconfig.xml`, `llms.txt`, `.well-known/security.txt`, `robots.txt`, `sitemap.xml`, `.htaccess`, `server-config/` (Nginx with HTTP/2 + HTTP/3, Apache vhost with module settings), `package.json`, `.nojekyll`, `.gitignore`, Google review link + map link, CSP / referrer / robots / hreflang / Open Graph / Twitter meta.

## Needs your input
- `videos/*.mp4` do not exist (posters still show). Add the files or remove the `<video>` tags.
- Portfolio "Website" buttons all point to `https://example.com`.
- The second Search Console token you pasted looks like a sample; both are included on the home page, remove it if it is not yours.
