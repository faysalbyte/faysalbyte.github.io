# AI voice assistant (Section 3) - frontend side

This repository contains no code, key or prompt for the assistant. The page only declares where it goes and loads it from the private backend.

## Placeholder and loader

```html
<section id="ai-voice-assistant-root" class="theme-dark"></section>
<script src="https://YOUR-AI-BACKEND.vercel.app/api/ai-voice-assistant/embed" defer></script>
```

- On the homepage the placeholder is a `<section>` because the stacked-section script in `script.js` and `home.css` only stacks `<section>` elements.
- On any other page (for example the contact page) a plain `<div id="ai-voice-assistant-root"></div>` plus the same `<script>` tag is enough.
- Images stay on this site: `assets/my-avatar.webp` and `assets/demos/**`. The demo base folder can be changed with `data-demo-base="assets/demos/"` on the placeholder.

## Setting the backend address

```
python3 tools/set-ai-origin.py https://your-backend.vercel.app
```

This updates `index.html`, `_headers`, `.htaccess`, the nginx headers snippet and `tools/site.config.json` (script, style and connect sources of the Content-Security-Policy).
