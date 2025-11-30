import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { SmartGrid } from './index'

/**
 * TDD: Tests for SmartGrid web component.
 * Tests reflect production usage: children added BEFORE connecting to DOM.
 */
describe('SmartGrid', () => {
    let container: HTMLElement

    beforeEach(() => {
        container = document.createElement('div')
        document.body.appendChild(container)
    })

    afterEach(() => {
        container.remove()
    })

    const createGrid = (attrs: Record<string, string> = {}): SmartGrid => {
        const grid = document.createElement('smart-grid') as SmartGrid
        for (const [key, value] of Object.entries(attrs)) {
            grid.setAttribute(key, value)
        }
        return grid
    }

    const addItems = (grid: SmartGrid, count: number): void => {
        for (let i = 0; i < count; i++) {
            grid.appendChild(document.createElement('div'))
        }
    }

    const waitForMutation = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

    describe('custom element registration', () => {
        it('registers as a custom element', () => {
            expect(customElements.get('smart-grid')).toBeDefined()
        })

        it('creates an instance via document.createElement', () => {
            const grid = createGrid()
            expect(grid).toBeInstanceOf(HTMLElement)
            expect(grid.tagName.toLowerCase()).toBe('smart-grid')
        })
    })

    describe('default behavior', () => {
        it('defaults to 3 columns', () => {
            const grid = createGrid()
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(3)
        })

        it('defaults to auto balance mode', () => {
            const grid = createGrid()
            addItems(grid, 4)
            container.appendChild(grid)

            // 4 items in 3-col = 3+1 (33% orphan) → rebalance to 2×2
            expect(grid.getComputedColumns()).toBe(2)
        })
    })

    describe('columns attribute', () => {
        it('respects columns="4" attribute', () => {
            const grid = createGrid({ columns: '4' })
            addItems(grid, 8)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(4)
        })

        it('rebalances based on columns attribute', () => {
            const grid = createGrid({ columns: '4' })
            addItems(grid, 5)
            container.appendChild(grid)

            // 5%4=1 (25% orphan) → try 3 cols: 5%3=2 (66% ≥ 34%) acceptable
            expect(grid.getComputedColumns()).toBe(3)
        })

        it('never exceeds columns attribute', () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 100)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBeLessThanOrEqual(3)
        })
    })

    describe('balance attribute', () => {
        it('balance="auto" triggers rebalancing', () => {
            const grid = createGrid({ balance: 'auto' })
            addItems(grid, 4)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(2)
        })

        it('balance="expand" does not compute columns', () => {
            const grid = createGrid({ balance: 'expand' })
            addItems(grid, 4)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(0)
        })

        it('balance="preserve" does not compute columns', () => {
            const grid = createGrid({ balance: 'preserve' })
            addItems(grid, 4)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(0)
        })

        it('balance="expand" sets --max-columns from columns attribute', () => {
            const grid = createGrid({ columns: '3', balance: 'expand' })
            addItems(grid, 5)
            container.appendChild(grid)

            expect(grid.style.getPropertyValue('--max-columns')).toBe('3')
        })

        it('balance="preserve" sets --max-columns from columns attribute', () => {
            const grid = createGrid({ columns: '4', balance: 'preserve' })
            addItems(grid, 5)
            container.appendChild(grid)

            expect(grid.style.getPropertyValue('--max-columns')).toBe('4')
        })

        it('balance="expand" applies spans to orphan items to fill the row', () => {
            const grid = createGrid({ columns: '3', balance: 'expand' })
            addItems(grid, 5) // 3 + 2 orphans
            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]

            // Row 1 (full): items span 2 grid units each (using 6-column grid, 6/3=2)
            expect(items[0].style.gridColumn).toBe('span 2')
            expect(items[1].style.gridColumn).toBe('span 2')
            expect(items[2].style.gridColumn).toBe('span 2')

            // Row 2 (orphans): items span 3 grid units each to fill the row (6/2=3)
            expect(items[3].style.gridColumn).toBe('span 3')
            expect(items[4].style.gridColumn).toBe('span 3')
        })

        it('balance="preserve" applies same span to all items (no orphan expansion)', () => {
            const grid = createGrid({ columns: '3', balance: 'preserve' })
            addItems(grid, 5) // 3 + 2 orphans
            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]

            // All items should have the same span (no expansion for orphans)
            expect(items[0].style.gridColumn).toBe('span 2')
            expect(items[1].style.gridColumn).toBe('span 2')
            expect(items[2].style.gridColumn).toBe('span 2')
            expect(items[3].style.gridColumn).toBe('span 2')
            expect(items[4].style.gridColumn).toBe('span 2')
        })
    })

    describe('dynamic updates', () => {
        it('recalculates when children are added after connection', async () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(3)

            // Add 1 more (7 items) → smart distribution [3, 2, 2]
            // First row has 3 columns, so computedColumns stays 3
            grid.appendChild(document.createElement('div'))
            await waitForMutation()

            expect(grid.getComputedColumns()).toBe(3)
        })

        it('recalculates when children are removed', async () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 7)
            container.appendChild(grid)

            // 7 items: smart distribution [3, 2, 2], first row = 3 cols
            expect(grid.getComputedColumns()).toBe(3)

            // Remove 1 item (6 items) → 6%3=0 perfect fit → 3 cols
            grid.lastElementChild?.remove()
            await waitForMutation()

            expect(grid.getComputedColumns()).toBe(3)
        })

        it('recalculates when columns attribute changes', () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(3)

            grid.setAttribute('columns', '4')
            // 6 items in 4-col = 4+2 (50% ≥ 34% threshold) → acceptable, use 4 cols
            expect(grid.getComputedColumns()).toBe(4)
        })
    })

    describe('edge cases', () => {
        it('handles empty grid', () => {
            const grid = createGrid()
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(0)
        })

        it('handles single item', () => {
            const grid = createGrid()
            addItems(grid, 1)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(1)
        })

        it('ignores non-element children (text nodes)', () => {
            const grid = createGrid()
            grid.appendChild(document.createTextNode('text'))
            addItems(grid, 2)
            grid.appendChild(document.createTextNode('more text'))
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(2)
        })
    })

    describe('CSS custom property output', () => {
        it('sets --computed-columns custom property for auto balance', () => {
            const grid = createGrid()
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.style.getPropertyValue('--computed-columns')).toBe('3')
        })

        it('does not set inline grid-template-columns (CSS handles it)', () => {
            const grid = createGrid()
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.style.gridTemplateColumns).toBe('')
        })

        it('removes custom property when balance is not auto', () => {
            const grid = createGrid({ balance: 'expand' })
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.style.getPropertyValue('--computed-columns')).toBe('')
        })

        it('updates custom property when items change', async () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.style.getPropertyValue('--computed-columns')).toBe('3')

            // Add 1 more (7 items) → smart distribution [3, 2, 2]
            // First row has 3 columns, so --computed-columns stays '3'
            grid.appendChild(document.createElement('div'))
            await waitForMutation()

            expect(grid.style.getPropertyValue('--computed-columns')).toBe('3')
        })
    })

    describe('orphans attribute', () => {
        it('defaults to expand mode', () => {
            const grid = createGrid()
            addItems(grid, 5)
            container.appendChild(grid)

            expect(grid.orphans).toBe('expand')
        })

        it('sets orphans="fixed" attribute', () => {
            const grid = createGrid({ orphans: 'fixed' })
            addItems(grid, 5)
            container.appendChild(grid)

            expect(grid.orphans).toBe('fixed')
            expect(grid.getAttribute('orphans')).toBe('fixed')
        })

        it('orphans attribute is observed for changes', () => {
            const grid = createGrid()
            addItems(grid, 5)
            container.appendChild(grid)

            expect(grid.orphans).toBe('expand')

            grid.setAttribute('orphans', 'fixed')
            expect(grid.orphans).toBe('fixed')
        })
    })

    describe('cleanup', () => {
        it('disconnects observers when removed from DOM', () => {
            const grid = createGrid()
            addItems(grid, 4)
            container.appendChild(grid)

            grid.remove()

            expect(() => {
                grid.appendChild(document.createElement('div'))
            }).not.toThrow()
        })
    })

    describe('smart distribution with spans', () => {
        it('sets --grid-columns for uneven row distribution', () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 7) // 7 items → [3, 2, 2] distribution
            container.appendChild(grid)

            // LCM of 3 and 2 is 6
            expect(grid.style.getPropertyValue('--grid-columns')).toBe('6')
        })

        it('applies grid-column spans to items in smart distribution', () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 7) // 7 items → [3, 2, 2] distribution
            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]

            // Row 1 (3 items): each spans 2 (6/3=2)
            expect(items[0].style.gridColumn).toBe('span 2')
            expect(items[1].style.gridColumn).toBe('span 2')
            expect(items[2].style.gridColumn).toBe('span 2')

            // Row 2 (2 items): each spans 3 (6/2=3)
            expect(items[3].style.gridColumn).toBe('span 3')
            expect(items[4].style.gridColumn).toBe('span 3')

            // Row 3 (2 items): each spans 3 (6/2=3)
            expect(items[5].style.gridColumn).toBe('span 3')
            expect(items[6].style.gridColumn).toBe('span 3')
        })

        it('does not set --grid-columns for even distribution', () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 6) // 6 items → [3, 3] even distribution
            container.appendChild(grid)

            // No smart distribution needed, CSS handles it
            expect(grid.style.getPropertyValue('--grid-columns')).toBe('')
        })

        it('orphans="fixed" applies same span to all items', () => {
            const grid = createGrid({ columns: '3', orphans: 'fixed' })
            addItems(grid, 7) // 7 items → [3, 2, 2] distribution
            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]

            // All items should have the same span (first row span = 2)
            items.forEach((item) => {
                expect(item.style.gridColumn).toBe('span 2')
            })
        })

        it('clears spans when switching from smart to simple distribution', async () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 7) // Smart distribution
            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]
            expect(items[3].style.gridColumn).toBe('span 3')

            // Remove 1 item → 6 items → even distribution
            grid.lastElementChild?.remove()
            await waitForMutation()

            // Spans should be cleared
            const remainingItems = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]
            remainingItems.forEach((item) => {
                expect(item.style.gridColumn).toBe('')
            })
        })
    })

    describe('CSS custom property --smart-grid-min-width', () => {
        it('reads --smart-grid-min-width from inline style', () => {
            const grid = createGrid({ columns: '3' })
            grid.style.setProperty('--smart-grid-min-width', '200px')
            addItems(grid, 6)
            container.appendChild(grid)

            // Grid should still work with custom property set
            expect(grid.getComputedColumns()).toBe(3)
        })

        it('accepts numeric values without unit (treated as pixels)', () => {
            const grid = createGrid({ columns: '3' })
            grid.style.setProperty('--smart-grid-min-width', '200')
            addItems(grid, 6)
            container.appendChild(grid)

            expect(grid.getComputedColumns()).toBe(3)
        })
    })

    describe('data-size attribute for custom item widths', () => {
        it('applies inline span for data-size items', () => {
            const grid = createGrid({ columns: '3' })
            addItems(grid, 7) // Would trigger smart distribution

            // Set data-size on one item before connecting
            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]
            items[0].dataset.size = '2'

            container.appendChild(grid)

            // Item with data-size gets inline span (capped to columns)
            expect(items[0].style.gridColumn).toBe('span 2')
        })

        it('applies data-size="2" span for double-width items', () => {
            const grid = createGrid({ columns: '4' })

            // Create items: one double-width, rest normal
            const wideItem = document.createElement('div')
            wideItem.dataset.size = '2'
            grid.appendChild(wideItem)
            addItems(grid, 5)

            container.appendChild(grid)

            expect(wideItem.style.gridColumn).toBe('span 2')
            expect(wideItem.dataset.size).toBe('2')
        })

        it('applies data-size="3" span for triple-width items', () => {
            const grid = createGrid({ columns: '4' })

            const wideItem = document.createElement('div')
            wideItem.dataset.size = '3'
            grid.appendChild(wideItem)
            addItems(grid, 4)

            container.appendChild(grid)

            expect(wideItem.style.gridColumn).toBe('span 3')
            expect(wideItem.dataset.size).toBe('3')
        })

        it('mixes data-size items with regular items in smart distribution', () => {
            const grid = createGrid({ columns: '3' })

            // 5 items total: first one is double-width
            const wideItem = document.createElement('div')
            wideItem.dataset.size = '2'
            grid.appendChild(wideItem)
            addItems(grid, 4)

            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]

            // First item has data-size, gets inline span
            expect(items[0].style.gridColumn).toBe('span 2')
            expect(items[0].dataset.size).toBe('2')
        })

        it('clears inline spans but preserves data-size when distribution changes', async () => {
            const grid = createGrid({ columns: '3' })

            const wideItem = document.createElement('div')
            wideItem.dataset.size = '2'
            grid.appendChild(wideItem)
            addItems(grid, 6) // 7 total → smart distribution

            container.appendChild(grid)

            // Remove items to trigger recalculation
            grid.lastElementChild?.remove()
            await waitForMutation()

            // Wide item should still have data-size attribute
            expect(wideItem.dataset.size).toBe('2')
        })

        it('caps data-size spans to available columns', () => {
            const grid = createGrid({ columns: '2' })

            // Item wants 3 columns but only 2 available
            const wideItem = document.createElement('div')
            wideItem.dataset.size = '3'
            grid.appendChild(wideItem)
            addItems(grid, 3)

            container.appendChild(grid)

            // Span should be capped to max columns (2)
            expect(wideItem.style.gridColumn).toBe('span 2')
        })

        it('applies capped spans for all data-size items', () => {
            const grid = createGrid({ columns: '3' })

            const item1 = document.createElement('div')
            item1.dataset.size = '2'
            grid.appendChild(item1)

            const item2 = document.createElement('div')
            item2.dataset.size = '4' // Exceeds columns
            grid.appendChild(item2)

            addItems(grid, 2)
            container.appendChild(grid)

            expect(item1.style.gridColumn).toBe('span 2')
            expect(item2.style.gridColumn).toBe('span 3') // Capped to max
        })

        it('updates data-size spans when columns attribute changes', () => {
            const grid = createGrid({ columns: '4' })

            const wideItem = document.createElement('div')
            wideItem.dataset.size = '3'
            grid.appendChild(wideItem)
            addItems(grid, 3)

            container.appendChild(grid)
            expect(wideItem.style.gridColumn).toBe('span 3')

            // Change to 2 columns
            grid.setAttribute('columns', '2')
            expect(wideItem.style.gridColumn).toBe('span 2') // Capped
        })

        it('distributes leftover space even when extraPerItem is 0', () => {
            // Scenario: 5 columns, row has data-size=2 + 2 regular items = 4 cols
            // remainingSpace = 1, extraPerItem = floor(1/2) = 0, leftover = 1
            // One regular should get the leftover column
            const grid = createGrid({ columns: '5' })

            const sizedItem = document.createElement('div')
            sizedItem.dataset.size = '2'
            grid.appendChild(sizedItem)

            const reg1 = document.createElement('div')
            const reg2 = document.createElement('div')
            grid.appendChild(reg1)
            grid.appendChild(reg2)

            container.appendChild(grid)

            // sizedItem=2, reg1=1+leftover=2, reg2=1 → total 5
            expect(sizedItem.style.gridColumn).toBe('span 2')
            expect(reg1.style.gridColumn).toBe('span 2') // Gets the leftover
            expect(reg2.style.gridColumn).toBe('span 1')
        })
    })

    describe('data-size attribute observation', () => {
        it('re-layouts when data-size attribute is added to a child', async () => {
            const grid = createGrid({ columns: '4' })
            addItems(grid, 4)
            container.appendChild(grid)

            const items = Array.from(grid.querySelectorAll(':scope > *')) as HTMLElement[]
            expect(items[0].style.gridColumn).toBe('')

            // Add data-size attribute
            items[0].dataset.size = '2'
            await waitForMutation()

            expect(items[0].style.gridColumn).toBe('span 2')
        })

        it('re-layouts when data-size attribute is changed', async () => {
            const grid = createGrid({ columns: '4' })

            const sizedItem = document.createElement('div')
            sizedItem.dataset.size = '2'
            grid.appendChild(sizedItem)
            addItems(grid, 3)
            container.appendChild(grid)

            expect(sizedItem.style.gridColumn).toBe('span 2')

            // Change data-size
            sizedItem.dataset.size = '3'
            await waitForMutation()

            expect(sizedItem.style.gridColumn).toBe('span 3')
        })

        it('re-layouts when data-size attribute is removed', async () => {
            const grid = createGrid({ columns: '4' })

            const sizedItem = document.createElement('div')
            sizedItem.dataset.size = '2'
            grid.appendChild(sizedItem)
            addItems(grid, 3)
            container.appendChild(grid)

            expect(sizedItem.style.gridColumn).toBe('span 2')

            // Remove data-size
            delete sizedItem.dataset.size
            await waitForMutation()

            expect(sizedItem.style.gridColumn).toBe('')
        })
    })

    describe('semantic data-size values', () => {
        it('resolves data-size="small" to span 1 in row calculation', () => {
            const grid = createGrid({ columns: '6' })

            const smallItem = document.createElement('div')
            smallItem.dataset.size = 'small'
            grid.appendChild(smallItem)

            const mediumItem = document.createElement('div')
            mediumItem.dataset.size = 'medium'
            grid.appendChild(mediumItem)

            addItems(grid, 3) // 3 regular items
            container.appendChild(grid)

            // small=1 + medium=2 + 3 regular = 6, fits in one row
            // Semantic items should NOT have inline grid-column (CSS handles them)
            expect(smallItem.style.gridColumn).toBe('')
            expect(mediumItem.style.gridColumn).toBe('')
        })

        it('resolves data-size="medium" to span 2 in row calculation', () => {
            const grid = createGrid({ columns: '4' })

            const mediumItem = document.createElement('div')
            mediumItem.dataset.size = 'medium'
            grid.appendChild(mediumItem)
            addItems(grid, 2)
            container.appendChild(grid)

            // medium=2 + 2 regular = 4, fits in one row
            // CSS handles semantic sizing, no inline style
            expect(mediumItem.style.gridColumn).toBe('')
        })

        it('resolves data-size="large" to span 3 in row calculation', () => {
            const grid = createGrid({ columns: '4' })

            const largeItem = document.createElement('div')
            largeItem.dataset.size = 'large'
            grid.appendChild(largeItem)
            addItems(grid, 1)
            container.appendChild(grid)

            // large=3 + 1 regular = 4, fits in one row
            // CSS handles semantic sizing, no inline style
            expect(largeItem.style.gridColumn).toBe('')
        })

        it('caps semantic size to maxColumns', () => {
            const grid = createGrid({ columns: '2' })

            const largeItem = document.createElement('div')
            largeItem.dataset.size = 'large'
            grid.appendChild(largeItem)
            addItems(grid, 2)
            container.appendChild(grid)

            // large capped to 2 (maxColumns), so row calc: 2 + 1 + 1 = 4 = 2 rows
            // Semantic item has no inline style
            expect(largeItem.style.gridColumn).toBe('')
            expect(grid.style.getPropertyValue('--grid-columns')).toBe('2')
        })

        it('mixes semantic and numeric data-size values', () => {
            const grid = createGrid({ columns: '6' })

            const smallItem = document.createElement('div')
            smallItem.dataset.size = 'small'
            grid.appendChild(smallItem)

            const numericItem = document.createElement('div')
            numericItem.dataset.size = '2'
            numericItem.classList.add('numeric')
            grid.appendChild(numericItem)

            addItems(grid, 3)
            container.appendChild(grid)

            // small=1 + numeric=2 + 3 regular = 6
            // Semantic has no inline style, numeric has inline style
            expect(smallItem.style.gridColumn).toBe('')
            expect(numericItem.style.gridColumn).toBe('span 2')
        })

        it('expands semantic items proportionally when row has remaining space', () => {
            // 5 columns, semantic items: small(1) + medium(2) = 3, remaining = 2
            // Should expand proportionally: small gets 1/3 of extra, medium gets 2/3
            const grid = createGrid({ columns: '5' })

            const smallItem = document.createElement('div')
            smallItem.dataset.size = 'small'
            grid.appendChild(smallItem)

            const mediumItem = document.createElement('div')
            mediumItem.dataset.size = 'medium'
            grid.appendChild(mediumItem)

            container.appendChild(grid)

            // Proportional expansion: small = 1 + round(1/3 * 2) = 2, medium = 2 + (2-1) = 3
            // Total: 2 + 3 = 5
            expect(smallItem.style.gridColumn).toBe('span 2')
            expect(mediumItem.style.gridColumn).toBe('span 3')
        })

        it('expands all semantic items to fill a row when alone', () => {
            // 6 columns, large(3) alone = 3, remaining = 3
            const grid = createGrid({ columns: '6' })

            const largeItem = document.createElement('div')
            largeItem.dataset.size = 'large'
            grid.appendChild(largeItem)

            container.appendChild(grid)

            // Large alone gets all 6 columns
            expect(largeItem.style.gridColumn).toBe('span 6')
        })
    })
})
