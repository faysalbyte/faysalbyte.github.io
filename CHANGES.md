# Changes

## v5 - backend bridge, overflow clip, theme (this release)
- **Backend bridge:** `contact.html` pointed at the placeholder `YOUR-PROJECT.vercel.app` (CSP `connect-src` too). The AI chat (`#aiChat`) now POSTs to `https://faysalbyte-ai-backend.vercel.app/api/ai-voice-assistant/chat` (`{message, history, lang}` -> `{reply}`); `contact.js` maps the backend's `code` values (rate_limit, daily_limit, quota, blocked, timeout, unavailable) to friendly messages. Client timeout 12 s.
- **No AI logic in the frontend:** removed the leftover OpenAI `api/chat.js`. `api/contact.js` (Gmail mailer, a server function that cannot run on GitHub Pages) moved to `backend/api/contact.js`; `backend/package.json` and `vercel.json` updated. **Redeploy the backend** and set `GMAIL_USER`, `GMAIL_APP_PASSWORD` (optional `CONTACT_TO_EMAIL`) or the contact form will fail.
- **Reflow:** `enhance.css` sets `html, body { overflow-x: clip !important }` (no scroll container, sticky keeps working); `enhance.js` adds a `ResizeObserver` on `<html>` that forces one reflow, resets stray horizontal scroll and fires one resize if the browser did not.
- **Theme:** `theme-color` / tile colour changed from blue `#0d47a1` to charcoal `#0a0a0a` on all pages.
- `tools/site.config.json` apiOrigin set; `sw.js` cache `sx-v5`. Section 5 files and markup are byte-identical to v4.

## v4 - viewport sync, zero-console audit (viewport-sync.js)
- **Viewport reflow (Fix 1):** new `viewport-sync.js` (about 4 KB, no timers while idle, no layout writes, CLS unaffected). It watches `resize`, `orientationchange`, `visualViewport`, a `ResizeObserver` on `<html>`, pixel-ratio and hover/pointer changes, waits one frame plus one 160 ms settle check, then fires a single `sx:viewport` event (and one `resize` if the browser did not send one) and publishes `--sx-vw` / `--sx-vh`. Consumers: certificate cards (`cert-toggle.js` now also observes each description with a `ResizeObserver`, so the "Explore details" button and the 2-line clamp re-evaluate when text re-wraps) and the hero pointer parallax (`script.js`, it used to read hover/pointer capability once at load, so a phone-to-desktop emulation switch never enabled it). The section stack, hero and timeline were already re-measuring correctly; verified by pixel comparison of a fresh load against a switched viewport (identical at 0.0 percent in nearly every scroll position, the rest were lazy thumbnails still decoding).
- **Install banner (Fix 2):** already single-line (`nowrap` + `ellipsis`); verified at 280, 320, 375, 390, 480, 768, 1024 and 1366 px: never wraps, never leaves the screen. Added `contain: layout style` to the fixed banner and toast so they cannot trigger page reflow. Below about 480 px the message is cut with an ellipsis by design (full text in the `title`).
- **Console (Fix 3):**
  - `index.html`: removed `data-src-webm` on both trainer videos (`videos/*.webm` do not exist, every visit logged two red 404s; the `.mp4` files are used).
  - `index.html` + `tools/site.config.json`: hero preload `imagesizes` now matches the real `<img sizes>` (it picked a different file, causing a double download and the "preloaded but not used" warning).
  - `portfolio.js`: `typeof gsap` was true because `<section id="gsap">` is exposed as `window.gsap`, so `gsap.from(...)` threw "gsap.from is not a function" on every load. Guard now checks the real function.
  - `sw.js` (v4): never returns `undefined` to `respondWith` (offline `TypeError`), catches every `cache.put`, and lets video/range requests go straight to the network.
  - `backend/component/runtime.js`: the `[ai-voice-assistant]` `console.info` logger is now silent.
  - Measured in headless Chromium with the real AI component served locally and fonts/CDN stubbed: 0 console messages and 0 page errors on index, portfolio, skills and contact, at 1366x768 and 390x844, including desktop-to-phone and phone-to-desktop switches, banner shown, certificate toggles clicked.
  - `tests/console-clean.spec.js` fails on any console message or HTTP 4xx/5xx; run `npm run test:e2e` with internet access.
- **Build tool:** `tools/site.config.json` did not list `skeleton.css/js` or `cert-toggle.css/js` (or the `<noscript>` certificate CSS), so `npm run build` would have stripped them from `index.html`. They are now registered (new `noscriptCss` key in `build.py`), and `viewport-sync.js` is registered too. A rebuilt `index.html` was diffed against the shipped one.
- Section 5 (15 certificates) logic is unchanged apart from the extra observer.

