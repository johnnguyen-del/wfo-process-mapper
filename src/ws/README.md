# Wealthsimple DS v2 — Starter Pack

Everything needed to retheme your shadcn/Tailwind app to WS Mobile DS v2, **plus the full Playbook Studio mockup** as a reference for the patterns.

## What's inside

```
starter-pack/
├── colors_and_type.css   ← THE SYSTEM — WS color tokens (light+dark), type scale, @font-face
├── ws-shim.css           ← THE ADAPTER — maps shadcn vars → WS tokens + utility classes
├── fonts/                ← Wealthsimple Sans Display (Regular / Medium / Bold + obliques)
├── mockup/               ← THE PATTERNS — the full Playbook Studio mockup, copy what you need
│   ├── Playbook Studio.html
│   ├── studio.css        ← the hand-rolled selectors: cards, builder canvas, choices, step card…
│   ├── library.jsx
│   ├── runner.jsx
│   ├── builder.jsx
│   ├── icons.jsx
│   └── data.js
└── README.md
```

## The three layers

| File | What it is | When to use |
|---|---|---|
| `colors_and_type.css` | **System.** Real WS tokens, lifted from the DS v2 source. | Always — this is the source of truth. |
| `ws-shim.css` | **Adapter.** Renames WS tokens to shadcn's variable names (`--primary` → `--strong-bg` etc.) so existing shadcn components repaint automatically. | If you're keeping shadcn. |
| `mockup/studio.css` | **Patterns.** Hand-rolled selectors used in the Playbook Studio mockup — cards, step cards, choices, builder canvas, segmented control, banners. | Cherry-pick selectors when you want WS-specific component patterns shadcn doesn't cover. |

## Install (Vite + shadcn)

1. Copy this folder into `src/ws/` (or anywhere).
2. In `src/index.css`, **after** the shadcn imports:
   ```css
   @import "tailwindcss";
   @import "shadcn/tailwind.css";
   @import "./ws/colors_and_type.css";   /* tokens + @font-face */
   @import "./ws/ws-shim.css";           /* shadcn var → WS token mapping */
   ```
3. In `index.html`, switch dark-mode toggle to `[data-theme]`:
   ```html
   <html lang="en" data-theme="light">
   ```
   The shim supports both `.dark` and `[data-theme="dark"]`, so existing dark-mode logic still works.
4. Remove `@fontsource-variable/geist` — Wealthsimple Sans Display is now the default.

## What you get for free
- WS colors, type, dark mode, charts repaint everywhere shadcn vars are used
- `case` OpenType feature on globally
- Sky / Lilac / Aubergine / Lemon / Celery chart palette
- Destructive actions use WS terracotta

## What you'll want to hand-port from `mockup/studio.css`
Pull these selectors when you need them — they all use WS tokens, no invented colors:
- `.pcard` — playbook card (rounded 20px, hover lift, domain mark, stats footer)
- `.pcard--hero` — the dark inverted hero card pattern
- `.step-card` + `.choice` — the runner's question + A/B/C choice pattern
- `.canvas` + `.bnode` — the builder's dotted-grid canvas with branching nodes
- `.chip` — domain filter chip with count
- `.tag` — status badge (positive / warning / negative / highlight)
- `.banner` — inline informational bar
- `.seg` — segmented control
- `.runs` / `.run` — recent-activity rail

`mockup/icons.jsx` has a stroke-based icon set (24×24, currentColor) you can lift wholesale.

## Desktop tuning

WS DS v2 was designed for ~390px phones. The shim's "Desktop tuning" block exposes utilities:
- `.text-page-title-desktop` — 32/38 instead of 40/48 for non-hero h1s
- `.text-body-dense` — 14/20 for tables, settings rows
- `.btn-sm-desktop`, `.btn-md-desktop` — tighter button paddings
- `[data-density="compact"]` — slightly smaller radii on cards

Comment them out if you want strict mobile fidelity.

## House rules (don't break these)

- **Sentence case everywhere.** No UPPERCASE + tracked letter-spacing except for date dividers in transaction lists.
- **Proportional figures by default.** Never set `font-variant-numeric: tabular-nums` globally. Use `.ws-tnum` only when digits literally need to align in a spreadsheet column.
- **No invented colors.** If you need a new color, it lives somewhere in `colors_and_type.css`. The semantic priority tokens (`--positive-*`, `--warning-*`, `--negative-*`, `--highlight-*`, `--neutral-*`) cover most intent.
- **Logos: square with our radius scale, never circular.** WS uses rounded squares for brand marks.

## Caveats

- **Fonts are proprietary.** Wealthsimple Sans Display is a licensed typeface. Don't commit the `.otf` files to a public repo — keep this fork private, or substitute with a similar humanist sans (Söhne, Inter, Geist) for public use.
- **The mockup's components aren't canonical WS components.** They use WS tokens correctly but the specific layouts (playbook card, builder canvas, step card) are "in the spirit of" the system, not lifted from the real app.
- **WS DS v2 is mobile.** Some patterns (40px hero numerals, 20px card radii, generous spacing) won't feel native on dense desktop screens. Use the desktop-tuning utilities or override per-component.

## Tip for using this with Claude in your repo

Point your AI assistant at `colors_and_type.css` and `mockup/studio.css` and tell it: "follow the patterns in studio.css using the tokens from colors_and_type.css; never invent colors or font sizes outside this system." That + the rules above keeps it on-system.
