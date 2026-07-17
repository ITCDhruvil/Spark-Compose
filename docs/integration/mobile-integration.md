# Mobile integration guide

This guide is written for a developer integrating **Spark Compose** into a mobile app.

**Goal of this handoff:** ship the rich text editor with **smart features only** (slash commands, paste, tables, table→chart, local spelling, formatting). Do **not** wire up Spark AI / LLM features.

**Repo:** https://github.com/ITCDhruvil/Spark-Compose.git

---

## 1. What you are getting

Spark Compose is a construction-focused rich text editor:

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| UI | React + Tailwind CSS |
| Editor engine | TipTap 3 / ProseMirror |
| Charts | Recharts |

It is **not** a React Native library. TipTap runs in the browser. On mobile, the practical approach is:

1. Host / run this web app (or the editor page).
2. Load that URL (or local bundle) in a **WebView** inside the React Native / native app.
3. Mount the editor with `ai={false}` so no LLM UI or API calls appear.

A full native React Native rewrite of TipTap is a separate, large project. Start with WebView + smart features.

---

## 2. Clone and run locally

```bash
git clone https://github.com/ITCDhruvil/Spark-Compose.git
cd Spark-Compose
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You should see **Spark Compose** with the editor. On the home page there is a **Spark AI** checkbox in the header — uncheck it to preview the exact mobile / no-AI experience.

### Do you need an OpenAI key?

**No** — not for the smart-only build.

| Mode | `OPENAI_API_KEY` |
|------|------------------|
| Smart features only (`ai={false}`) | Not needed |
| Full Spark AI | Required — see [Environment variables](../getting-started/environment-variables.md) |

More setup detail: [Prerequisites](../getting-started/prerequisites.md) · [Installation](../getting-started/installation.md) · [Running locally](../getting-started/running-locally.md)

---

## 3. Disable AI (required for this handoff)

Mount the editor like this:

```tsx
import { RichEditor } from '@/components/editor/rich-editor'

export function MobileEditorScreen() {
  return (
    <RichEditor
      ai={false}
      content={initialContent}
      onChange={(json, html) => {
        // Persist document (JSON preferred for round-trip)
      }}
      minHeight="100%"
    />
  )
}
```

Equivalent object form:

```tsx
<RichEditor ai={{ enabled: false }} />
```

Default is `ai` **enabled** (demo app). For mobile, always pass `ai={false}`.

Handoff summary also lives at the repo root: [`EMBEDDING.md`](../../EMBEDDING.md).

### What stays available (`ai={false}`)

| Feature | Notes |
|---------|-------|
| Slash commands | `/heading`, `/table`, lists, callouts, media, etc. |
| Markdown & block shortcuts | Type `# `, `- `, `1. `, etc. |
| Smart paste | HTML / Markdown / CSV → structured content |
| Spark Chart | Table → chart (local math, **not** an LLM) |
| Local spelling | Typos + construction dictionary |
| Formatting toolbar | Bold, lists, colors, alignment, etc. |
| Selection format bar | Format selected text (no Spark AI panel) |
| Tables, images, charts, export | Full smart editor surface |

### What is removed (`ai={false}`)

| Feature | Notes |
|---------|-------|
| Spark AI toolbar button | Hidden |
| Ask / Draft / Draft coach | Panels and slash entries gone |
| Improve, summarize, translate, tone | Selection AI actions gone |
| Grammar AI & LLM autocomplete | Extensions not registered |
| AI image caption / alt | Buttons hidden on image menu |
| Slash: `/ask`, `/draft`, `/draft-coach` | Filtered out |
| Network calls to `/api/ai/*` | Not triggered from editor UI |

You can ignore or omit routes under `src/app/api/ai/` and never set `OPENAI_API_KEY`.

---

## 4. Where to find things in the code

### Must-know entry points

| What | Path |
|------|------|
| Main editor component | [`src/components/editor/rich-editor.tsx`](../../src/components/editor/rich-editor.tsx) |
| `ai` prop resolver | [`src/lib/editor/ai-capabilities.ts`](../../src/lib/editor/ai-capabilities.ts) |
| AI enabled React context | [`src/lib/editor/editor-ai-context.tsx`](../../src/lib/editor/editor-ai-context.tsx) |
| Demo page (with AI checkbox) | [`src/app/page.tsx`](../../src/app/page.tsx) |
| Slash command list | [`src/components/editor/slash-command-items.tsx`](../../src/components/editor/slash-command-items.tsx) |
| Table → chart | [`src/lib/editor/chart-from-table.ts`](../../src/lib/editor/chart-from-table.ts) + table menu |
| Smart paste | [`src/components/editor/smart-paste.ts`](../../src/components/editor/smart-paste.ts) |
| Local spell check | [`src/components/editor/extensions/ai-spellcheck.ts`](../../src/components/editor/extensions/ai-spellcheck.ts) |

