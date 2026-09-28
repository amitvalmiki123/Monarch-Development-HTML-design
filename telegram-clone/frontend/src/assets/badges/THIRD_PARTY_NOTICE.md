# Base animation timing (motion reused, artwork is original)

The four Lottie files in this folder (`verified-badge.json`, `pink-magic.json`,
`flame.json`, `fairy-wings.json`) reuse **transform/opacity keyframe timing**
(pop-in bounce,
breathing scale/opacity pulses, orbiting spark particles) that originated in
two places, both fine to build on:

1. `verified-badge.json` started from the **`lottie-emojis`** npm package
   (https://www.npmjs.com/package/lottie-emojis,
   https://github.com/typeofNaN/lottie-emojis) by typeofNaN, MIT License —
   specifically its "Check mark button" (✅) animation. Its green colors were
   recolored to FairyChat blue. The checkmark shape and shine-sweep timing are
   otherwise unchanged from the upstream file.

2. `pink-magic.json`, `flame.json` and `fairy-wings.json` started from Lottie
   animation files the user supplied, which turned out to embed the actual
   **"Fairy Tail"** anime's copyrighted/trademarked guild-emblem artwork as a
   raster image layer. That exact artwork was **not used** — the image
   layers were removed entirely (along with their embedded base64 PNGs) and
   replaced with FairyChat's own original vector shapes (native Lottie
   star/ellipse primitives: a pink sparkle/twinkle mark, a layered
   red/orange/yellow flame mark, and a pair of fairy wings with a sparkle
   center — the latter designed to tie into FairyChat's own name/branding
   instead of any third-party franchise). Only the surrounding, generic parts
   were kept as-is: the "Magic Spark" particle layers (plain small colored
   circles orbiting the badge — not franchise-specific artwork, recolored per
   badge) and the pulse/glow keyframe timing on the main emblem and its
   soft-glow halo layer.

MIT License permits commercial use, modification and redistribution with no
attribution requirement, but this notice is kept for clarity/traceability.
