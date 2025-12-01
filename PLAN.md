# Smart-Grid: Semantic Sizing Feature (TDD Implementation Plan)

## Overview

Add `data-size="small|medium|large"` attribute to grid items (1, 2, 3 relative units).
Rename `orphans` → `fill` for clearer semantics. Add `fill-last` for last-row control.

---

## Component API

```html
<!-- Basic usage -->
<smart-grid columns="4">
  <div data-size="small">1 unit</div>
  <div data-size="medium">2 units</div>
  <div data-size="large">3 units</div>
</smart-grid>

<!-- Last row fixed, other rows expand -->
<smart-grid columns="4" fill="equal-extra" fill-last="none">
  ...
</smart-grid>

<!-- All rows fixed (gaps allowed) -->
<smart-grid columns="4" fill="none">
  ...
</smart-grid>
```

### Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `columns` | 1-12 | 3 | Maximum columns |
| `fill` | `equal-extra`, `none` | `equal-extra` | How items fill rows |
| `fill-last` | `equal-extra`, `none` | (same as fill) | Override for last row |

### Child Attributes

| Attribute | Values | Default | Description |
|-----------|--------|---------|-------------|
| `data-size` | `small`, `medium`, `large` | `small` | Relative width (1, 2, 3 units) |

---

## Architecture

**Flat structure** - no nested features folder. Simple, readable modules:

```
src/
├── index.ts                # Exports
├── smart-grid.ts           # Web component
├── smart-grid.test.ts      # Component tests
├── smart-grid.scss         # Styles
├── events.ts               # Event types
├── types.ts                # Shared types
├── parse-size.ts           # Parse data-size → number
├── parse-size.test.ts
├── build-rows.ts           # Items → row structure
├── build-rows.test.ts
├── calculate-spans.ts      # Rows → CSS spans
├── calculate-spans.test.ts
├── apply-spans.ts          # Apply spans to DOM
├── apply-spans.test.ts
└── utils/
    ├── resolve-to-pixels.ts
    └── resolve-to-pixels.test.ts
```

---

## Types

```typescript
// types.ts
export type FillMode = 'equal-extra' | 'none'
export type SemanticSize = 'small' | 'medium' | 'large'

export const SIZE_UNITS: Record<SemanticSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
}

export interface RowItem {
  index: number
  size: number  // effective size (capped to maxColumns)
}

export type Row = RowItem[]
```

---

## Algorithms

### 1. parseSize(element, maxColumns) → number

```
- Read data-size attribute
- Map to units: small=1, medium=2, large=3
- Default to 1 if missing/invalid
- Cap to maxColumns
```

### 2. buildRows(sizes, maxColumns) → Row[]

```
- Greedy first-fit: place items in order
- Wrap to new row when item doesn't fit
- For uniform items (all size 1): use balanced distribution to avoid orphans
```

**Example**: `[1, 2, 1, 1]` in 3 columns:
```
Row 1: [0, 1] (1+2=3) ✓
Row 2: [2, 3] (1+1=2)
```

### 3. calculateSpans(rows, maxColumns, fillMode, isLastRow) → number[]

**equal-extra mode**: Distribute extra space evenly
```
Row [small, medium] in 6 cols:
- Total: 3, Slack: 3, Items: 2
- Extra per item: 1 (remainder: 1)
- Spans: [1+1+1, 2+1] = [3, 3]
```

**none mode**: Keep relative sizes, allow gaps
```
Row [small, medium] in 6 cols:
- LCM grid, scale sizes proportionally
- Spans: [1, 2] (gap of 3)
```

### 4. applySpans(items, spans) → void

```
- Set style.gridColumn = `span ${span}` for each item
- Clear span if span === 1
```

---

## Event Payload

```typescript
// events.ts
export const LAYOUT_CHANGED = '__smartgrid:layout-changed__'

export interface LayoutChangedDetail {
  rows: Row[]
  gridColumns: number
  maxColumns: number
  items: HTMLElement[]
  fill: FillMode
  fillLast: FillMode
}
```

---

## TDD Implementation Order

### Phase 1: parseSize

**Tests first** (`parse-size.test.ts`):
```typescript
describe('parseSize', () => {
  it('small → 1')
  it('medium → 2')
  it('large → 3')
  it('undefined → 1')
  it('invalid → 1')
  it('large capped to maxColumns=2 → 2')
})
```

