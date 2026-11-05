#!/usr/bin/env python3
"""Cache-busting: put a fresh ?v= stamp on the local script and stylesheet links.
Run before committing a change to any file in src/ or styles/:  python3 tools/stamp.py
"""
import pathlib, re, time

stamp = time.strftime("%Y%m%d%H%M")
root = pathlib.Path(__file__).resolve().parent.parent
pattern = re.compile(r'((?:src|href)="(?:src|styles)/[^"?]+\.(?:js|css))(?:\?v=\d+)?"')
for name in ("index.html", "grep.html"):
    p = root / name
    text = p.read_text()
    new = pattern.sub(lambda m: m.group(1) + "?v=" + stamp + '"', text)
    if new != text:
        p.write_text(new)
        print("stamped", name, stamp)
