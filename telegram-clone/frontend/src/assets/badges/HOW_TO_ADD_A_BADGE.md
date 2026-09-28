# How to add a new Profile Badge to FairyChat Premium

A "Profile Badge" is the small icon shown next to a Premium member's name
everywhere (chat list, chat header, sender name, profile, Settings, and the
app's own name in the sidebar top bar). There are currently 5: Gold Star,
Verified, Magic Sparkle, Flame, Fairy Wings.

Two kinds of badge are supported:
- **Static** (like Gold Star): a plain inline SVG, no animation.
- **Animated** (Verified / Magic Sparkle / Flame / Fairy Wings): a real
  [Lottie](https://airbnb.io/lottie/) JSON animation, played by the
  `lottie-web` library that's already a dependency of this app.

You need to touch exactly **4 files** to add a new one. There is no 5th file
for the Settings picker UI — it's data-driven off `premiumData.js`, so it
updates automatically.

---

## Step 0 — get your artwork

**IMPORTANT: only use art you have the rights to.** Don't ask an AI (or a
person) to recreate another company's/franchise's actual logo or character —
"AI-made" does not remove a trademark/copyright problem if the output is a
copy of someone else's mark. Describe an ORIGINAL concept instead (a shape,
a colour, a vibe) — e.g. "a golden crown with a sparkle", not "the logo of
[brand]".

- **For an animated badge:** design it in a Lottie-capable tool and export a
  `.json` (Bodymovin format). Options: the free web editor at
  lottiefiles.com, Adobe After Effects + the Bodymovin plugin, Figma with a
  Lottie-export plugin, or Rive (export to Lottie). You can also hand-build a
  simple one out of basic shapes (star/circle) — see "Building a simple one
  from scratch" below, no design tool needed.
- **For a static badge:** just a plain SVG path is enough (see how `star` is
  done in `PremiumBadge.jsx` for the pattern to copy).

---

## Step 1 — drop the file in

```
telegram-clone/frontend/src/assets/badges/my-badge.json
```

(or `my-badge.svg` if you're doing a static one and prefer a separate file —
though inlining the path directly into the component, like `star` does, is
simpler for a static badge).

## Step 2 — register it in `premiumData.js`

File: `telegram-clone/frontend/src/data/premiumData.js`

Find `BADGE_STYLES` and add a line:

```js
export const BADGE_STYLES = [
  { id: 'star', label: 'Gold Star' },
  { id: 'verified', label: 'Verified' },
  { id: 'pink-magic', label: 'Magic Sparkle' },
  { id: 'flame', label: 'Flame' },
  { id: 'fairy-wings', label: 'Fairy Wings' },
  { id: 'my-badge', label: 'My Badge' }          // <-- add this
];
```

This is the ONLY thing that controls what shows up in the Settings ->
FairyChat Premium -> Profile Badge picker grid — nothing else to touch there.

## Step 3 — wire it up in `PremiumBadge.jsx`

File: `telegram-clone/frontend/src/components/common/PremiumBadge.jsx`

**If it's animated (Lottie),** add one line to the `LOTTIE_VARIANTS` map near
the top of the file:

```js
const LOTTIE_VARIANTS = {
  verified: { asset: () => import('../../assets/badges/verified-badge.json'), label: 'Verified' },
  'pink-magic': { asset: () => import('../../assets/badges/pink-magic.json'), label: 'Magic Sparkle' },
  flame: { asset: () => import('../../assets/badges/flame.json'), label: 'Flame' },
  'fairy-wings': { asset: () => import('../../assets/badges/fairy-wings.json'), label: 'Fairy Wings' },
  'my-badge': { asset: () => import('../../assets/badges/my-badge.json'), label: 'My Badge' }  // <-- add this
};
```

That's it for animated badges — the component already knows how to load and
loop any id listed here.

**If it's static (plain SVG),** add an `else if` branch in the main
`PremiumBadge()` function, next to the existing `star` fallback:

```jsx
if (variant === 'my-badge') {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={common} aria-label="My Badge" title="My Badge">
      <path fill="#your-color" d="...your svg path..." />
    </svg>
  );
}
```

## Step 4 — allow it server-side in `users.js`

File: `telegram-clone/backend/routes/users.js`, inside `router.put('/me', ...)`

Add your new id to the whitelist array:

```js
if (badgeStyle !== undefined && !['star', 'verified', 'pink-magic', 'flame', 'fairy-wings', 'my-badge'].includes(badgeStyle)) {
  return res.status(400).json({ error: 'Unknown badge style' });
}
```

This is required — without it the server rejects the value with 400 even if
the frontend can render it fine. (Non-`'star'` values are already gated
behind `is_premium` a few lines below this — no change needed there.)

## Step 5 — build & test

```bash
cd telegram-clone/frontend && npm run build
```

Then in the app: Settings -> FairyChat Premium -> Profile Badge -> your new
badge should already be in the grid, selectable if the account is Premium.

---

## Building a simple animated badge from scratch (no design tool)

All 4 animated badges in this app (`verified-badge.json`, `pink-magic.json`,
`flame.json`, `fairy-wings.json`) are built the same way: a small Python
script writes native Lottie shape primitives (`"sr"` = star, `"el"` =
ellipse — no hand-drawn bezier curves needed) inside a looping
scale/opacity-pulse animation, plus a ring of small orbiting "spark" circles.
That whole pattern (helper functions + the pulse/orbit timing) already
exists in git history in this session if you want to reuse it as a template
for a 6th, 7th, etc. badge — just ask and a new one can be generated the same
way in a couple of minutes for any original shape/colour idea.