## Install banner + certificate toggles (cert-toggle.css / cert-toggle.js)
- **Install banner** (`enhance.css`, `enhance.js`): the banner is now one non-wrapping row at every width (`flex-wrap:nowrap`; the message uses `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`; buttons never shrink). Under 480px the round icon is hidden and spacing is tightened so the whole message still fits on a 375px phone; the full text is also in the `title`. Copy shortened to "Install MD FAYSAL HOSSAIN as an app" / "Tap Share, then Add to Home Screen".
- **Section 5, all 15 certificate cards:** description is clamped to 2 lines (`-webkit-line-clamp:2`, ellipsis). Under it an orange `#FF6B00` pill button ("Explore details" / "Minimize details") with a glow and a pulse ring (transform + opacity only, runs only while the card is on screen and collapsed). Click expands the height smoothly (Web Animations API) while the new words fade in one by one; click again collapses back to 2 lines. Every card has its own state, so any number can be open at once. Cards are rounded (20px) with soft drop-shadows.
- Hardware load: no timers while idle, one delegated click listener, one IntersectionObserver, `will-change` only during an animation, `prefers-reduced-motion` gets instant toggling, print shows full text.
- No-JS: `cert-toggle-noscript.css` shows the full text and hides the buttons.
- Accessible: real `<button>`, `aria-expanded`, `aria-controls`, `aria-describedby` (card title), visible focus ring.
- Copy fixes in the section intro: "Twelve" corrected to "Fifteen" credentials, "3 credential" to "3 credentials".
- `sw.js`: new files cached, version bumped to `sx-v3`.


## Section skeletons and loaders (skeleton.css + skeleton.js)
Additive only: no existing colour, layout or component was changed.
- **Section 1 (hero):** static overlay markup in `index.html` paints with the first frame. An SVG outline traced from the real portrait silhouette (left contour, over the head, down the right) draws in orange `#FF6B00` while "MD FAYSAL HOSSAIN / এমডি ফয়সাল" types in beside it. Both loop (CSS) until the portrait is decoded and fonts are ready, then fade out. The outline is fitted with the same maths as `object-fit: cover` + `object-position`, so it matches on any screen. CSS failsafe removes it after 20 s; hidden when JS is off.
- **Section 2:** untouched.
- **Section 3 (AI):** built by JS, starts when the section enters the viewport (IntersectionObserver). Concave "spoon" frame sized like the avatar, 10 to 0 countdown, upward binary canvas stream with FAYSALBYTE / এমডি ফয়সাল injected at staggered intervals. Fades out when the countdown is done AND the assistant has mounted; otherwise locks at 0 with "Waiting for Neural Core..." and keeps going (a plain contact link appears after 20 s). Height is reserved from first paint; measured CLS equals the no-skeleton baseline.
- **Section 4:** centred "Training Experience" typing banner (4 s, set in `CFG.typeMs`), then cross-fade.
- **Section 5:** certificate vector with orange border trace and laser sweep; reveals when the first certificate images are decoded (1.6 s minimum, 8 s maximum).
- `enhance.js`: one early return so the older 9 s AI skeleton does not fight the new loader. `sw.js`: new files added, cache bumped to `sx-v2`.
- `prefers-reduced-motion`: no loops; sections 4 and 5 skip their overlay, section 3 stays static until ready.


## Home fixed release
- AI backend address set to `https://faysalbyte-ai-backend.vercel.app` in `index.html`, `_headers`, `.htaccess`, the nginx snippet and `tools/site.config.json`. The Gemini key is not in this package; it lives only in the backend's Vercel environment variables.
- Removed the second, identical `<section id="trainer">` block from `index.html` (duplicate id and duplicate content).
- `enhance.js` + `enhance.css` (loaded on home, contact, portfolio, skills, ai-info, entity-map, privacy, terms):
  - copy-link button at the top right of every section except the hero, with a toast; the AI sections (`#ai-voice-assistant-root`, `#aiChat`) copy the Bengali invitation text followed by the section URL.
  - skeleton shimmer for the AI section while the backend script loads, and a text fallback after 9 seconds.
  - install banner 3 seconds after load (Chromium/Android native prompt, instructions on iOS), dismissal remembered for 14 days.
  - service worker registration.
- `sw.js`: network-first for pages, stale-while-revalidate for same-origin files, never touches `/api/` or other origins.
- `site.webmanifest`: orange theme colour `#FF6B00`, shortcuts, categories.
- Icons and favicons regenerated as circular `#FF6B00` icons with the portrait (maskable and Apple touch icons are full-bleed squares, as the platforms require).
- Social images: one 1200x630 image per page (`social/md-faysal-hossain-og-home|portfolio|contact|skills.jpg`), wired into the page heads, `tools/site.config.json` (`ogImage`) and `tools/build.py`.
- Footer taglines: Dialectical (home), Portfolio: Übermensch, Phenomenology of Touch (contact), Praxis (skills).
- Added ids to sections that had none so every section has a stable deep link: portfolio (`vanilla`, `bootstrap`, `tailwind`, `javascript`, `gsap`), contact (`form`, `map`, `contact-info`), skills (`activities`).

