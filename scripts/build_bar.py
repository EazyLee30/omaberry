#!/usr/bin/env python3
"""Repack the OmaBerry .bar with a new icon and a better font.

The .bar is not built from source -- it is sw7ft's published Berry Browser
repacked, with its launcher already patched to export QNX_FONT_DIR (so
`native/fonts/` is honoured) and `native/home.html` replaced with the
redirect to http://127.0.0.1:9820/. The desktop itself is served by the
Node server out of /accounts/1000/shared/misc/omaberry, so pushing the web/
directory over SSH is enough to ship code changes; this script exists for the
two things that *do* live in the .bar:

  native/icon.png, native/pin-icon.png   what the home screen shows
  native/fonts/*.otf                      the one font the whole browser uses

Both matter more than they look. The QNX port has no per-character font
fallback, so the browser renders every script from that single file --
which is why berrybrowser-cjk has to fold Emoji into the CJK font rather than
ship a second one.

Everything else is copied through byte for byte, including content_shell.exe.
The manifest is regenerated because BB10 verifies SHA-512 per asset.

Usage:
    python3 scripts/build_bar.py --font ../berry-cjk/fonts/NotoSansSC-Emoji.ttf \
                                 --icon web/assets/icon.png
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import os
import re
import shutil
import sys
import zipfile

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.join(HERE, "out", "OmaBerry-1.0-build1.bar")


def bump_version(text: str, version: str) -> str:
    text = re.sub(r"^Package-Version: .*$", f"Package-Version: {version}", text, flags=re.M)
    text = re.sub(r"^Application-Version: .*$", f"Application-Version: {version}", text, flags=re.M)
    # Package-Version-Id is a base64 tag over "1.0.1 " and must change too,
    # or BB10 sees the same version and treats the install as a no-op.
    padded = (version + " ").ljust(20, " ")
    vid = base64.b64encode(padded.encode()).decode()
    text = re.sub(r"^Package-Version-Id: .*$", f"Package-Version-Id: {vid}", text, flags=re.M)
    text = re.sub(r"^Application-Version-Id: .*$", f"Application-Version-Id: {vid}", text, flags=re.M)
    return text


def rebuild_manifest(manifest: str, assets: dict[str, bytes], font_rename: dict[str, str]) -> str:
    """Point every asset entry at the bytes we actually ship.

    Two things have to move together. The digest of each asset has to be
    recomputed, and the font's entry has to be *renamed* -- leaving
    native/fonts/NotoSansSC-Regular.otf listed while the archive holds
    NotoSansSC-Emoji.ttf makes the installer fail on a missing asset.
    """
    out = []
    current = None
    for line in manifest.splitlines():
        if line.startswith("Archive-Asset-Name: "):
            current = line.split(": ", 1)[1].strip()
            renamed = font_rename.get(current)
            out.append(f"Archive-Asset-Name: {renamed}" if renamed else line)
            # The digest has to be looked up under the *new* name, since the
            # old entry no longer names anything in the archive.
            current = renamed or current
        elif line.startswith("Archive-Asset-SHA-512-Digest: ") and current in assets:
            digest = base64.b64encode(hashlib.sha512(assets[current]).digest()).decode()
            out.append(f"Archive-Asset-SHA-512-Digest: {digest}")
        else:
            out.append(line)
    return "\n".join(out) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--font", required=True, help="the single font to ship")
    ap.add_argument("--icon", default=os.path.join(HERE, "web", "assets", "icon.png"))
    ap.add_argument("--version", default="1.0.2")
    ap.add_argument("--build", type=int, default=2)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    if not os.path.exists(args.src):
        print(f"source .bar missing: {args.src}", file=sys.stderr)
        return 1
    for path in (args.font, args.icon):
        if not os.path.exists(path):
            print(f"missing input: {path}", file=sys.stderr)
            return 1

    src = zipfile.ZipFile(args.src)
    names = src.namelist()

    font_name = os.path.basename(args.font)
    # Exactly one font may ship: with fontconfig stubbed out, index 0 wins and
    # every other script falls back to a box.
    drop = [n for n in names
            if n.lower().startswith("native/fonts/") and n.lower().endswith((".otf", ".ttf", ".ttc", ".otc"))]
    if not drop:
        print("no existing font in the source .bar -- is it really the patched one?", file=sys.stderr)
        return 1

    replace = {
        "native/icon.png": open(args.icon, "rb").read(),
        "native/pin-icon.png": open(args.icon, "rb").read(),
        f"native/fonts/{font_name}": open(args.font, "rb").read(),
    }

    blobs = {}
    for name in names:
        if name in drop or name.endswith("/"):
            continue
        blobs[name] = src.read(name)

    # The directory entry is what makes the installer create native/fonts/.
    blobs["native/fonts/"] = b""
    blobs.update(replace)

    # Every payload change has to be in place *before* the manifest is hashed.
    descriptor = blobs["native/bar-descriptor-v3.xml"].decode()
    descriptor = re.sub(r"<buildId>\d+</buildId>", f"<buildId>{args.build}</buildId>", descriptor)
    blobs["native/bar-descriptor-v3.xml"] = descriptor.encode()

    font_rename = {old: f"native/fonts/{font_name}" for old in drop}
    manifest = bump_version(
        rebuild_manifest(src.read("META-INF/MANIFEST.MF").decode(), blobs, font_rename),
        args.version,
    )
    blobs["META-INF/MANIFEST.MF"] = manifest.encode()

    out = args.out or os.path.join(HERE, "out", f"OmaBerry-{args.version}-build{args.build}.bar")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for name, data in blobs.items():
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o755 << 16 if name.endswith("/") else 0o644 << 16
            z.writestr(info, data)

    print(f"dropped: {', '.join(drop)}")
    print(f"icon:   {args.icon} ({os.path.getsize(args.icon)} bytes)")
    print(f"font:   {args.font} ({os.path.getsize(args.font)} bytes)")
    print(f"version: {args.version} (buildId {args.build})")
    print(f"wrote:  {out} ({os.path.getsize(out)} bytes)")

    # Read the manifest back and prove the digests describe the files we shipped.
    z = zipfile.ZipFile(out)
    mf = z.read("META-INF/MANIFEST.MF").decode()
    assets = dict(re.findall(r"Archive-Asset-Name: (\S+)\nArchive-Asset-SHA-512-Digest: (\S+)", mf))
    bad = []
    for name, want in assets.items():
        if name not in z.namelist():
            bad.append(f"{name}: listed but absent")
            continue
        got = base64.b64encode(hashlib.sha512(z.read(name)).digest()).decode()
        if got != want:
            bad.append(f"{name}: digest mismatch")
    fonts = [n for n in z.namelist() if n.lower().endswith((".otf", ".ttf"))]
    print(f"assets: {len(assets)} checked, {len(bad)} bad")
    for b in bad:
        print(f"  FAIL {b}")
    print(f"fonts shipped: {fonts}")
    engine = z.read("native/content_shell.exe")
    print(f"content_shell.exe: {len(engine)} bytes")
    return 1 if bad or len(fonts) != 1 else 0


if __name__ == "__main__":
    sys.exit(main())