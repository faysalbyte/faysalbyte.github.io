#!/usr/bin/env python3
"""Builds assets/demos/manifest.json from the folders next to it.

A static site cannot list a directory in the browser, so the AI voice assistant component reads this manifest
to learn which screenshots exist in each category folder.

Usage (from the project root):   python tools/make-demo-manifest.py
Re-run it whenever you add, remove or rename a demo image.
Folder names are the categories: general/, ecommerce/, portfolio/ (add more folders + keywords in the backend component runtime if needed).
Alt text is generated from the file name: "shop-checkout-page.webp" -> "Shop checkout page".
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "assets" / "demos"
EXT = {".webp", ".avif", ".png", ".jpg", ".jpeg", ".svg"}
manifest = {}
for folder in sorted(p for p in ROOT.iterdir() if p.is_dir()):
    files = sorted((f for f in folder.iterdir() if f.suffix.lower() in EXT), key=lambda f: f.name.lower())
    manifest[folder.name] = [
        {"file": f.name, "alt": re.sub(r"[-_]+", " ", f.stem).strip().capitalize()} for f in files
    ]
out = ROOT / "manifest.json"
out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print("wrote", out.relative_to(ROOT.parent.parent), {k: len(v) for k, v in manifest.items()})