### Phase 2: buildRows

**Tests first** (`build-rows.test.ts`):
```typescript
describe('buildRows', () => {
  // Basic placement
  it('[1,1,1] in 3 cols → [[0,1,2]]')
  it('[1,1,1,1] in 3 cols → [[0,1,2], [3]]')
  it('[2,2] in 3 cols → [[0], [1]]')
  it('[1,2,1] in 3 cols → [[0,1], [2]]')

  // Balanced distribution (uniform items)
  it('[1,1,1,1] in 3 cols → [[0,1], [2,3]] (avoid orphan)')
  it('[1,1,1,1,1,1,1] in 3 cols → [[0,1,2], [3,4], [5,6]]')

  // Invariants
  it('all items appear exactly once')
  it('no row exceeds maxColumns')
  it('items maintain order')
})
```

### Phase 3: calculateSpans

**Tests first** (`calculate-spans.test.ts`):
```typescript
describe('calculateSpans', () => {
  describe('equal-extra mode', () => {
    it('[1,1] in 4 cols → [2,2]')
    it('[1,2] in 6 cols → [3,3]')
    it('[1,1,1] in 3 cols → [1,1,1]')
  })

  describe('none mode', () => {
    it('[1,1] in 4 cols → [1,1]')
    it('[1,2] in 6 cols → [2,4]')
  })

  describe('fill-last override', () => {
    it('last row uses fillLast mode')
  })
})
```

### Phase 4: Integration

**Tests** (`smart-grid.test.ts`):
```typescript
describe('SmartGrid', () => {
  describe('fill attribute', () => {
    it('defaults to equal-extra')
    it('fill="none" leaves gaps')
  })

  describe('fill-last attribute', () => {
    it('defaults to fill value')
    it('overrides last row behavior')
  })

  describe('data-size', () => {
    it('reads from children')
    it('recalculates on change')
    it('caps to effective columns')
  })
})
```

### Phase 5: E2E

**Tests** (`e2e/fill.spec.ts`):
```typescript
test('sized items display correctly')
test('fill="none" shows gaps')
test('fill-last="none" keeps last row fixed')
test('responsive sizing')
test('dynamic data-size changes')
```

---

## Implementation Steps

1. **Create types.ts** - FillMode, SemanticSize, SIZE_UNITS, RowItem, Row
2. **Write parse-size tests** → implement parse-size.ts
3. **Write build-rows tests** → implement build-rows.ts
4. **Write calculate-spans tests** → implement calculate-spans.ts
5. **Update apply-spans.ts** - simplify, use new types
6. **Update smart-grid.ts**:
   - Change observed attributes: `columns`, `fill`, `fill-last`
   - Extend MutationObserver: add `subtree: true`, `data-size` filter
   - Integrate new modules
7. **Update events.ts** - new payload
8. **Delete old code**: `features/auto-balance/`, `features/orphan-handler/`
9. **Update index.ts** - new exports
10. **Update tests** - unit and integration
11. **Update docs/index.html** - new API demos
12. **Write E2E tests**

---

## Edge Cases

| Case | Handling |
|------|----------|
| Item larger than maxColumns | Cap to maxColumns |
| Single item | Expands to fill (unless fill="none") |
| All uniform (no data-size) | Balanced distribution |
| Invalid data-size | Default to small (1) |
| Dynamic data-size change | MutationObserver triggers recalc |
| fill-last differs from fill | Last row uses fill-last mode |

---

## Files to Delete

- `src/features/auto-balance/` (entire directory)
- `src/features/orphan-handler/` (entire directory)
- `src/features/` (directory itself, if empty)

## Files to Create

- `src/types.ts`
- `src/parse-size.ts`
- `src/parse-size.test.ts`
- `src/build-rows.ts`
- `src/build-rows.test.ts`
- `src/calculate-spans.ts`
- `src/calculate-spans.test.ts`
- `e2e/fill.spec.ts`

## Files to Modify

- `src/smart-grid.ts` - new attributes, MutationObserver, integration
- `src/smart-grid.test.ts` - update for new API
- `src/events.ts` - new payload structure
- `src/apply-spans.ts` - move from features/, simplify
- `src/index.ts` - update exports
- `docs/index.html` - new demos
