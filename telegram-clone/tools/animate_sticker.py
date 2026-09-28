#!/usr/bin/env python3
"""
Turns a static transparent-background sticker PNG into a real, looping
frame-by-frame animated WEBP — classic "squash & stretch + bounce" cartoon
animation (the same core principle Telegram's own animated sticker artists
use), applied programmatically so every FairyChat sticker actually moves
frame-to-frame instead of relying on a CSS transform on a static image.

Usage: animate_sticker.py <in.png> <out.webp> [style]
styles: bounce (default), wobble, pulse
"""
import sys
from PIL import Image
import math

def make_frame(base, canvas_size, t, style):
    """t in [0,1) — one full loop. Returns an RGBA frame of canvas_size."""
    w, h = base.size
    cw, ch = canvas_size
    angle = 0.0
    sx, sy = 1.0, 1.0
    ty = 0.0

    if style == 'bounce':
        # Bounce cycle: rises, squashes on landing, settles — classic 2-bounce loop.
        phase = t * 2 * math.pi
        bounce = abs(math.sin(phase))  # 0..1..0
        ty = -bounce * (ch * 0.10)
        # Squash near the bottom of the bounce (t close to 0/0.5/1)
        squash = 1.0 - 0.14 * (1 - bounce) * (1 - bounce)
        sy = squash
        sx = 1.0 + (1.0 - squash) * 0.9
        angle = math.sin(phase * 0.5) * 5  # gentle sway

    elif style == 'wobble':
        phase = t * 2 * math.pi
        angle = math.sin(phase) * 9
        sx = 1.0 + math.sin(phase * 2) * 0.05
        sy = 1.0 - math.sin(phase * 2) * 0.05
        ty = math.cos(phase) * (ch * 0.02)

    elif style == 'pulse':
        phase = t * 2 * math.pi
        pulse = (math.sin(phase) + 1) / 2  # 0..1
        sx = sy = 1.0 + pulse * 0.08
        ty = -pulse * (ch * 0.03)

    new_w = max(1, int(w * sx))
    new_h = max(1, int(h * sy))
    resized = base.resize((new_w, new_h), Image.LANCZOS)
    rotated = resized.rotate(angle, resample=Image.BICUBIC, expand=True)

    canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    px = (cw - rotated.width) // 2
    py = (ch - rotated.height) // 2 + int(ty)
    canvas.alpha_composite(rotated, (px, py))
    return canvas

def main():
    src, dst = sys.argv[1], sys.argv[2]
    style = sys.argv[3] if len(sys.argv) > 3 else 'bounce'
    base = Image.open(src).convert('RGBA')
    # Stickers only ever render small in a chat bubble/picker grid — working
    # at full 512px source resolution just bloats the animated file for no
    # visible gain, so downscale before animating.
    target = 320
    if max(base.size) > target:
        ratio = target / max(base.size)
        base = base.resize((max(1, int(base.width * ratio)), max(1, int(base.height * ratio))), Image.LANCZOS)
    # Leave headroom around the character so squash/stretch/rotate never clips.
    pad = 1.35
    canvas_size = (int(base.width * pad), int(base.height * pad))

    n_frames = 18
    duration_ms = 55  # ~18 frames * 55ms = ~1s per loop
    frames = []
    for i in range(n_frames):
        t = i / n_frames
        frames.append(make_frame(base, canvas_size, t, style))

    frames[0].save(
        dst, save_all=True, append_images=frames[1:], duration=duration_ms,
        loop=0, disposal=2, format='WEBP', quality=78, method=6
    )
    print(f"{src} -> {dst} ({style}, {n_frames} frames)")

if __name__ == '__main__':
    main()