### Folder map: keep vs skip for mobile (no AI)

| Path | Role for you |
|------|----------------|
| `src/components/editor/` | **Keep** — editor UI, extensions, toolbar, slash, paste |
| `src/lib/editor/` | **Keep** — smart utilities (paste, chart, preferences) |
| `src/components/editor/ai/` | **Skip** — Spark AI UI (still in repo; gated by `ai={false}`) |
| `src/app/api/ai/` | **Skip** — LLM API routes |
| `src/lib/api/ai-*.ts` | **Skip** — client wrappers for AI APIs |
| `src/lib/server/ai/` | **Skip** — prompts, OpenAI streaming, cost |
| `docs/` | Read — product + this integration guide |

You do **not** need to delete AI folders. The toggle is the supported way to ship smart-only. Deleting folders by hand breaks imports and is not recommended.

Full tree: [Project structure](../getting-started/project-structure.md)

---

## 5. Embedding in a mobile WebView

Typical flow:

```
Mobile app (React Native / native)
    └── WebView
            └── loads hosted Spark Compose page
                    └── <RichEditor ai={false} />
```

### Suggested steps

1. **Host the Next app** (staging URL, or local for development).
2. **Create a dedicated embed page** (optional but clean) that only renders:

   ```tsx
   <RichEditor ai={false} content={…} onChange={…} />
   ```

   without the demo header / cost dashboard link.
3. **Point the WebView** at that URL.
4. **Pass content in/out** via:
   - Query params / initial HTML (simple), or
   - `window.ReactNativeWebView.postMessage` / `injectedJavaScript` (recommended for save/load).

### Content format

`onChange` gives you:

- `json` — TipTap/ProseMirror JSON string (prefer this for storage and re-load)
- `html` — HTML snapshot (useful for preview / export)

Pass the same JSON string back as `content` when reopening a document.

### Checklist before release

- [ ] `ai={false}` is set in production embed code
- [ ] No `OPENAI_API_KEY` in the mobile / embed environment
- [ ] Slash menu has no Ask / Draft
- [ ] Spark AI toolbar button is absent
- [ ] `/heading`, `/table`, paste, and table→chart still work
- [ ] Document save/load via JSON works round-trip

---

## 6. Feature docs to read next

### Smart features (your scope)

- [Smart features index](../features/smart-features/README.md)
- [Slash commands](../features/smart-features/slash-commands.md)
- [Smart paste](../features/smart-features/smart-paste.md)
- [Spark Chart](../features/smart-features/spark-chart.md)
- [Tables](../features/smart-features/tables.md)
- [Formatting toolbar](../features/smart-features/formatting-toolbar.md)
- [Markdown shortcuts](../features/smart-features/markdown-shortcuts.md)

### Understanding the product split

- [Smart editor vs AI](../introduction/smart-vs-ai.md)
- [What is Spark Compose?](../introduction/what-is-spark-compose.md)

### AI features (out of scope for this handoff — ignore unless asked later)

- [AI features index](../features/ai-features/README.md)

### Toggle internals

- [The `ai` toggle](./ai-toggle.md)

---

## 7. Common questions

**Q: Can I convert this to fully native React Native?**  
A: Not as a drop-in. TipTap is web. WebView embedding is the supported path. A native port would mean rewriting the editor layer.

**Q: Can I delete `src/components/editor/ai/` to shrink the repo?**  
A: Not recommended. Imports and TipTap wiring still reference those modules when AI is on in the demo. Use `ai={false}`; optional later work is lazy-loading / package split for smaller bundles.

**Q: Why does Spark Chart say “Spark” if it is not AI?**  
A: Branding. Chart-from-table is deterministic (math on cells + Recharts). It stays on when AI is off.

**Q: Spelling is under Spark AI in the full UI — is that an LLM?**  
A: No. Local spelling stays available as a smart feature. Grammar check (AI) is disabled when `ai={false}`. See [Smart vs AI](../introduction/smart-vs-ai.md).

**Q: Something is broken after clone.**  
A: See [Troubleshooting](../getting-started/troubleshooting.md). Confirm you pulled latest `main` and ran `npm install`.

---

## Next step

→ [The `ai` toggle](./ai-toggle.md) · [Smart features](../features/smart-features/README.md)
