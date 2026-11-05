#!/usr/bin/env python3
"""Generate changelog.html and the version label in index.html from the vault Changelog note.

The vault note is the master (work log). The public page lists released versions only,
and only untagged bullets (additions that still exist). Tagged bullets ([amend], [fix],
[gone]) and ## Unreleased stay in the vault.

Usage: python3 tools/build-changelog.py [path-to-Changelog.md]
"""
import html
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent.parent
DEFAULT_NOTE = pathlib.Path.home() / "Vaults/2026-PkWr/40 Projects/Type Setting/Changelog.md"
HEAD = re.compile(r"^## (Unreleased|v\d+(?:\.\d+)*) ?(?:\((\d{4}-\d{2}-\d{2})\))?\s*$")
TAG = re.compile(r"^\[(amend|fix|gone)\]\s")


def parse(text):
    """Return [(version, date, [public bullets])] for released versions, newest first."""
    entries, cur = [], None
    for line in text.splitlines():
        m = HEAD.match(line)
        if m:
            cur = None if m.group(1) == "Unreleased" else (m.group(1), m.group(2), [])
            if cur:
                entries.append(cur)
        elif cur and line.startswith("- "):
            body = line[2:].strip()
            if not TAG.match(body):
                cur[2].append(body)
    if not entries:
        sys.exit("Changelog note: no release headings like '## v1.0 (2026-11-05)'")
    return [e for e in entries if e[2]]


def render(entries):
    out = []
    for version, date, bullets in entries:
        out.append("  <h2>%s, %s</h2>\n  <ul>" % (html.escape(version), html.escape(date or "")))
        out += ["    <li>%s</li>" % html.escape(b) for b in bullets]
        out.append("  </ul>\n")
    return "\n".join(out)


PAGE = """<!doctype html>
<!-- Generated from the vault note 'Changelog' by tools/build-changelog.py. Do not edit. -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Changelog</title>
<link rel="stylesheet" href="styles/main.css">
<link rel="stylesheet" href="styles/form-shell.css">
</head>
<body class="page">
<main class="about">
  <p><a href="./">← Type Setting</a></p>
  <h1>Changelog</h1>

%s</main>
</body>
</html>
"""


def main():
    note = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_NOTE
    entries = parse(note.read_text(encoding="utf-8"))
    (HERE / "changelog.html").write_text(PAGE % render(entries), encoding="utf-8")
    index = HERE / "index.html"
    text = index.read_text(encoding="utf-8")
    new, n = re.subn(r"(<!--version-->).*?(<!--/version-->)", r"\g<1>%s\g<2>" % entries[0][0], text)
    if n != 1:
        sys.exit("index.html: expected one <!--version-->...<!--/version--> marker")
    index.write_text(new, encoding="utf-8")
    print("changelog.html written; version", entries[0][0])


if __name__ == "__main__":
    main()
