#!/usr/bin/env python3
"""
FairyChat Lottie emoji pack -> Telegram TGS converter.

Converts our 720-file Lottie (bodymovin) emoji pack into Telegram's
.tgs format (gzipped Lottie) for sticker / custom-emoji packs:

  - wraps the original composition into a precomp asset scaled 50%
    around its center into a 512x512 root canvas (Telegram requirement)
  - strips markers (metadata Telegram doesn't need)
  - trims duration to 3 seconds max (Telegram TGS limit)
  - gzips with max compression
  - reports files over Telegram's 64KB limit

Usage:
  python3 convert-to-tgs.py <lottie-json-dir> <output-dir>

Source pack: mobile-builds/animatemojis-lottie-pack.zip
"""
import json, gzip, os, sys, glob

def convert(path):
    d = json.load(open(path))
    fr = int(d.get('fr', 60) or 60)
    ip = int(d.get('ip', 0) or 0)
    op = int(d.get('op', 0) or 0)
    if op - ip > 3 * fr:          # Telegram TGS: max 3 seconds
        op = ip + 3 * fr
    orig_layers = d.get('layers', [])
    orig_assets = d.get('assets', []) or []
    if not orig_layers:
        return None
    # wrap original comp as a precomp asset, scaled 50% around center
    new_asset = {"id": "fc_root", "fr": fr, "ip": ip, "op": op,
                 "w": d.get('w', 1024), "h": d.get('h', 1024),
                 "layers": orig_layers}
    root_layer = {
        "ddd": 0, "ind": 1, "ty": 0, "nm": "fc_scale", "refId": "fc_root",
        "sr": 1,
        "ks": {
            "o": {"a": 0, "k": 100},
            "r": {"a": 0, "k": 0},
            "p": {"a": 0, "k": [256, 256, 0]},
            "a": {"a": 0, "k": [d.get('w', 1024) / 2, d.get('h', 1024) / 2, 0]},
            "s": {"a": 0, "k": [50, 50, 100]},
        },
        "ao": 0, "w": d.get('w', 1024), "h": d.get('h', 1024),
        "ip": ip, "op": op, "st": 0, "bm": 0,
    }
    out = {"v": "5.7.4", "fr": fr, "ip": ip, "op": op,
           "w": 512, "h": 512, "nm": "FairyChat", "ddd": 0,
           "assets": orig_assets + [new_asset], "layers": [root_layer]}
    return gzip.compress(json.dumps(out, separators=(',', ':')).encode(), 9)

def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    ok = big = 0
    sizes = []
    for f in sorted(glob.glob(os.path.join(src, '*.json'))):
        tgs = convert(f)
        if tgs is None:
            print("skip (no layers):", os.path.basename(f)); continue
        sizes.append(len(tgs))
        if len(tgs) > 64 * 1024:
            big += 1; print(f"OVER 64KB ({len(tgs)}): {os.path.basename(f)}")
        else:
            ok += 1
        open(os.path.join(dst, os.path.basename(f)[:-5] + '.tgs'), 'wb').write(tgs)
    print(f"converted: {len(sizes)} | ok: {ok} | over64KB: {big}")
    print(f"sizes min/avg/max: {min(sizes)}/{sum(sizes)//len(sizes)}/{max(sizes)} bytes")

if __name__ == '__main__':
    main()
