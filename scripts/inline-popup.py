#!/usr/bin/env python3
"""
Inline kolorado-artist-popup.js into both custom element files.
Replaces the async script-tag loader with the full popup code,
eliminating the race condition where KoloradoArtistPopup is
undefined when the user first clicks an artist.
"""
import re, os

ROOT = "/home/ubuntu/kolorado-timetable/wix-custom-element"

popup_path = os.path.join(ROOT, "kolorado-artist-popup.js")
with open(popup_path) as f:
    popup_code = f.read().strip()

# Strip the comment header (lines starting with //) from the popup
lines = popup_code.split("\n")
first_code_line = next(i for i, l in enumerate(lines) if not l.startswith("//") and l.strip())
popup_body = "\n".join(lines[first_code_line:])

LOADER_PATTERN = re.compile(
    r"  // \u2500\u2500 Shared popup module loader.*?  \}\)\(\);",
    re.DOTALL
)

INLINE_BLOCK = """  // ── Shared popup module (inlined to avoid async loading race) ──
  if (typeof window.KoloradoArtistPopup === "undefined") {
""" + "\n".join("  " + l for l in popup_body.split("\n")) + """
  }"""

for fname in ["kolorado-timetable.js", "kolorado-lineup.js"]:
    path = os.path.join(ROOT, fname)
    with open(path) as f:
        content = f.read()

    if LOADER_PATTERN.search(content):
        new_content = LOADER_PATTERN.sub(INLINE_BLOCK, content, count=1)
        with open(path, "w") as f:
            f.write(new_content)
        print(f"Inlined popup into {fname}")
    else:
        print(f"WARNING: loader pattern not found in {fname} — checking manually")
        # Fallback: look for the POPUP_SCRIPT_URL block
        alt = re.compile(
            r"  var POPUP_SCRIPT_URL.*?  \}\)\(\);",
            re.DOTALL
        )
        if alt.search(content):
            new_content = alt.sub(INLINE_BLOCK, content, count=1)
            with open(path, "w") as f:
                f.write(new_content)
            print(f"  (used fallback pattern) Inlined popup into {fname}")
        else:
            print(f"  ERROR: could not find loader in {fname}")

print("Done.")
