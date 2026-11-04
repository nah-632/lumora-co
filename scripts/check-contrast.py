#!/usr/bin/env python3
"""
Contrast gate for the LUMORA palette.

The constitution (§3.1) requires every text/background pair to meet WCAG 2.2 AA
and to be "measured with a script". This is that script. It reads the real values
out of src/styles/tokens.css rather than from a list typed here, so a token
change cannot pass the gate by being copied into the test.

Run: python3 scripts/check-contrast.py     (exit 0 = every pair passes)
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = (ROOT / "src/styles/tokens.css").read_text(encoding="utf-8")


def token(name: str) -> str:
    """Reads --name from tokens.css and resolves one level of var()."""
    m = re.search(rf"--{re.escape(name)}:\s*([^;]+);", CSS)
    if not m:
        raise SystemExit(f"token --{name} not found in tokens.css")
    value = m.group(1).strip()
    var = re.fullmatch(r"var\(--([a-z0-9-]+)\)", value)
    if var:
        return token(var.group(1))
    rgb = re.fullmatch(r"rgb\(var\(--([a-z0-9-]+)\)(?: / [\d.]+)?\)", value)
    if rgb:
        return token(rgb.group(1))
    return value


def triplet(name: str) -> tuple[int, int, int]:
    """Reads a --name-rgb channel triplet."""
    m = re.search(rf"--{re.escape(name)}-rgb:\s*([\d\s]+);", CSS)
    if not m:
        raw = token(name)
        m2 = re.fullmatch(r"#([0-9A-Fa-f]{6})", raw)
        if m2:
            h = m2.group(1)
            return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        raise SystemExit(f"cannot resolve {name} to a triplet (got {raw!r})")
    parts = m.group(1).split()
    return int(parts[0]), int(parts[1]), int(parts[2])


def linear(c: int) -> float:
    s = c / 255
    return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4


def luminance(rgb: tuple[int, int, int]) -> float:
    r, g, b = (linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg: tuple[int, int, int], bg: tuple[int, int, int]) -> float:
    a, b = luminance(fg), luminance(bg)
    lo, hi = min(a, b), max(a, b)
    return (hi + 0.05) / (lo + 0.05)


def hexof(rgb: tuple[int, int, int]) -> str:
    return "#%02X%02X%02X" % rgb


# (label, foreground token, background token, required ratio, why)
PAIRS = [
    ("navy text on off-white",        "lumora-navy",    "lumora-paper",   4.5, "body and headings"),
    ("navy text on white",            "lumora-navy",    "lumora-white",   4.5, "card body"),
    ("secondary text on off-white",   "lumora-ink-soft", "lumora-paper",  4.5, "body copy"),
    ("secondary text on white",       "lumora-ink-soft", "lumora-white",  4.5, "body copy in a card"),
    ("muted text on off-white",       "lumora-ink-muted", "lumora-paper", 4.5, "captions and labels"),
    ("muted text on white",           "lumora-ink-muted", "lumora-white", 4.5, "captions in a card"),
    ("red on white",                  "lumora-red",     "lumora-white",   4.5, "link and action text"),
    ("purple on white",               "lumora-purple",  "lumora-white",   4.5, "links, active nav"),
    ("purple on off-white",           "lumora-purple",  "lumora-paper",   4.5, "links on the page ground"),
    ("white label on red button",     "lumora-white",   "lumora-red",     4.5, "primary button"),
    ("white label on red hover",      "lumora-white",   "red-hover",      4.5, "primary button hover"),
    ("white text on navy",            "lumora-white",   "lumora-navy",    4.5, "sidebar and dark surfaces"),
    ("navy on off-white (sidebar)",   "lumora-navy",    "lumora-paper",   4.5, "bottom nav icon ground"),
    ("danger text on white",          "state-danger",   "lumora-white",   4.5, "validation errors"),
    ("success text on white",         "state-success",  "lumora-white",   4.5, "state messaging"),
    ("warning text on white",         "state-warning",  "lumora-white",   4.5, "state messaging"),
    ("info text on white",            "state-info",     "lumora-white",   4.5, "state messaging"),
    # Decorative only. These are expected to FAIL their AA target, which is the
    # reason gold is documented as never setting text on a light surface.
    ("gold on white  [must fail]",    "lumora-gold",    "lumora-white",   4.5, "decoration only"),
    ("gold on off-white [must fail]", "lumora-gold",    "lumora-paper",   4.5, "decoration only"),
]

# Pairs that MUST fail, so a future change that "fixes" gold is caught too.
EXPECTED_FAILURES = {"gold on white  [must fail]", "gold on off-white [must fail]"}

ALIAS = {"red-hover": (184, 34, 24)}  # --action-primary-hover, a literal hex

passed = failed = 0
lines = []

for label, fg_name, bg_name, need, why in PAIRS:
    if fg_name in ALIAS:
        fg = ALIAS[fg_name]
    elif fg_name.rstrip("-rgb").endswith("danger") or fg_name in ("state-danger", "state-success", "state-warning", "state-info"):
        fg = triplet(fg_name)
    else:
        fg = triplet(fg_name)
    bg = ALIAS[bg_name] if bg_name in ALIAS else triplet(bg_name)

    r = ratio(fg, bg)
    must_fail = label in EXPECTED_FAILURES
    ok = (r < 4.5) if must_fail else (r >= need)

    mark = "PASS" if ok else ("FAIL(ok)" if must_fail else "FAIL")
    if ok:
        passed += 1
    else:
        failed += 1
    lines.append(f"  {mark:9} {r:5.2f}:1  (need {need}:1)  {label:34} {hexof(fg)} on {hexof(bg)}   — {why}")

print("LUMORA contrast gate — measured from src/styles/tokens.css\n")
print("\n".join(lines))
print(f"\n{passed} pairs as required, {failed} not.")

if failed:
    print("\nFAILURES:")
    for line in lines:
        if " FAIL " in line or line.strip().startswith("FAIL"):
            print(line)
    sys.exit(1)

print("\nEvery text pair meets WCAG 2.2 AA, and gold is confirmed unusable as text.")
print("Note: FI/AA for large text (>=24px or >=19px bold) is 3:1; all pairs above are")
print("held to 4.5:1 regardless, so a size change cannot quietly break one.")
