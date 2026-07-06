# Document outline

## What it is

A **table of contents (TOC)** sidebar that lists document headings and lets you jump to sections. Optional TOC block can be inserted into the document itself.

## Problem it solves

Long method statements and reports are hard to navigate. An outline shows structure at a glance.

## How to use

### Sidebar outline

- Toggle from toolbar when enabled
- Click a heading to scroll the editor to that section
- Collapsible rail on wide screens

### TOC block

- Insert a live TOC block that updates from headings in the document
- Template modal for common TOC layouts

## Notes

- `toc-sidebar.tsx`, `toc-block.ts`, `toc-utils.ts`
- Headings use stable IDs via `heading-id.ts` extension.