## Contact page precision update
- **Submit button** rebuilt (`#submitButton` only): the old `.activate span` rule was turning the label into a white circle, so "Send Message" was invisible. New idle / hover / sending / sent / error states, light sweep, click ripple, spinner. Base colour kept at the exact `#5628ee` the page rendered before; success uses the theme green, error the theme red.
- **Dual glassmorphism clock cards** above the form card (Dhaka + visitor), day/night badge, floating + pulsing-ring animations (transform/opacity only, paused when off-screen or tab hidden). Visitor zone comes from `Intl` — no Geolocation API, no permission prompt, no network request.
- **Typing notice** under the cards (JS typewriter, layout height reserved, reduced-motion shows the full text instantly, no-JS fallback reveals it via CSS).
- **Backend** `api/contact.js` hardened: a missing `elapsed` field is now treated as a bot; links in the name field are rejected.
- The form card and everything inside it (except the button) is untouched; verified by comparing computed styles and geometry of all rendered elements.
- Set your real Vercel URL in `contact.html` (`data-endpoint`) and `tools/site.config.json` (`apiOrigin`), then run `python3 tools/build.py` so the CSP `connect-src` matches.
- Vercel env vars: `GMAIL_USER`, `GMAIL_APP_PASSWORD` (Google App Password), optional `CONTACT_TO_EMAIL`, `ALLOWED_ORIGINS`.

## Home page redesign (index.html, style.css, script.js)
- New full-viewport hero: the portrait is exactly 100vw x 100vh and stays pinned while the page slides over it (scroll curtain), with a pointer parallax on desktop.
- New scroll-driven "skills path" timeline built from the 12 real credentials (no placeholder photos or invented years): sticky stage headings, a spine that fills as you scroll, nodes that light up, a highlighted current card and certificate thumbnails that reveal on scroll.
- Answer-first About block with quick facts, a services list and an FAQ for search and answer engines; every image has real alt text and all icon links have accessible names.
- `<head>` (title, description, canonical, Open Graph, Twitter, JSON-LD, icons, preload) is byte-for-byte unchanged.
- Higher contrast: all text is at least 5:1 on its background, minimum text size 14px, visible focus rings, skip link, reduced-motion support, no-JS fallback.
- style.css keeps the shared navbar / mobile-menu rules unchanged because ai-info, entity-map, privacy, terms and thank-you still load it. Home styles are scoped to `body.home`.
- Dead rules from the old design (orbs, burn animation, old footer, unused spinner/form utilities) were removed; the Flaticon LinkedIn badge was replaced by the footer icon.


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
- Portfolio project modal responsive fix: on mobile screens, modal drawer is contained within the viewport (`100%` width, `100dvh` height with safe-area insets). `z-index` layering elevated to 2000 (modal overlay) and 2010 (close button) above fixed navbar (1000). Close button converted to sticky top-right so it stays permanently visible and clickable without scrolling off-screen. Robust background scroll-lock added to both `html` and `body` while maintaining smooth touch scrolling inside the modal.

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

## Section 3 rebuilt on Gemini + Web Speech
- Removed the avatar-video code (`<video>`, WebRTC client, `api/avatar.js`). Chat brain is now Gemini called from the browser; voice is the Web Speech API (male voice, Bengali and English).
- Visualizer: unchanged canvas/ember look; gold `#FFC107` while the visitor speaks. Auto-greeting as Faisal on scroll-in. Input/output sanitising, flood guard, CSP allows only the Gemini endpoints.
- Layout verified identical to the previous version at 5 viewport sizes.

## Section 3 moved to a private backend (AI voice assistant component)
- `index.html` now holds only `<section id="ai-voice-assistant-root">` and one `<script src="https://YOUR-AI-BACKEND.vercel.app/api/ai-voice-assistant/embed" defer>` tag. The markup, CSS, runtime, persona and Gemini calls are served by the `backend/` project (private repo, Vercel).
- Removed `css/ai-live-chat.css`, `js/ai-live-chat.js`, `snippets/section-3.html` and the old Gemini origins from every CSP (the browser no longer talks to Google).
- Set the backend address once with `python3 tools/set-ai-origin.py https://your-backend.vercel.app`.
- Reuse on another page: add `<div id="ai-voice-assistant-root"></div>` and the same `<script>` tag.
