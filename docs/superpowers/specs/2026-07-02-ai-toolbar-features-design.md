# AI toolbar features — design

## Goal

Add all AI features from `D:\Text_Editor` (Lexical-based) into `D:\rich-editor` (Tiptap-based, currently AI-free), exposed through a single new **AI dropdown** in the editor toolbar — not a separate side panel. Construction draft (brief → full article generation) is the flagship feature and gets the most complete treatment.

## Backend

Reuses `D:\Text_Editor\services\api` unchanged (Python, SSE streaming). Not started by rich-editor's tooling — user runs it separately, same as they already do for Text_Editor. Rich-editor's client reads the base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000` matching Text_Editor's dev default — confirm exact default port when wiring the client by checking Text_Editor's `.env.example`).

## Toolbar entry point

New segment in `editor-toolbar.tsx`, placed **right after the styles group** (heading/font/size dropdowns) and before the format group (bold/italic/underline/…). A button — sparkle icon + "AI" label + chevron — opens a `ToolbarPopover` (reusing the existing popover component/pattern already used for heading/font/size/align/lists/callout/export).

## Dropdown contents (7 rows)

1. **Autocomplete** — toggle row only (switch control). No modal. Turning on arms live ghost-text completion as the user types.
2. **Improve doc** — toggle row (enables/disables) with an inline "Run improve" button that appears in the same row once enabled. No modal.
3. **Summarize** — hover reveals a side submenu (not a modal): scope selector (selection/doc), length selector (short/medium/detailed), "Generate" button, result text area with copy-to-clipboard.
4. **Outline** — hover side submenu: "Suggest headings" button, list of suggestions each with an "Insert" action that places the heading at the cursor.
5. **Translate** — click opens a modal: target-language picker (grouped list, same options as Text_Editor), "Translate" button, streams and replaces the current selection.
6. **Custom tone** — click opens a modal: free-text instruction textarea (200 char cap), "Apply to selection" button, streams and replaces selection.
7. **Construction draft** — click opens the largest modal, ported closely from Text_Editor's `AiSidePanel.tsx` construction tab: content type, audience, topic, angle, must-include, collapsible reference-materials section (notes textarea + PDF/DOCX upload + RAG "Index references" action), optional site-photo upload with placement-hint field or "let AI decide" checkbox, length selector, "Generate draft" action, preview/apply/discard flow, warnings list. This is the flagship feature — most polish, most testing attention.

## Architecture

**New files under `D:\rich-editor\src\components\editor\ai\`:**
- `ai-dropdown.tsx` — toolbar button + popover shell listing all 7 rows
- `ai-toggle-row.tsx` — reusable toggle-row component (used by Autocomplete, Improve doc)
- `ai-submenu-summarize.tsx`, `ai-submenu-outline.tsx` — hover side-submenus
- `ai-modal-translate.tsx`, `ai-modal-tone.tsx`, `ai-modal-construction.tsx` — click-to-open modals (reuse `components/ui/dialog.tsx` already in rich-editor)
- `use-ai-store.ts` — zustand store, ported/trimmed from Text_Editor's `lib/store/ai.ts` + `aiPanel.ts` + relevant slices of `settings.ts` (only state actually used by the dropdown, not the full side-panel state)

**New API client:**
- `src/lib/api/ai-client.ts` — ported from Text_Editor's `lib/api/client.ts`: `aiApi` (complete/rewrite/summarize/translate/customTone/outline/constructionDraft), `ragApi` (ingest), `uploadsApi` (image). Same endpoints, same SSE event contract (`{type: 'token'|'done'|'error', delta?, ...}`). No backend changes.

**Autocomplete (ghost text):**
- New Tiptap extension `src/components/editor/extensions/ai-autocomplete.ts` — a ProseMirror plugin using `Decoration.widget` to render the ghost suggestion (not a real node — pure decoration, so it's never part of document content or persisted). Ported logic from Text_Editor's `AiAutocompletePlugin.tsx`: 400ms debounce, 3-char minimum before-context, Tab or → to accept (inserts real text replacing the decoration), Esc to dismiss, streamed token-by-token via `aiApi.complete()`, decoration cleared on cursor move / selection change / doc edit outside the ghost.

**Rewrite-based features (Translate, Custom tone):**
- Both call `aiApi.rewrite()` directly from their modal component (no Lexical-style command bus needed — Tiptap exposes the editor instance directly). Streamed tokens accumulate in local component state; "Translate"/"Apply" is a two-step: preview then accept (accept runs `editor.chain().focus().insertContentAt(selectionRange, text).run()`), matching Text_Editor's accept/reject/re-roll intent but simplified to accept/reject since the flow lives in a modal rather than an overlay.

**Direct-call features (Improve doc, Summarize, Outline):**
- Each is a thin async function in its own component calling the matching `aiApi.*` method and applying the result via `editor.commands`/`editor.chain()`. No custom Tiptap commands or event bus required.

**Construction draft:**
- Ported UI from `AiSidePanel.tsx`'s construction tab (state, validation, RAG ingest call, image upload/base64-encode, generate call) into `ai-modal-construction.tsx`.
- Backend returns Lexical-shaped JSON (`lexicalJson`). Since the Python backend stays untouched, write a small pure-function converter `src/lib/editor/lexical-to-tiptap.ts` that maps the Lexical node tree (paragraph/heading/list/listitem/text-with-format-bits/etc.) to Tiptap/ProseMirror JSON, used when applying the generated draft at the cursor. Cover the node types Text_Editor's construction-draft output actually produces (check its markdown-to-Lexical formatter in `services/api/app` for the exact node type list before finalizing the converter's mapping table).

## Non-goals

- No separate always-visible AI side panel (Text_Editor's `AiSidePanel` layout is not carried over — everything is toolbar-dropdown-driven per this design).
- No changes to `services/api` (Python backend) unless the Lexical-JSON converter proves insufficient during implementation, in which case flag it rather than silently changing the contract.
- Mentions (`@user`) stay removed, as already decided when rich-editor was scaffolded — no AI feature depends on them.

## Testing

- Manual verification against a running `services/api` instance for each of the 7 features once wired.
- Construction draft gets extra manual passes: with reference notes only, with PDF upload, with photo, with "let AI decide", and the resulting content applied to the doc renders correctly as real Tiptap nodes (not raw JSON, not broken formatting).
