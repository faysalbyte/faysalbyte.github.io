#!/usr/bin/env python3
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLACEHOLDER = "https://YOUR-AI-BACKEND.vercel.app"
FILES = [
    "index.html",
    "_headers",
    ".htaccess",
    "server-config/nginx/security-headers.conf",
    "tools/site.config.json",
]
PATTERN = re.compile(r"^https://[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d+)?$", re.I)


def current_origin():
    text = (ROOT / "tools" / "site.config.json").read_text(encoding="utf8")
    match = re.search(r'"aiOrigin":\s*"([^"]+)"', text)
    return match.group(1) if match else PLACEHOLDER


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 tools/set-ai-origin.py https://your-backend.vercel.app")
        return 1
    new = sys.argv[1].strip().rstrip("/")
    if not PATTERN.match(new):
        print("The origin must look like https://your-backend.vercel.app (https, no path).")
        return 1
    old = current_origin()
    total = 0
    for name in FILES:
        path = ROOT / name
        if not path.exists():
            continue
        text = path.read_text(encoding="utf8")
        count = text.count(old)
        if count:
            path.write_text(text.replace(old, new), encoding="utf8")
            total += count
            print(f"{name}: {count} replacement(s)")
    print(f"Done. {total} replacement(s) in total: {old} -> {new}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
