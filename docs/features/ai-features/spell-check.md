# Spell check

## What it is

**Local, instant spelling auto-correct** as you type. Enabled via **Spark AI → Spelling** toggle.

Despite living under Spark AI, this feature **does not call OpenAI** and uses **no API tokens**.

## Problem it solves

Construction reports contain domain terms and common typos (`teh` → `the`, trade jargon). Browser spell check alone often flags valid terms or misses typos. Users want fixes **on space** without opening a dialog.

## How to use

1. Open **Spark AI** in the toolbar.
2. Turn **Spelling** **ON**.
3. Type normally. After **space**, **comma**, or similar, known typos are corrected automatically.

## How it works (technical)

- Dictionary: common typos (`common-typos.ts`) + construction terms (`construction-terms.ts`, `spell-dictionary.ts`)
- Hook: `useAiSpellcheck` in `ai-spellcheck.ts`
- Skips ALL-CAPS tokens and words with digits

## Notes

| | Spell check | Grammar check |
|---|-------------|---------------|
| AI? | **No** | Yes |
| Tokens | **None** | Uses API |
| When | On space/punctuation | While typing + hover |

## Related

- [Grammar check](./grammar-check.md)
