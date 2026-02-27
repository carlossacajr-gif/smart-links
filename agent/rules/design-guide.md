# Smart Links — Design Guide

> Read this file before every session. Single source of truth for UI/UX decisions.

## 1. The 5 Inviolable Principles

1. **User Intent** — Every element serves a goal. If it doesn't aid the next step, delete it.
2. **Traditional Flow** — Top-to-bottom, left-to-right. Nav at top/left. CTAs prominent.
3. **Progressive Disclosure** — "Load More" over infinite scroll. User must reach footer.
4. **Content-First** — Truncate strings (80 chars titles, 160 descs). Contrast overlays on noisy images.
5. **Functional Animation** — `active:scale-[0.97]` for clickability. No parallax, no scroll-jacking.

## 2. Palette — Saca Brand

| Token | Hex | Usage |
|---|---|---|
| `saca-red` | `#EB3333` | CTAs, accents, active states |
| `snow` | `#FAFAFA` | Background, panels |
| `zinc-900` | `#18181B` | Primary text |
| `steel` | `#71797E` | Secondary text, borders |

## 3. Typography

- **Body/UI:** Figtree 400–700
- **Data/Mono:** font-mono (system)
- **Headings:** Figtree 600–800, tracking-tight

## 4. Component Rules

- Cards: `bg-white border border-zinc-200 rounded-2xl shadow-sm hover:shadow-md`
- Primary btn: `bg-[#EB3333] text-white rounded-full active:scale-[0.97]`
- Secondary btn: `border border-zinc-200 text-zinc-700 rounded-full`
- Empty state: icon + message + CTA button
- Loading: skeleton shimmer, never spinners for lists
- Toasts: bottom-right, Sonner library

## 5. Anti-Patterns

- ❌ `dark:` classes (permanent Light Mode)
- ❌ Generic Hero/3-Col layouts without intent
- ❌ Infinite scroll
- ❌ Decorative animations
- ❌ Hardcoded API keys
- ❌ `any` TypeScript type
