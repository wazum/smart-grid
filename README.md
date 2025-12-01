# `<smart-grid>` Web Component

[![CI](https://github.com/wazum/smart-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/wazum/smart-grid/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**Smart CSS Grid layouts with auto-rebalancing for orphan rows.**

A zero-dependency web component that creates balanced grid layouts — no more lonely single items on the last row.

[**Live Demo**](https://wazum.github.io/smart-grid/)

## The Problem

Traditional grids leave lonely orphans:

```
+---+ +---+ +---+
| 1 | | 2 | | 3 |
+---+ +---+ +---+
+---+
| 4 |  <- orphan
+---+
```

## The Solution

SmartGrid rebalances automatically:

```
+------+ +------+
|  1   | |  2   |
+------+ +------+
+------+ +------+
|  3   | |  4   |
+------+ +------+
```

## Installation

```bash
npm install @wazum/smart-grid
```

## Usage

```html
<script type="module" src="dist/smart-grid.js"></script>
<link rel="stylesheet" href="dist/smart-grid.css">

<smart-grid columns="3">
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>4</div>
</smart-grid>
<!-- Result: 2x2 grid instead of 3+1 -->
```

### Semantic Sizing

Items can specify relative widths:

```html
<smart-grid columns="6">
  <div data-size="large">3 units</div>
  <div data-size="medium">2 units</div>
  <div data-size="small">1 unit</div>
</smart-grid>
```

## API

### Attributes

| Attribute   | Default       | Description                                  |
|-------------|---------------|----------------------------------------------|
| `columns`   | `3`           | Maximum columns (1–12)                       |
| `fill`      | `equal-extra` | How items fill rows: `equal-extra` or `none` |
| `fill-last` | inherits fill | Override fill behavior for last row only     |

### Child Attributes

| Attribute   | Values                     | Default | Description              |
|-------------|----------------------------|---------|--------------------------|
| `data-size` | `small`, `medium`, `large` | `small` | Relative width (1, 2, 3) |

### Properties

| Property           | Type     | Description                                        |
|--------------------|----------|----------------------------------------------------|
| `effectiveColumns` | `number` | Current column count after responsive adjustments  |

### Fill Modes

**`fill="equal-extra"`** (default) — Items expand to fill the row:
```
7 items, 3 columns → [3, 2, 2]
+--+ +--+ +--+
| 1| | 2| | 3|  ← 3 items
+--+ +--+ +--+
+----+ +----+
|  4 | |  5 |   ← 2 items, expanded
+----+ +----+
```

**`fill="none"`** — Items keep their original size:
```
7 items, 3 columns → gaps allowed
+--+ +--+ +--+
| 1| | 2| | 3|
+--+ +--+ +--+
+--+ +--+
| 4| | 5|      ← gap on right
+--+ +--+
```

### CSS Custom Properties

```css
smart-grid {
  --smart-grid-gap: 1rem;
  --smart-grid-min-width: 200px;        /* Responsive breakpoint */
  --smart-grid-min-width-medium: 400px; /* For medium items */
  --smart-grid-min-width-large: 600px;  /* For large items */
}
```

## Development

```bash
npm install
npm test          # Unit tests (Vitest)
npm run test:e2e  # E2E tests (Playwright)
npm run build     # Production build
```

## License

MIT — Wolfgang Klinger <wolfgang@wazum.com>
