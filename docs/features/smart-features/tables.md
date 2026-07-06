# Tables

## What it is

Full **editable tables** with a floating toolbar when your cursor is inside a table.

## Problem it solves

Construction reports rely on tabular data (quantities, hours, costs, trades). Users need row/column editing without opening a spreadsheet.

## How to use

### Insert a table

- Slash: `/table`, `/table4x4`, etc.
- Toolbar: table picker (grid size)
- Paste tabular/CSV data via [smart paste](./smart-paste.md)

### Table toolbar (when focused in table)

| Action | Purpose |
|--------|---------|
| Insert row above/below | Add rows |
| Delete row | Remove current row |
| Insert column left/right | Add columns |
| Delete column | Remove current column |
| Merge / split cells | Span cells |
| Toggle header row | Header styling |
| **Spark Chart** | Open chart type picker — [spark-chart.md](./spark-chart.md) |
| Delete table | Remove entire table |

## Notes

- TipTap Table extension with resizable columns.
- Table toolbar is portaled above the table and updates on scroll.
- Spark Chart is **instant** (no AI) when numeric columns exist.
