# `<smart-grid>` Web Component

[![CI](https://github.com/wazum/smart-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/wazum/smart-grid/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@wazum/smart-grid.svg)](https://www.npmjs.com/package/@wazum/smart-grid)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**Intelligent CSS Grid layouts with auto-rebalancing for orphan rows.**

A standalone, npm-publishable web component that provides equal-height grid items with smart orphan handling - no more lonely single items on the last row.

[Live Demo](https://wazum.github.io/smart-grid/)

## Features

- **Smart distribution**: Automatically redistributes items across rows (e.g., 7 items in 3-col becomes 3+2+2, not 3+3+1)
- **Variable item sizes**: Use `data-size` attribute for multi-column items
- **Responsive**: CSS custom properties for min-width with any CSS unit (px, ch, em, rem)
- **Zero dependencies**: Pure web component, no framework required
- **CSS-first**: All styling via CSS custom properties, JS only handles counting
- **Light DOM**: Better accessibility, external CSS can style children directly
- **TypeScript**: Full type definitions included

## Installation

```bash
npm install @wazum/smart-grid
```

## Quick Start

```html
<!-- Import the component -->
<script type="module" src="node_modules/@wazum/smart-grid/dist/smart-grid.js"></script>
<link rel="stylesheet" href="node_modules/@wazum/smart-grid/dist/smart-grid.css">

<!-- Use it -->
<smart-grid columns="3">
  <article>Card 1</article>
  <article>Card 2</article>
  <article>Card 3</article>
  <article>Card 4</article>
</smart-grid>
<!-- Result: 2x2 grid (auto-rebalanced from 3+1) -->
```

Or with ES modules:

```javascript
import '@wazum/smart-grid';
import '@wazum/smart-grid/styles';
```

## How It Works

### The Problem

Traditional grids with orphan items look unbalanced:

```
+---+ +---+ +---+
| 1 | | 2 | | 3 |
+---+ +---+ +---+
+---+
| 4 |  <- lonely orphan
+---+
```

### The Solution

SmartGrid automatically rebalances to create even rows:

```
+---+ +---+
| 1 | | 2 |
+---+ +---+
+---+ +---+
| 3 | | 4 |  <- balanced
+---+ +---+
```

### Smart Distribution

For larger item counts, SmartGrid uses a smart distribution algorithm that keeps full rows at the start and balances only the tail:

| Items | Max Cols | Distribution | Result  |
| ----- | -------- | ------------ | ------- |
| 4     | 3        | 2+2          | 2 cols  |
| 5     | 3        | 3+2          | 3 cols  |
| 7     | 3        | 3+2+2        | 3 cols with varying row widths |
| 10    | 3        | 3+3+2+2      | 3 cols with varying row widths |
| 13    | 4        | 4+4+3+2      | 4 cols with varying row widths |

The algorithm maximizes full rows first, then distributes remaining items evenly across tail rows while avoiding single-item orphans (below 34% fill ratio).

## API

### HTML Attributes

| Attribute | Values                           | Default   | Description                     |
| --------- | -------------------------------- | --------- | ------------------------------- |
| `columns` | 1-12                             | 3         | Maximum number of columns       |
| `balance` | `auto` \| `expand` \| `preserve` | `auto`    | Orphan handling mode            |
| `orphans` | `expand` \| `fixed`              | `expand`  | How orphan items fill the row   |

```html
<smart-grid columns="4" balance="auto" orphans="expand">
  <!-- children -->
</smart-grid>
```

### JavaScript Methods

| Method | Description |
| ------ | ----------- |
| `refresh()` | Force re-layout after CSS custom property changes |

### Balance Modes

Controls whether SmartGrid rebalances items to avoid orphans:

- **`auto`** (default): Intelligently redistributes items across rows. For example, 4 items in 3-col becomes 2+2 instead of 3+1.
- **`expand`**: No redistribution. Last row orphans expand to fill the row width.
- **`preserve`**: No redistribution. Last row orphans keep their original column width (leaves empty space).

**Example: 4 items in 3 columns**

| Mode | Distribution | Visual Result |
|------|-------------|---------------|
| `auto` | 2 + 2 | Both rows balanced, no orphans |
| `expand` | 3 + 1 | Last item expands to full width |
| `preserve` | 3 + 1 | Last item stays at 1/3 width, empty space on right |

### Orphans Modes (when balance="auto")

Only applies when `balance="auto"` creates varying row sizes (like 7 items → 3+2+2):

- **`expand`** (default): Items in smaller rows expand to fill the full grid width
- **`fixed`**: All items maintain the same width regardless of row size

### CSS Custom Properties

All styling is controlled via CSS custom properties:

```css
smart-grid {
  /* Gap between items */
  --smart-grid-gap: 1rem;
  --smart-grid-row-gap: var(--smart-grid-gap);
  --smart-grid-column-gap: var(--smart-grid-gap);

  /* Minimum item width for responsive behavior */
  --smart-grid-min-width: 200px;

  /* Size ratios for child items */
  --smart-grid-size-small: 1;
  --smart-grid-size-medium: 2;
  --smart-grid-size-large: 3;
}
```

**Responsive min-width with ch units:**

```css
smart-grid {
  --smart-grid-min-width: 25ch;  /* Text-based minimum width */
}
```

### Reactivity and Limitations

**CSS Variable Changes**: SmartGrid reads CSS custom properties at initialization and on resize. If you change `--smart-grid-min-width` or `--smart-grid-gap` via JavaScript or media queries, call the `refresh()` method to trigger a re-layout:

```javascript
const grid = document.querySelector('smart-grid');
grid.style.setProperty('--smart-grid-min-width', '300px');
grid.refresh(); // Re-calculate layout with new value
```

**Supported Units**: Use `px`, `rem`, `em`, or `ch` for `--smart-grid-min-width`. Percentage units (`%`) are not recommended as they create circular dependencies with the grid's own width calculation.

**Minimum Columns**: The `columns` attribute enforces a minimum value of 1. Setting `columns="0"` will default to 1 column.

### Item Sizing

Use `data-size` attribute on child elements for multi-column spans:

```html
<smart-grid columns="4">
  <div>Default (1x)</div>
  <div data-size="2">Double width</div>
  <div data-size="3">Triple width</div>
  <div data-size="medium">Using semantic name</div>
</smart-grid>
```

Numeric values: `1`, `2`, `3`, `4`, `5`, `6`
Semantic values: `small` (1), `medium` (2), `large` (3)

Items with `data-size` larger than available columns are automatically capped.

## Design Principles

### Separation of Concerns

| HTML Attributes (behavior) | CSS Custom Properties (styling) |
|----------------------------|--------------------------------|
| `columns`                  | `--smart-grid-gap`             |
| `balance`                  | `--smart-grid-min-width`       |
| `orphans`                  | `--smart-grid-row-gap`         |
|                            | `--smart-grid-column-gap`      |

**Rule**: HTML attributes control structure/behavior, CSS controls visual styling.

### Light DOM (No Shadow DOM)

We use Light DOM because:
- Better accessibility (natural screen reader traversal)
- External CSS can style children directly
- CSS Subgrid works across boundaries
- Simpler debugging

Trade-off: No style encapsulation (acceptable for layout primitives).

### CSS-First, JS-Minimal

**CSS handles:**
- Grid structure (`display: grid`)
- Gap spacing
- Responsive column count via container queries
- Item sizing via `grid-column: span N`
- Equal heights (automatic with CSS Grid)

**JavaScript handles:**
- Counting items for rebalancing
- Calculating optimal row distribution
- Applying grid-column spans
- Observing DOM changes (MutationObserver)
- Observing size changes (ResizeObserver)

## Browser Support

- CSS Grid: 99%+
- Container Queries: 95%+
- CSS `min()`: 95%+
- Custom Elements v1: 98%+

## Development

```bash
npm install
npm test
npm run test:watch
npm run build
```

## License

MIT

## Author

Wolfgang Klinger <wolfgang@wazum.com>
