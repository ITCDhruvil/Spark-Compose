#!/usr/bin/env python3
"""Move editor files into feature-named folders and remap imports."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"

# old path (relative to src/) -> new path (relative to src/)
MOVES: dict[str, str] = {
    # ── core / components ──
    "components/editor/core/editor-toolbar.tsx": "components/editor/core/toolbar/editor-toolbar.tsx",
    "components/editor/core/editor-more-menu.tsx": "components/editor/core/toolbar/editor-more-menu.tsx",
    "components/editor/core/use-toolbar-overflow.ts": "components/editor/core/toolbar/use-toolbar-overflow.ts",
    "components/editor/core/use-toolbar-popovers.ts": "components/editor/core/toolbar/use-toolbar-popovers.ts",
    "components/editor/core/toolbar-popover.tsx": "components/editor/core/toolbar/toolbar-popover.tsx",
    "components/editor/core/editor-constants.ts": "components/editor/core/toolbar/editor-constants.ts",
    "components/editor/core/editor-export.ts": "components/editor/core/toolbar/editor-export.ts",
    "components/editor/core/font-size-popover.tsx": "components/editor/core/formatting/font-size-popover.tsx",
    "components/editor/core/heading-style-preview.tsx": "components/editor/core/formatting/heading-style-preview.tsx",
    "components/editor/core/color-picker-grid.tsx": "components/editor/core/formatting/color-picker-grid.tsx",
    "components/editor/core/list-style-preview.tsx": "components/editor/core/formatting/list-style-preview.tsx",
    "components/editor/core/editor-list-utils.ts": "components/editor/core/formatting/editor-list-utils.ts",
    "components/editor/core/extensions/font-size.ts": "components/editor/core/formatting/extensions/font-size.ts",
    "components/editor/core/extensions/heading-id.ts": "components/editor/core/formatting/extensions/heading-id.ts",
    "components/editor/core/link-dialog.tsx": "components/editor/core/links/link-dialog.tsx",
    "components/editor/core/image-dialog.tsx": "components/editor/core/images/image-dialog.tsx",
    "components/editor/core/image-menu.tsx": "components/editor/core/images/image-menu.tsx",
    "components/editor/core/editor-image-upload.ts": "components/editor/core/images/editor-image-upload.ts",
    "components/editor/core/extensions/resizable-image.ts": "components/editor/core/images/extensions/resizable-image.ts",
    "components/editor/core/media-dialog.tsx": "components/editor/core/media/media-dialog.tsx",
    "components/editor/core/embed-dialog.tsx": "components/editor/core/media/embed-dialog.tsx",
    "components/editor/core/extensions/video-embed.ts": "components/editor/core/media/extensions/video-embed.ts",
    "components/editor/core/extensions/callout.ts": "components/editor/core/callouts/extensions/callout.ts",
    "components/editor/core/comment-dialog.tsx": "components/editor/core/comments/comment-dialog.tsx",
    "components/editor/core/extensions/editor-comment.ts": "components/editor/core/comments/extensions/editor-comment.ts",
    "components/editor/core/find-replace-dialog.tsx": "components/editor/core/find-replace/find-replace-dialog.tsx",
    "components/editor/core/editor-find-replace.ts": "components/editor/core/find-replace/editor-find-replace.ts",
    "components/editor/core/extensions/list-style.ts": "components/editor/core/lists/extensions/list-style.ts",
    "components/editor/core/extensions/block-indent.ts": "components/editor/core/lists/extensions/block-indent.ts",
    "components/editor/core/editor-drag-handle.tsx": "components/editor/core/drag-handle/editor-drag-handle.tsx",
    "components/editor/core/empty-line-hint.tsx": "components/editor/core/drag-handle/empty-line-hint.tsx",
    "components/editor/core/autosave-indicator.tsx": "components/editor/core/drag-handle/autosave-indicator.tsx",
    "components/editor/core/use-editor-dialogs.tsx": "components/editor/core/dialogs/use-editor-dialogs.tsx",
    "components/editor/core/keyboard-shortcuts-dialog.tsx": "components/editor/core/shortcuts/keyboard-shortcuts-dialog.tsx",
    # ── smart / components ──
    "components/editor/smart/slash-command-items.tsx": "components/editor/smart/slash-commands/slash-command-items.tsx",
    "components/editor/smart/slash-command-list.tsx": "components/editor/smart/slash-commands/slash-command-list.tsx",
    "components/editor/smart/slash-commands.tsx": "components/editor/smart/slash-commands/slash-commands.tsx",
    "components/editor/smart/command-palette.tsx": "components/editor/smart/slash-commands/command-palette.tsx",
    "components/editor/smart/smart-paste.ts": "components/editor/smart/smart-paste/smart-paste.ts",
    "components/editor/smart/smart-paste.test.ts": "components/editor/smart/smart-paste/smart-paste.test.ts",
    "components/editor/smart/extensions/markdown-shortcuts.ts": "components/editor/smart/markdown-shortcuts/extensions/markdown-shortcuts.ts",
    "components/editor/smart/extensions/block-shortcuts.ts": "components/editor/smart/markdown-shortcuts/extensions/block-shortcuts.ts",
    "components/editor/smart/table-menu.tsx": "components/editor/smart/tables/table-menu.tsx",
    "components/editor/smart/table-grid-picker.tsx": "components/editor/smart/tables/table-grid-picker.tsx",
    "components/editor/smart/chart-block-toolbar.tsx": "components/editor/smart/spark-chart/chart-block-toolbar.tsx",
    "components/editor/smart/extensions/chart-block.ts": "components/editor/smart/spark-chart/extensions/chart-block.ts",
    "components/editor/smart/extensions/chart-block-view.tsx": "components/editor/smart/spark-chart/extensions/chart-block-view.tsx",
    "components/editor/smart/extensions/kpi-row.ts": "components/editor/smart/spark-chart/extensions/kpi-row.ts",
    "components/editor/smart/extensions/kpi-row-view.tsx": "components/editor/smart/spark-chart/extensions/kpi-row-view.tsx",
    "components/editor/smart/charts/editor-chart.tsx": "components/editor/smart/spark-chart/charts/editor-chart.tsx",
    "components/editor/smart/charts/editor-chart-theme.ts": "components/editor/smart/spark-chart/charts/editor-chart-theme.ts",
    "components/editor/smart/toc-sidebar.tsx": "components/editor/smart/document-outline/toc-sidebar.tsx",
    "components/editor/smart/toc-template-modal.tsx": "components/editor/smart/document-outline/toc-template-modal.tsx",
    "components/editor/smart/toc-insert-popover.tsx": "components/editor/smart/document-outline/toc-insert-popover.tsx",
    "components/editor/smart/extensions/toc-block.ts": "components/editor/smart/document-outline/extensions/toc-block.ts",
    "components/editor/smart/extensions/ai-spellcheck.ts": "components/editor/smart/spell-check/extensions/ai-spellcheck.ts",
    "components/editor/smart/selection-format-bar.tsx": "components/editor/smart/selection-format/selection-format-bar.tsx",
    # ── ai / components ──
    "components/editor/ai/ai-dropdown.tsx": "components/editor/ai/toolbar/ai-dropdown.tsx",
    "components/editor/ai/ai-dropdown.test.tsx": "components/editor/ai/toolbar/ai-dropdown.test.tsx",
    "components/editor/ai/ai-toggle-row.tsx": "components/editor/ai/toolbar/ai-toggle-row.tsx",
    "components/editor/ai/ai-toggle-row.test.tsx": "components/editor/ai/toolbar/ai-toggle-row.test.tsx",
    "components/editor/ai/selection-ai-toggles.tsx": "components/editor/ai/toolbar/selection-ai-toggles.tsx",
    "components/editor/ai/ai-selection-menu.tsx": "components/editor/ai/selection/ai-selection-menu.tsx",
    "components/editor/ai/ai-in-editor-action-bar.tsx": "components/editor/ai/selection/ai-in-editor-action-bar.tsx",
    "components/editor/ai/use-in-editor-rewrite.ts": "components/editor/ai/selection/use-in-editor-rewrite.ts",
    "components/editor/ai/use-improve-selection.ts": "components/editor/ai/selection/use-improve-selection.ts",
    "components/editor/ai/use-improve-doc.ts": "components/editor/ai/selection/use-improve-doc.ts",
    "components/editor/ai/use-improve-doc.test.ts": "components/editor/ai/selection/use-improve-doc.test.ts",
    "components/editor/ai/use-summarize-flow.ts": "components/editor/ai/selection/use-summarize-flow.ts",
    "components/editor/ai/use-suggest-block.ts": "components/editor/ai/selection/use-suggest-block.ts",
    "components/editor/ai/use-suggest-heading.ts": "components/editor/ai/selection/use-suggest-heading.ts",
    "components/editor/ai/ai-submenu-tone.tsx": "components/editor/ai/selection/ai-submenu-tone.tsx",
    "components/editor/ai/ai-submenu-tone.test.tsx": "components/editor/ai/selection/ai-submenu-tone.test.tsx",
    "components/editor/ai/ai-submenu-translate.tsx": "components/editor/ai/selection/ai-submenu-translate.tsx",
    "components/editor/ai/ai-submenu-translate.test.tsx": "components/editor/ai/selection/ai-submenu-translate.test.tsx",
    "components/editor/ai/ai-submenu-summarize.tsx": "components/editor/ai/selection/ai-submenu-summarize.tsx",
    "components/editor/ai/ai-submenu-summarize.test.tsx": "components/editor/ai/selection/ai-submenu-summarize.test.tsx",
    "components/editor/ai/ai-submenu-suggest-heading.tsx": "components/editor/ai/selection/ai-submenu-suggest-heading.tsx",
    "components/editor/ai/ai-submenu-suggest-heading.test.tsx": "components/editor/ai/selection/ai-submenu-suggest-heading.test.tsx",
    "components/editor/ai/ai-ask-flow-card.tsx": "components/editor/ai/ask/ai-ask-flow-card.tsx",
    "components/editor/ai/ai-construction-ask-card.tsx": "components/editor/ai/ask/ai-construction-ask-card.tsx",
    "components/editor/ai/ai-inline-ask.tsx": "components/editor/ai/ask/ai-inline-ask.tsx",
    "components/editor/ai/extensions/ask-blocks.ts": "components/editor/ai/ask/extensions/ask-blocks.ts",
    "components/editor/ai/extensions/ask-prompt-view.tsx": "components/editor/ai/ask/extensions/ask-prompt-view.tsx",
    "components/editor/ai/extensions/ask-answer-view.tsx": "components/editor/ai/ask/extensions/ask-answer-view.tsx",
    "components/editor/ai/extensions/ask-ghost-hint.ts": "components/editor/ai/ask/extensions/ask-ghost-hint.ts",
    "components/editor/ai/ai-conversational-draft-card.tsx": "components/editor/ai/draft/ai-conversational-draft-card.tsx",
    "components/editor/ai/ai-draft-enhance-panel.tsx": "components/editor/ai/draft/ai-draft-enhance-panel.tsx",
    "components/editor/ai/ai-guided-draft-panel.tsx": "components/editor/ai/draft/ai-guided-draft-panel.tsx",
    "components/editor/ai/ai-draft-anything-card.tsx": "components/editor/ai/draft/ai-draft-anything-card.tsx",
    "components/editor/ai/ai-draft-anything-card.test.tsx": "components/editor/ai/draft/ai-draft-anything-card.test.tsx",
    "components/editor/ai/ai-modal-construction.tsx": "components/editor/ai/draft/ai-modal-construction.tsx",
    "components/editor/ai/extensions/ai-autocomplete.ts": "components/editor/ai/autocomplete/extensions/ai-autocomplete.ts",
    "components/editor/ai/extensions/ai-autocomplete.test.ts": "components/editor/ai/autocomplete/extensions/ai-autocomplete.test.ts",
    "components/editor/ai/extensions/ai-grammar-check.tsx": "components/editor/ai/grammar-check/extensions/ai-grammar-check.tsx",
    "components/editor/ai/extensions/ai-issues-block.ts": "components/editor/ai/find-issues/extensions/ai-issues-block.ts",
    "components/editor/ai/extensions/ai-issues-view.tsx": "components/editor/ai/find-issues/extensions/ai-issues-view.tsx",
    "components/editor/ai/use-find-issues-panel.ts": "components/editor/ai/find-issues/use-find-issues-panel.ts",
    "components/editor/ai/use-analytics-tools.ts": "components/editor/ai/analytics/use-analytics-tools.ts",
    "components/editor/ai/analytics-features.ts": "components/editor/ai/analytics/analytics-features.ts",
    "components/editor/ai/extensions/ai-loading-mark.ts": "components/editor/ai/shared/extensions/ai-loading-mark.ts",
    "components/editor/ai/use-ai-below-replace.ts": "components/editor/ai/shared/use-ai-below-replace.ts",
    "components/editor/ai/use-ai-tools.ts": "components/editor/ai/shared/use-ai-tools.ts",
    "components/editor/ai/upcoming-features.ts": "components/editor/ai/shared/upcoming-features.ts",
    "components/editor/ai/ai-picker-card.tsx": "components/editor/ai/shared/ai-picker-card.tsx",
    # ── lib / core ──
    "lib/editor/core/editor-preferences.ts": "lib/editor/core/preferences/editor-preferences.ts",
    "lib/editor/core/editor-preferences.test.ts": "lib/editor/core/preferences/editor-preferences.test.ts",
    "lib/editor/core/font-size-utils.ts": "lib/editor/core/formatting/font-size-utils.ts",
    "lib/editor/core/font-size-utils.test.ts": "lib/editor/core/formatting/font-size-utils.test.ts",
    "lib/editor/core/heading-context.ts": "lib/editor/core/formatting/heading-context.ts",
    "lib/editor/core/heading-context.test.ts": "lib/editor/core/formatting/heading-context.test.ts",
    "lib/editor/core/heading-style-options.ts": "lib/editor/core/formatting/heading-style-options.ts",
    "lib/editor/core/selection-transforms.ts": "lib/editor/core/formatting/selection-transforms.ts",
    "lib/editor/core/block-utils.ts": "lib/editor/core/formatting/block-utils.ts",
    "lib/editor/core/image-meta.ts": "lib/editor/core/images/image-meta.ts",
    "lib/editor/core/media-events.ts": "lib/editor/core/media/media-events.ts",
    # ── lib / smart ──
    "lib/editor/smart/slash-command-parser.ts": "lib/editor/smart/slash-commands/slash-command-parser.ts",
    "lib/editor/smart/slash-command-parser.test.ts": "lib/editor/smart/slash-commands/slash-command-parser.test.ts",
    "lib/editor/smart/slash-suggestions.ts": "lib/editor/smart/slash-commands/slash-suggestions.ts",
    "lib/editor/smart/command-shortcuts.ts": "lib/editor/smart/slash-commands/command-shortcuts.ts",
    "lib/editor/smart/paste-line-classifier.ts": "lib/editor/smart/smart-paste/paste-line-classifier.ts",
    "lib/editor/smart/paste-line-classifier.test.ts": "lib/editor/smart/smart-paste/paste-line-classifier.test.ts",
    "lib/editor/smart/paste-structure.ts": "lib/editor/smart/smart-paste/paste-structure.ts",
    "lib/editor/smart/paste-structure.test.ts": "lib/editor/smart/smart-paste/paste-structure.test.ts",
    "lib/editor/smart/chart-from-table.ts": "lib/editor/smart/spark-chart/chart-from-table.ts",
    "lib/editor/smart/chart-from-table.test.ts": "lib/editor/smart/spark-chart/chart-from-table.test.ts",
    "lib/editor/smart/table-data.ts": "lib/editor/smart/spark-chart/table-data.ts",
    "lib/editor/smart/toc-templates.ts": "lib/editor/smart/document-outline/toc-templates.ts",
    "lib/editor/smart/toc-utils.ts": "lib/editor/smart/document-outline/toc-utils.ts",
    "lib/editor/smart/spell-dictionary.ts": "lib/editor/smart/spell-check/spell-dictionary.ts",
    "lib/editor/smart/common-typos.ts": "lib/editor/smart/spell-check/common-typos.ts",
    "lib/editor/smart/construction-terms.ts": "lib/editor/smart/spell-check/construction-terms.ts",
    # ── lib / ai ──
    "lib/editor/ai/ai-capabilities.ts": "lib/editor/ai/plugin/ai-capabilities.ts",
    "lib/editor/ai/ai-capabilities.test.ts": "lib/editor/ai/plugin/ai-capabilities.test.ts",
    "lib/editor/ai/editor-ai-context.tsx": "lib/editor/ai/plugin/editor-ai-context.tsx",
    "lib/editor/ai/stream-ask-answer.ts": "lib/editor/ai/ask/stream-ask-answer.ts",
    "lib/editor/ai/ask-bot-events.ts": "lib/editor/ai/ask/ask-bot-events.ts",
    "lib/editor/ai/lexical-to-tiptap.ts": "lib/editor/ai/ask/lexical-to-tiptap.ts",
    "lib/editor/ai/lexical-to-tiptap.test.ts": "lib/editor/ai/ask/lexical-to-tiptap.test.ts",
    "lib/editor/ai/insert-markdown.ts": "lib/editor/ai/ask/insert-markdown.ts",
    "lib/editor/ai/draft-anything-events.ts": "lib/editor/ai/draft/draft-anything-events.ts",
    "lib/editor/ai/draft-anything-fixtures.ts": "lib/editor/ai/draft/draft-anything-fixtures.ts",
    "lib/editor/ai/draft-enhance-insert.ts": "lib/editor/ai/draft/draft-enhance-insert.ts",
    "lib/editor/ai/draft-enhance-insert.test.ts": "lib/editor/ai/draft/draft-enhance-insert.test.ts",
    "lib/editor/ai/draft-playbooks.ts": "lib/editor/ai/draft/draft-playbooks.ts",
    "lib/editor/ai/draft-playbooks.test.ts": "lib/editor/ai/draft/draft-playbooks.test.ts",
    "lib/editor/ai/guided-draft-dom.ts": "lib/editor/ai/draft/guided-draft-dom.ts",
    "lib/editor/ai/guided-draft-events.ts": "lib/editor/ai/draft/guided-draft-events.ts",
    "lib/editor/ai/construction-draft-fixtures.ts": "lib/editor/ai/draft/construction-draft-fixtures.ts",
    "lib/editor/ai/tone-options.ts": "lib/editor/ai/writing-tools/tone-options.ts",
    "lib/editor/ai/translate-languages.ts": "lib/editor/ai/writing-tools/translate-languages.ts",
    "lib/editor/ai/language-hellos.ts": "lib/editor/ai/writing-tools/language-hellos.ts",
    "lib/editor/ai/quick-translate-languages.ts": "lib/editor/ai/writing-tools/quick-translate-languages.ts",
    "lib/editor/ai/ai-loading-text.ts": "lib/editor/ai/shared/ai-loading-text.ts",
}


def git_mv(old: Path, new: Path) -> None:
    new.parent.mkdir(parents=True, exist_ok=True)
    if not old.exists():
        if new.exists():
            return
        raise FileNotFoundError(old)
    subprocess.run(["git", "mv", str(old), str(new)], cwd=ROOT, check=True)


def run_moves() -> None:
    for old_rel, new_rel in MOVES.items():
        git_mv(SRC / old_rel.replace("/", "\\") if False else SRC / old_rel, SRC / new_rel)


def alias_pairs() -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for old_rel, new_rel in MOVES.items():
        for old_r, new_r in (
            (old_rel, new_rel),
            (old_rel.removesuffix(".tsx"), new_rel.removesuffix(".tsx")),
            (old_rel.removesuffix(".ts"), new_rel.removesuffix(".ts")),
        ):
            old_alias = "@/" + old_r.replace("\\", "/")
            new_alias = "@/" + new_r.replace("\\", "/")
            if old_alias != new_alias:
                pairs.append((old_alias, new_alias))
    # dedupe, longest first
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for old, new in sorted(pairs, key=lambda p: len(p[0]), reverse=True):
        if old in seen:
            continue
        seen.add(old)
        unique.append((old, new))
    return unique


def relative_editor_pairs() -> list[tuple[str, str]]:
    """./core/foo style imports from components/editor root and siblings."""
    pairs: list[tuple[str, str]] = []
    for old_rel, new_rel in MOVES.items():
        if not old_rel.startswith("components/editor/"):
            continue
        short_old = old_rel.removeprefix("components/editor/")
        short_new = new_rel.removeprefix("components/editor/")
        for o, n in (
            (short_old, short_new),
            (short_old.removesuffix(".tsx"), short_new.removesuffix(".tsx")),
            (short_old.removesuffix(".ts"), short_new.removesuffix(".ts")),
        ):
            pairs.append((f"./{o}", f"./{n}"))
    return pairs


# Cross-feature relative imports after deep nesting (longest first).
EXTRA_RELATIVE_PAIRS: list[tuple[str, str]] = [
    # core/toolbar → other features
    ("../ai/ai-dropdown", "../../ai/toolbar/ai-dropdown"),
    ("./extensions/callout", "../callouts/extensions/callout"),
    ("./extensions/list-style", "../lists/extensions/list-style"),
    ("./editor-list-utils", "../formatting/editor-list-utils"),
    ("./list-style-preview", "../formatting/list-style-preview"),
    ("./color-picker-grid", "../formatting/color-picker-grid"),
    ("./heading-style-preview", "../formatting/heading-style-preview"),
    ("./font-size-popover", "../formatting/font-size-popover"),
    # core/formatting
    ("./extensions/block-indent", "../lists/extensions/block-indent"),
    ("./editor-constants", "../toolbar/editor-constants"),
    # core/drag-handle
    ("./extensions/list-style", "../lists/extensions/list-style"),
    ("./editor-list-utils", "../formatting/editor-list-utils"),
    # core/dialogs
    ("./link-dialog", "../links/link-dialog"),
    ("./image-dialog", "../images/image-dialog"),
    ("./keyboard-shortcuts-dialog", "../shortcuts/keyboard-shortcuts-dialog"),
    ("./find-replace-dialog", "../find-replace/find-replace-dialog"),
    ("./embed-dialog", "../media/embed-dialog"),
    ("./comment-dialog", "../comments/comment-dialog"),
    ("./media-dialog", "../media/media-dialog"),
    ("./editor-image-upload", "../images/editor-image-upload"),
    ("./extensions/resizable-image", "../images/extensions/resizable-image"),
    ("./extensions/callout", "../callouts/extensions/callout"),
    # core/images, shortcuts
    ("./editor-constants", "../toolbar/editor-constants"),
    # smart/tables → ai/analytics
    ("../ai/analytics-features", "../../ai/analytics/analytics-features"),
    ("../ai/use-analytics-tools", "../../ai/analytics/use-analytics-tools"),
    # smart/spark-chart
    ("../ai/analytics-features", "../../ai/analytics/analytics-features"),
    # ai/toolbar
    ("../core/toolbar-popover", "../../core/toolbar/toolbar-popover"),
    ("./use-suggest-block", "../selection/use-suggest-block"),
    ("./upcoming-features", "../shared/upcoming-features"),
    ("./analytics-features", "../analytics/analytics-features"),
    # ai/selection
    ("../core/toolbar-popover", "../../core/toolbar/toolbar-popover"),
    ("./selection-ai-toggles", "../toolbar/selection-ai-toggles"),
    ("./use-ai-tools", "../shared/use-ai-tools"),
    ("./use-find-issues-panel", "../find-issues/use-find-issues-panel"),
    ("./upcoming-features", "../shared/upcoming-features"),
    ("./use-analytics-tools", "../analytics/use-analytics-tools"),
    ("./analytics-features", "../analytics/analytics-features"),
    ("./use-ai-below-replace", "../shared/use-ai-below-replace"),
    # ai/analytics
    ("./upcoming-features", "../shared/upcoming-features"),
]


def all_remap_pairs() -> list[tuple[str, str]]:
    pairs = alias_pairs() + relative_editor_pairs() + EXTRA_RELATIVE_PAIRS
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for old, new in sorted(pairs, key=lambda p: len(p[0]), reverse=True):
        if old in seen or old == new:
            continue
        seen.add(old)
        unique.append((old, new))
    return unique


def replace_import_paths(text: str, old: str, new: str) -> str:
    """Replace import path only when `old` is the full path (ends at quote)."""
    pattern = re.escape(old) + r"(?=['\"])"
    return re.sub(pattern, new, text)


def remap_imports() -> int:
    pairs = all_remap_pairs()
    count = 0
    for path in SRC.rglob("*"):
        if path.suffix not in {".ts", ".tsx"}:
            continue
        text = path.read_text(encoding="utf-8")
        orig = text
        for old, new in pairs:
            text = replace_import_paths(text, old, new)
        if text != orig:
            path.write_text(text, encoding="utf-8", newline="\n")
            count += 1
    return count


if __name__ == "__main__":
    import sys
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    if cmd in ("move", "all"):
        run_moves()
        print(f"moved {len(MOVES)} paths")
    if cmd in ("imports", "all"):
        n = remap_imports()
        print(f"updated imports in {n} files")
