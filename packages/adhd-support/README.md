# ADHD Support — "One thing for your head"

A calm, low-pressure focus aid, extracted from **tu_casa** into a self-contained
React component you can drop into any tool. No design-system dependency, no
build step of its own — one component, one stylesheet.

What's inside the panel:

- **A rotating technique** — 2-minute rule, timebox, body doubling, movement
  break, "write one thing." Tap _Try another_ to cycle.
- **A working countdown timer** — for the timed techniques, with a conic-gradient
  progress ring, Start/Pause, and Reset.
- **A brain-dump offload** — type a thought, press Enter, let it go; remove items
  when they're handled.
- **A mood check** — "How's your head right now?" with selectable chips.

The tone is deliberately gentle. Keep it that way.

## Install

This lives as a folder you can copy into any project, or reference as a local
workspace package.

**Option A — copy the folder.** Drop `packages/adhd-support/src/` into your app
(e.g. `src/adhd/`) and import from there.

**Option B — local workspace package.** If you use npm/pnpm/yarn workspaces,
add this folder as a dependency:

```jsonc
// your app's package.json
"dependencies": {
  "@marcos/adhd-support": "workspace:*"   // or "file:../adhd-support"
}
```

Peer deps: `react` and `react-dom` (>=17). Nothing else.

## Use

```tsx
import { useState } from 'react'
import { AdhdPanel } from '@marcos/adhd-support'
import '@marcos/adhd-support/AdhdPanel.css' // once, anywhere in your app

export function Toolbar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>✦ ADHD</button>
      {open && <AdhdPanel onClose={() => setOpen(false)} />}
    </>
  )
}
```

That's the whole integration in every tool: a trigger button + `{open && <AdhdPanel …/>}`.

## Theming

The panel ships its own look, but every color and font is a CSS custom property
with a two-level fallback: **your host token first, a baked-in default second.**
So it blends into an existing design system automatically, and still looks right
with zero setup.

| Variable        | Falls back to host token | Then to default              |
| --------------- | ------------------------ | ---------------------------- |
| `--adhd-accent` | `--red`                  | `#6e1522` (wine)             |
| `--adhd-ink`    | `--bento`                | `#0a0a0a` (near-black)       |
| `--adhd-font`   | `--font`                 | Geist / system-ui stack      |
| `--adhd-mono`   | `--mono`                 | Geist Mono / ui-monospace    |

Override any of them on an ancestor to restyle the whole panel:

```css
.my-app {
  --adhd-accent: #2f6f4f; /* your brand action color */
}
```

## Props

All optional except `onClose`. Defaults reproduce the original tu_casa panel.

| Prop              | Type                          | Default                     | Notes                                        |
| ----------------- | ----------------------------- | --------------------------- | -------------------------------------------- |
| `onClose`         | `() => void`                  | —                           | Called on backdrop / close-button dismiss.   |
| `techniques`      | `Technique[]`                 | built-in set of 5           | Rotating focus techniques.                   |
| `moods`           | `[string, string][]`          | Fog…Avoiding                | `[id, label]` chips.                         |
| `initialMode`     | `string`                      | `'clear'`                   | Mood selected on open.                       |
| `initialOffload`  | `OffloadItem[]`               | one example item            | Seed brain-dump items.                       |
| `title`           | `string`                      | `'One thing for your head'` | Header label + dialog aria-label.            |
| `onMoodChange`    | `(mode: string) => void`      | —                           | Fires when the mood changes.                 |
| `onOffloadChange` | `(items: OffloadItem[]) => void` | —                        | Fires when the brain-dump list changes.      |

`Technique` is `{ type: 'timed' | 'physical' | 'write'; title: string; body: string; seconds?: number }`.
`seconds` is required for `type: 'timed'` (it drives the countdown).

### Persisting mood / offload

The panel is stateless across mounts by design. To remember state, feed it in and
save it back:

```tsx
<AdhdPanel
  onClose={() => setOpen(false)}
  initialMode={localStorage.getItem('adhd:mood') ?? 'clear'}
  onMoodChange={(m) => localStorage.setItem('adhd:mood', m)}
  onOffloadChange={(items) =>
    localStorage.setItem('adhd:offload', JSON.stringify(items))
  }
/>
```

## Provenance

Extracted verbatim (behavior-preserving) from `src/components/AdhdPanel.tsx` in
tu_casa, then made theme-portable and prop-driven so it can go into every tool.
