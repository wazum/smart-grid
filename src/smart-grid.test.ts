import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SmartGrid } from './smart-grid'

describe('SmartGrid web component', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  function createGrid(attrs: Record<string, string> = {}): SmartGrid {
    const grid = document.createElement('smart-grid') as SmartGrid
    Object.entries(attrs).forEach(([key, value]) => {
      grid.setAttribute(key, value)
    })
    return grid
  }

  function addItems(grid: SmartGrid, count: number, sizes?: string[]): HTMLElement[] {
    const items: HTMLElement[] = []
    for (let i = 0; i < count; i++) {
      const item = document.createElement('div')
      item.textContent = `Item ${i + 1}`
      if (sizes?.[i]) {
        item.dataset.size = sizes[i]
      }
      grid.appendChild(item)
      items.push(item)
    }
    return items
  }

  describe('registration', () => {
    it('registers as custom element', () => {
      expect(customElements.get('smart-grid')).toBeDefined()
    })

    it('can be created via document.createElement', () => {
      const grid = document.createElement('smart-grid')
      expect(grid).toBeInstanceOf(SmartGrid)
    })
  })

  describe('columns attribute', () => {
    it('defaults to 3 columns', () => {
      const grid = createGrid()
      expect(grid.columns).toBe(3)
    })

    it('respects columns attribute', () => {
      const grid = createGrid({ columns: '4' })
      expect(grid.columns).toBe(4)
    })

    it('enforces minimum of 1 column', () => {
      const grid = createGrid({ columns: '0' })
      expect(grid.columns).toBe(1)
    })

    it('handles invalid column value', () => {
      const grid = createGrid({ columns: 'invalid' })
      expect(grid.columns).toBe(3)
    })
  })

  describe('fill attribute', () => {
    it('defaults to equal-extra', () => {
      const grid = createGrid()
      expect(grid.fill).toBe('equal-extra')
    })

    it('respects fill="none" attribute', () => {
      const grid = createGrid({ fill: 'none' })
      expect(grid.fill).toBe('none')
    })
  })

  describe('fill-last attribute', () => {
    it('defaults to fill value', () => {
      const grid = createGrid()
      expect(grid.fillLast).toBe('equal-extra')

      const gridNone = createGrid({ fill: 'none' })
      expect(gridNone.fillLast).toBe('none')
    })

    it('can override fill for last row', () => {
      const grid = createGrid({ fill: 'equal-extra', 'fill-last': 'none' })
      expect(grid.fill).toBe('equal-extra')
      expect(grid.fillLast).toBe('none')
    })
  })

  describe('data-size attribute', () => {
    it('items default to small (1 unit)', () => {
      const grid = createGrid({ columns: '3' })
      addItems(grid, 3)
      container.appendChild(grid)

      const computedStyle = getComputedStyle(grid)
      expect(computedStyle.getPropertyValue('--grid-columns').trim()).toBe('')
    })

    it('medium items take 2 units each', () => {
      const grid = createGrid({ columns: '4' })
      const items = addItems(grid, 2, ['medium', 'medium'])
      container.appendChild(grid)

      expect(items[0].style.gridColumn).toBe('span 2')
      expect(items[1].style.gridColumn).toBe('span 2')
    })

    it('mixed sizes create proportional spans', () => {
      const grid = createGrid({ columns: '6' })
      const items = addItems(grid, 3, ['large', 'medium', 'small'])
      container.appendChild(grid)

      expect(items[0].style.gridColumn).toBe('span 3')
      expect(items[1].style.gridColumn).toBe('span 2')
      expect(items[2].style.gridColumn).toBe('')
    })

    it('recalculates on data-size change', () => {
      const grid = createGrid({ columns: '3' })
      const items = addItems(grid, 2, ['small', 'small'])
      container.appendChild(grid)

      items[0].dataset.size = 'medium'

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(getComputedStyle(grid).getPropertyValue('--grid-columns').trim()).not.toBe('')
          resolve()
        }, 0)
      })
    })
  })

  describe('auto-balance layout', () => {
    it('rebalances 4 items in 3-col to 2x2', () => {
      const grid = createGrid({ columns: '3' })
      addItems(grid, 4)
      container.appendChild(grid)

      const computedStyle = getComputedStyle(grid)
      expect(computedStyle.getPropertyValue('--grid-columns').trim()).toBe('2')
    })

    it('does not rebalance 6 items in 3-col (perfect fit)', () => {
      const grid = createGrid({ columns: '3' })
      const items = addItems(grid, 6)
      container.appendChild(grid)

      items.forEach((item) => {
        expect(item.style.gridColumn).toBe('')
      })
    })

    it('handles empty grid', () => {
      const grid = createGrid({ columns: '3' })
      container.appendChild(grid)

      const computedStyle = getComputedStyle(grid)
      expect(computedStyle.getPropertyValue('--grid-columns').trim()).toBe('')
    })

    it('handles single item', () => {
      const grid = createGrid({ columns: '3' })
      addItems(grid, 1)
      container.appendChild(grid)

      const computedStyle = getComputedStyle(grid)
      expect(computedStyle.getPropertyValue('--grid-columns').trim()).toBe('1')
    })
  })

  describe('dynamic updates', () => {
    it('recalculates when children are added', () => {
      const grid = createGrid({ columns: '3' })
      addItems(grid, 3)
      container.appendChild(grid)

      const newItem = document.createElement('div')
      grid.appendChild(newItem)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const computedStyle = getComputedStyle(grid)
          expect(computedStyle.getPropertyValue('--grid-columns').trim()).toBe('2')
          resolve()
        }, 0)
      })
    })

    it('recalculates when children are removed', () => {
      const grid = createGrid({ columns: '3' })
      const items = addItems(grid, 4)
      container.appendChild(grid)

      items[3].remove()

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const computedStyle = getComputedStyle(grid)
          expect(computedStyle.getPropertyValue('--grid-columns').trim()).toBe('')
          resolve()
        }, 0)
      })
    })
  })

  describe('cleanup', () => {
    it('disconnects observers when removed from DOM', () => {
      const grid = createGrid({ columns: '3' })
      addItems(grid, 4)
      container.appendChild(grid)

      grid.remove()

      expect(() => container.appendChild(grid)).not.toThrow()
    })
  })
})
