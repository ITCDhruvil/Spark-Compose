# Ribbon reference

End-to-end catalog of every control in the editor's **top ribbon** (`editor-toolbar.tsx`).
Controls are listed in on-screen order, left to right. When the window is too narrow,
trailing segments collapse into a **More** menu (`editor-more-menu.tsx`) — same actions,
different layout.

- Source: `src/components/editor/core/toolbar/editor-toolbar.tsx`
- Segment order + overflow: `use-toolbar-overflow.ts` (`TOOLBAR_SEGMENT_ORDER`)
- Popover shell: `toolbar-popover.tsx`
- The **Spark AI** dropdown is documented separately in [ai-features/](./ai-features/README.md); its ribbon entry is summarized under [Spark AI](#3-spark-ai) below.

---

## Segment map

| # | Segment id | What it holds |
|---|-----------|---------------|
| 1 | `history` | Undo, Redo |
| 2 | `styles` | Heading/paragraph style, Font family, Font size |
| 3 | `ai` | Spark AI dropdown (hidden when AI is disabled) |
| 4 | `format` | Bold, Italic, Underline, Strikethrough, Subscript, Superscript, Inline code |
| 5 | `colors` | Text color, Highlight color |
| 6 | `clearFormat` | Clear formatting |
| 7 | `align` | Left / Center / Right / Justify |
| 8 | `lists` | Bulleted list, Numbered list, Checklist (each with a style menu) |
| 9 | `indent` | Increase indent, Decrease indent |
| 10 | `insert` | Table, Horizontal line, Link, Image |
| 11 | `blocks` | Blockquote, Code block |
| 12 | `toc` | Index / table-of-contents style |
| 13 | `shortcuts` | Keyboard shortcuts dialog |
| 14 | `findReplace` | Find & replace |
| 15 | `comment` | Add comment on selection |
| 16 | `embedVideo` | Embed video |
| 17 | `callout` | Callout block (info / warning / error / success) |
| 18 | `export` | Copy/Download HTML, Markdown, JSON |
| 19 | `print` | Print / PDF preview |
| 20 | `focusMode` | Toggle focus mode |
| 21 | `spellCheck` | Toggle browser spell check |

---

## 1. History

| Button | Action | Shortcut | Notes |
|--------|--------|----------|-------|
| Undo | `editor.undo()` | `Ctrl+Z` | Disabled when there is nothing to undo. |
| Redo | `editor.redo()` | `Ctrl+Y` / `Ctrl+Shift+Z` | Disabled when there is nothing to redo. |

---

## 2. Styles (paragraph, font, size)

Three dropdowns, always shown together.

### 2a. Heading / paragraph style

Dropdown button shows the current block style. Options come from `HEADING_STYLE_OPTIONS`
(`src/lib/editor/core/formatting/heading-style-options.ts`), split into two sections:

| Label | Maps to | Section |
|-------|---------|---------|
| Normal text | paragraph | — |
| Title | `heading` level 1 | Document |
| Subtitle | `heading` level 3 | Document |
| Heading 1 | `heading` level 1 | Outline |
| Heading 2 | `heading` level 2 | Outline |
| Heading 3 | `heading` level 3 | Outline |
| Heading 4 | `heading` level 4 | Outline |
| Heading 5 | `heading` level 5 | Outline |
| Heading 6 | `heading` level 6 | Outline |

- Each row renders a live style preview (`heading-style-preview.tsx`).
- Applying: `applyHeadingStyle()` runs `setParagraph()` or `setHeading({ level })`.
- Active label resolves top-down, so Title/Subtitle win over H1/H3 when both match.
- Keyboard: `Ctrl+Alt+1`–`6` set headings; `# ` … `###### ` at line start via markdown shortcuts.

### 2b. Font family

Dropdown of `FONT_FAMILIES` (`editor-constants.ts`). Each row previews in its own face.

`Default`, Arial, Calibri, Cambria, Comic Sans MS, Courier New, Garamond, Georgia,
Helvetica, Impact, Inter, Lucida Console, Palatino, Segoe UI, Tahoma, Times New Roman,
Trebuchet MS, Verdana.

- Apply: `setFontFamily(value)`. Choosing **Default** runs `unsetFontFamily()`.
- Stored as a `textStyle` mark (`fontFamily`), so it applies to the current selection / typing position.

### 2c. Font size

Dropdown button shows the current size number (defaults to `11` when unset).
Popover content is `FontSizePopover` (`font-size-popover.tsx`).

- Presets from `FONT_SIZES`: 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48 (pt).
- Custom value entry allowed. Validation (`font-size-utils.ts`): 1–400, **half-point steps only**
  (`11`, `11.5` — not `11.6`).
- Stored as `textStyle` `fontSize` in `pt`. `labelFromFontSizeAttr()` renders the button label.

---

## 3. Spark AI

Single ribbon button (`Spark AI ▾`, `ai-dropdown.tsx`). Hidden entirely when the host
disables AI (`aiEnabled={false}`) — the `ai` segment is filtered out of the order.

Opens a panel with:

- **Toggles** (persisted in `use-ai-store`): Autocomplete (+ Sentence/Para scope), Spelling
  (local auto-correct, no tokens), Grammar (underlines issues).
- **Feature catalog**: Improve, Find issues, To table, Action items, Against brief, Glossary,
  and collapsible groups Explain / Suggestions / Translate / Tone / Summarize / Analytics,
  plus Draft, Ask, and an Upcoming list.
- Each row has an info tooltip with *what it does* / *how to use it*.
- Shortcut: `Ctrl+Shift+A` toggles the panel.

Full detail: [docs/features/ai-features/](./ai-features/README.md).

---

## 4. Inline format marks

Toggle buttons; active state highlights when the mark is on at the cursor/selection.

| Button | Command | Shortcut |
|--------|---------|----------|
| Bold | `toggleBold()` | `Ctrl+B` |
| Italic | `toggleItalic()` | `Ctrl+I` |
| Underline | `toggleUnderline()` | `Ctrl+U` |
| Strikethrough | `toggleStrike()` | `Ctrl+Shift+X` |
| Subscript | `toggleSubscript()` | — |
| Superscript | `toggleSuperscript()` | — |
| Inline code | `toggleCode()` | `Ctrl+E` |

---

## 5. Colors

Two swatch buttons; each opens a `ColorPickerGrid` popover. The thin bar under the icon
shows the currently applied color.

### Text color

- Palette: `TEXT_COLORS` (25 swatches — greys, primaries, tints).
- Apply: `setColor(hex)`. Clear: `unsetColor()` ("Reset color").
- Stored as `textStyle` `color`.

### Highlight color

- Palette: `HIGHLIGHT_COLORS` (12 swatches).
- Apply: `toggleHighlight({ color })`. Clear: `unsetHighlight()` ("Remove highlight").
- Shortcut: `Ctrl+Shift+H` toggles highlight with the last color.

---

## 6. Clear formatting

Single button. Runs `unsetAllMarks().clearNodes()` — strips every inline mark and resets the
block to a plain paragraph. Shortcut: `Ctrl+\`.

---

## 7. Alignment

Dropdown; button icon reflects the current alignment. Options (`ALIGN_OPTIONS`):

| Option | Command |
|--------|---------|
| Left align | `setTextAlign('left')` |
| Center align | `setTextAlign('center')` |
| Right align | `setTextAlign('right')` |
| Justify | `setTextAlign('justify')` |

Applies to the current block (paragraph, heading, etc.). In the **More** menu these appear as
four flat menu items instead of a dropdown.

---

## 8. Lists

Three split-buttons in one group. Clicking the caret opens a style menu; the first menu item
applies the plain list, the rest set the marker style.

### 8a. Bulleted list

- Toggle: `convertToBulletList(editor)` (top item) / active state tracks `bulletList`.
- Marker styles (`BULLET_LIST_STYLES`) via `setBulletListStyle(value)`:
  Filled circle (`disc`), Circle (`circle`), Square (`square`), Kite (`◆`), Diamond (`◇`),
  Triangle (`▸`), Dash (`–`).
- Shortcuts: `Ctrl+Shift+8`, or `- ` / `* ` at line start.

### 8b. Numbered list

- Toggle: `convertToOrderedList(editor)` / active state tracks `orderedList`.
- Number styles (`ORDERED_LIST_STYLES`) via `setOrderedListStyle(value)`:
  Numbers (`decimal`), Lowercase abc (`lower-alpha`), Uppercase ABC (`upper-alpha`),
  Roman i, ii (`lower-roman`), Roman I, II (`upper-roman`), Greek (`lower-greek`).
- Nested ordered lists inherit the parent style and use hierarchical markers (1.1.1 / A.A.A).
  Consecutive top-level ordered lists are auto-merged so numbering stays continuous
  (`ListStyleExtension` in `lists/extensions/list-style.ts`).
- Shortcuts: `Ctrl+Shift+7`, or `1. ` at line start.

### 8c. Checklist

- Toggle: `toggleTaskList()` / active state tracks `taskList`.
- Shortcut: `[] ` at line start.

---

## 9. Indent

| Button | Action | Shortcut |
|--------|--------|----------|
| Increase indent | `sinkListItem(editor)` | `Tab` |
| Decrease indent | `liftListItem(editor)` | `Shift+Tab` |

Buttons disable when the operation is not possible (`canSinkListItem` / `canLiftListItem`).
Primarily nests/un-nests list items; also drives block indent where supported
(`lists/extensions/block-indent.ts`).

---

## 10. Insert

| Control | Action |
|---------|--------|
| Table | Opens `TableGridPicker` (hover-to-size grid). Selecting r×c runs `insertTable({ rows, cols, withHeaderRow: true })`. In **More** menu it inserts a fixed 3×3. Shortcut `Ctrl+Alt+T` inserts the last-used size. |
| Horizontal line | `setHorizontalRule()`. Markdown: `---`. |
| Link | Opens the **Insert link** dialog (`link-dialog.tsx`). Fields: URL (auto-prefixed `https://` if no scheme), optional display text. Editing an existing link shows **Remove link**. Shortcut `Ctrl+K`. |
| Image | Opens the **Insert image** dialog (`image-dialog.tsx`). See below. |

### Image dialog

- Source: paste a URL, or **Upload image** (file picker, `image/*`). Upload goes through the
  host `onUpload` handler (API `/api/uploads/image`); with no handler it falls back to a local
  `data:` URL. Live preview with an "Image ready" state.
- **Width**: `IMAGE_WIDTHS` presets — 25% / 50% / 75% / 100%.
- **Alignment**: Left / Center / Right.
- **Caption / alt text**: single field.
- Same dialog reopens in `edit` mode from the image toolbar (pre-filled).

### Image toolbar (appears when an image is selected)

Floating bubble menu (`image-menu.tsx`):

- Align left / center / right (`updateAttributes('image', { align })`).
- Zoom out / in — 10-point steps, 10%–100%, with a live `%` readout.
- Size presets 25 / 50 / 75 / 100 %.
- **AI Caption** / **AI Alt text** (only when AI enabled) — writes a `Figure N:` line or fills
  the `alt` attribute via `aiApi.imageCaption`. See [ai-features/image-caption.md](./ai-features/image-caption.md).
- Edit (reopens the dialog) · Delete.
- Resize handles on the image itself (`resizable-image.ts`).

---

## 11. Blocks

| Button | Command | Shortcut |
|--------|---------|----------|
| Quote | `toggleBlockquote()` | `> ` at line start |
| Code block | `toggleCodeBlock()` | ` ``` ` + space, or `Ctrl+Alt+C` where bound |

---

## 12. Index / table of contents

Single button (`ListTree` icon) → opens the **Index page style** modal
(`toc-template-modal.tsx`). Picking a template calls `applyTocTemplateToDocument(editor, id)`
and restyles every existing index block in the document.

Templates (`TOC_TEMPLATES`): Classic, Modern, Minimal, Formal, Dotted, Compact.
The TOC block itself and the sidebar outline are covered in
[smart-features/document-outline.md](./smart-features/document-outline.md).

---

## 13. Keyboard shortcuts

Single button → opens the shortcuts dialog (`keyboard-shortcuts-dialog.tsx`), which lists
`EDITOR_SHORTCUTS` from `editor-constants.ts`. Highlights:

| Keys | Action |
|------|--------|
| `Ctrl+B` / `Ctrl+I` / `Ctrl+U` | Bold / Italic / Underline |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+K` | Insert link |
| `Ctrl+F` | Find & replace |
| `Ctrl+Shift+P` | Command palette |
| `/` | Slash commands (e.g. `/table 3x3`) |
| `@` | Mention user |
| `+` | Insert block on empty line |
| `# ` … `###### ` | Heading 1–6 at line start |
| `- ` / `1. ` / `[] ` / `> ` | Bullet / numbered / checklist / quote at line start |
| `---` | Horizontal divider |
| `Tab` / `Shift+Tab` | Increase / decrease indent |
| `Ctrl+Shift+X` | Strikethrough |
| `Ctrl+E` | Inline code |
| `Ctrl+Alt+1–6` | Heading 1–6 |
| `Ctrl+Shift+H` | Highlight |
| `Ctrl+\` | Clear formatting |
| `Ctrl+Shift+↑ / ↓` | Move block up / down |
| `Ctrl+Shift+D` | Duplicate block |
| `Ctrl+Shift+Backspace` | Delete block |
| `Ctrl+Alt+T` | Insert table (last size) |
| `Ctrl+Shift+A` | Spark AI panel |

---

## 14. Find & replace

Single button → **Find & replace** dialog (`find-replace-dialog.tsx`). Shortcut `Ctrl+F`.

- Fields: **Find**, **Replace with**, **Match case** checkbox.
- **Find next** — selects the next match (`findInEditor`); shows "No matches found" otherwise.
- **Replace** — replaces the match at the current selection (`replaceInEditor`).
- **Replace all** — `replaceAllInEditor`; reports the count replaced.

---

## 15. Comment

Single button → **Comment on selection** dialog (`comment-dialog.tsx`). Requires a text
selection. Adds a comment mark (`comments/extensions/editor-comment.ts`); editing an existing
comment offers **Remove comment**. Author label shown when provided by the host.

---

## 16. Embed video

Single button → **Embed video** dialog (`embed-dialog.tsx`). Runs `setVideoEmbed(url)`
(`media/extensions/video-embed.ts`).

- Accepts **YouTube** (`youtube.com/watch`, `youtu.be`, `/embed/`) and **Vimeo** (`vimeo.com/<id>`).
- URL is normalized to an embed URL and rendered as an `<iframe>` player block (atom, draggable).
- Invalid URLs are rejected with "Enter a valid YouTube or Vimeo URL".

> There is also a combined **Insert media** picker (`media-dialog.tsx`) — Image vs. Video —
> used by the slash command / command palette entry points.

---

## 17. Callout

Dropdown labeled **Callout ▾**. Picking a type runs the host `onInsertCallout(type)` which
wraps the block via `setCallout` / `toggleCallout` (`callouts/extensions/callout.ts`).

Types: **Info**, **Warning**, **Error**, **Success** — rendered as
`div.callout.callout-<type>` with a colored left border.

---

## 18. Export

Dropdown (`Download ▾`). Uses `editor-export.ts`; a toast confirms copy actions.

| Item | Function | Result |
|------|----------|--------|
| Copy HTML | `exportHtml` | `editor.getHTML()` to clipboard |
| Copy Markdown | `exportMarkdown` | HTML → Markdown (Turndown, ATX headings, fenced code) to clipboard |
| Download Markdown | `downloadText(…, 'document.md')` | `.md` file |
| Download JSON | `exportJson` → `document.json` | pretty-printed ProseMirror JSON |
| Print / PDF | `printEditorContent` | *(More menu only)* — see below |

---

## 19. Print

Single button (`Printer` icon) → `printEditorContent(editor)`. Opens a new window with the
document HTML in a print stylesheet (serif body, bordered tables, styled callouts/quotes,
`@media print` rules) and triggers the browser print dialog — use "Save as PDF" there.

---

## 20. Focus mode

Toggle button (`Maximize2` / `Minimize2`). Calls the host `onToggleFocusMode`. Hides
surrounding chrome for distraction-free writing. See
[smart-features/focus-mode-and-navigation.md](./smart-features/focus-mode-and-navigation.md).

---

## 21. Spell check

Toggle button labeled `ABC`. Calls the host `onToggleSpellCheck`, which flips the native
browser `spellcheck` attribute on the editor surface. Independent of the AI **Spelling** and
**Grammar** toggles in the Spark AI panel.

---

## Overflow ("More") menu

When segments don't fit, `useToolbarOverflow` measures the ribbon and moves the trailing
segments into a **More ▾** menu (`editor-more-menu.tsx`). Behavior differences there:

- Alignment, lists, and list styles render as flat menu items (no nested dropdowns except
  Callout and Export, which keep a sub-popover).
- Table inserts a fixed **3×3**.
- Export sub-menu adds **Print / PDF** as an item.
- Early segments (history, styles, format, colors) collapse into a **More formatting** group
  with a reduced set (Undo/Redo, Normal text + H1–H3, Bold/Italic/Underline, Text color +
  Highlight).

---

## Related docs

- [smart-features/formatting-toolbar.md](./smart-features/formatting-toolbar.md) — short overview
- [smart-features/images-and-media.md](./smart-features/images-and-media.md)
- [smart-features/tables.md](./smart-features/tables.md)
- [smart-features/callouts-and-blocks.md](./smart-features/callouts-and-blocks.md)
- [smart-features/slash-commands.md](./smart-features/slash-commands.md) · [command-palette.md](./smart-features/command-palette.md)
- [ai-features/README.md](./ai-features/README.md) — Spark AI dropdown
</content>
</invoke>
