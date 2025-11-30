import { calculateGridConfig, calculateRowDistribution } from './utils/distribute'

/**
 * SmartGrid - Intelligent CSS Grid web component with auto-rebalancing.
 *
 * External CSS custom properties for configuration:
 * - --smart-grid-gap: Gap between items (default: 1rem)
 * - --smart-grid-min-width: Minimum item width for responsive layouts
 *
 * @example
 * <smart-grid columns="3" balance="auto">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 *   <div>Item 4</div>
 * </smart-grid>
 */
class SmartGrid extends HTMLElement {
  static observedAttributes = ['columns', 'balance', 'orphans']

  private static SEMANTIC_SIZES: Record<string, number> = {
    small: 1,
    medium: 2,
    large: 3,
  }

  private isSemanticSize(value: string | undefined): boolean {
    return value !== undefined && value in SmartGrid.SEMANTIC_SIZES
  }

  private resolveDataSize(item: HTMLElement, maxColumns: number): number {
    const size = item.dataset.size
    if (!size) {
      return 1
    }

    if (this.isSemanticSize(size)) {
      return Math.min(SmartGrid.SEMANTIC_SIZES[size], maxColumns)
    }

    const numeric = parseInt(size, 10)
    return isNaN(numeric) ? 1 : Math.min(numeric, maxColumns)
  }

  private mutationObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private computedColumns = 0
  private gridColumns = 0
  private isSingleColumn = false
  private resolvedValuesCache = new Map<string, number>()

  connectedCallback(): void {
    this.setupObservers()
    // Initial layout - width check will be handled by ResizeObserver
    // For synchronous tests and SSR, apply layout immediately
    this.applyLayout()
  }

  disconnectedCallback(): void {
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  }

  attributeChangedCallback(): void {
    this.applyLayout()
  }

  /**
   * Force re-layout of the grid. Call this after changing CSS custom properties
   * like --smart-grid-gap or --smart-grid-min-width via JavaScript or media queries.
   */
  refresh(): void {
    // Clear cached values to pick up new CSS property values
    this.resolvedValuesCache.clear()
    // Trigger resize handler with current width
    this.handleResize(this.clientWidth)
  }

  private setGridColumns(value: number | null): void {
    if (value !== null && value > 0) {
      this.style.setProperty('--grid-columns', value.toString())
      this.dataset.gridMode = 'fixed'
    } else {
      this.style.removeProperty('--grid-columns')
      delete this.dataset.gridMode
    }
  }

  get columns(): number {
    const attr = this.getAttribute('columns')
    const parsed = attr ? parseInt(attr, 10) : 3
    // Enforce minimum of 1 to prevent division by zero and invalid grid
    return Math.max(1, isNaN(parsed) ? 3 : parsed)
  }

  get balance(): 'auto' | 'expand' | 'preserve' {
    const attr = this.getAttribute('balance')
    if (attr === 'expand' || attr === 'preserve') {
      return attr
    }
    return 'auto'
  }

  get orphans(): 'expand' | 'fixed' {
    const attr = this.getAttribute('orphans')
    if (attr === 'fixed') {
      return 'fixed'
    }
    return 'expand'
  }

  private applyLayout(): void {
    const items = this.getItems()
    const itemCount = items.length

    if (itemCount === 0) {
      this.computedColumns = 0
      this.gridColumns = 0
      this.style.removeProperty('--computed-columns')
      this.setGridColumns(null)
      this.style.removeProperty('--max-columns')
      return
    }

    // Handle expand/preserve modes with JavaScript spans
    if (this.balance === 'expand' || this.balance === 'preserve') {
      this.applyBalanceMode(items)
      return
    }

    // When data-size items exist, use fixed grid mode
    const hasDataSizeItems = items.some((item) => item.dataset.size)
    if (hasDataSizeItems) {
      this.applyFixedGridWithSizes(items, this.columns)
      return
    }

    const { gridColumns, spans } = calculateGridConfig(itemCount, this.columns)
    const distribution = calculateRowDistribution(itemCount, this.columns)

    // Check if we need smart distribution (varying row sizes)
    const uniqueSizes = [...new Set(distribution)]
    const needsSmartDistribution = uniqueSizes.length > 1

    if (needsSmartDistribution) {
      // Smart distribution mode: fixed grid columns with spans
      this.gridColumns = gridColumns
      this.computedColumns = distribution[0] // First row determines visual columns
      this.setGridColumns(gridColumns)
      this.style.setProperty('--computed-columns', this.computedColumns.toString())

      // Apply spans only when orphans="expand" (default)
      // When orphans="fixed", items keep their natural width
      // Skip items with data-size attribute (CSS handles those)
      if (this.orphans === 'expand') {
        items.forEach((item, index) => {
          if (!item.dataset.size && spans[index]) {
            item.style.gridColumn = `span ${spans[index]}`
          }
        })
      } else {
        // Fixed mode: all items use same span (first row span)
        const fixedSpan = spans[0] || 1
        items.forEach((item) => {
          if (!item.dataset.size) {
            item.style.gridColumn = `span ${fixedSpan}`
          }
        })
      }
    } else {
      // Simple mode: all rows same size, use CSS auto-fit
      this.computedColumns = distribution[0] || this.columns
      this.gridColumns = 0
      this.style.setProperty('--computed-columns', this.computedColumns.toString())
      this.setGridColumns(null)
      this.clearItemSpans()
    }
  }

  private applyBalanceMode(items: HTMLElement[]): void {
    const maxColumns = this.columns

    this.computedColumns = 0
    this.style.setProperty('--max-columns', maxColumns.toString())
    this.style.removeProperty('--computed-columns')

    // If all items have data-size, let CSS handle everything
    const itemsWithoutSize = items.filter((item) => !item.dataset.size)
    if (itemsWithoutSize.length === 0) {
      this.gridColumns = 0
      this.setGridColumns(null)
      return
    }

    const itemCount = itemsWithoutSize.length
    const remainder = itemCount % maxColumns
    const orphanCount = remainder === 0 ? 0 : remainder
    const fullRowCount = Math.floor(itemCount / maxColumns)

    // If all items fit perfectly in full rows, no special handling needed
    if (orphanCount === 0) {
      this.gridColumns = 0
      this.setGridColumns(null)
      this.clearItemSpans()
      return
    }

    // Calculate LCM of maxColumns and orphanCount for proper spanning
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const lcm = (maxColumns * orphanCount) / gcd(maxColumns, orphanCount)

    this.gridColumns = lcm
    this.setGridColumns(lcm)

    const fullRowSpan = lcm / maxColumns
    const orphanSpan = this.balance === 'expand' ? lcm / orphanCount : fullRowSpan

    // Apply spans only to items without data-size
    let regularItemIndex = 0
    items.forEach((item) => {
      if (item.dataset.size) {
        return
      }

      const isOrphan = regularItemIndex >= fullRowCount * maxColumns
      const span = isOrphan ? orphanSpan : fullRowSpan
      item.style.gridColumn = `span ${span}`
      regularItemIndex++
    })
  }

  private getItems(): HTMLElement[] {
    // Use this.children instead of querySelectorAll for better performance and compatibility
    return Array.from(this.children) as HTMLElement[]
  }

  private clearItemSpans(): void {
    this.getItems().forEach((item) => {
      item.style.removeProperty('grid-column')
    })
  }

  private applyFixedGridWithSizes(items: HTMLElement[], maxColumns: number): void {
    this.gridColumns = maxColumns
    this.computedColumns = maxColumns
    this.setGridColumns(maxColumns)
    this.style.setProperty('--computed-columns', maxColumns.toString())

    // Clear any stale inline spans before applying new layout
    // This ensures CSS semantic size rules can take effect
    this.clearItemSpans()

    // Calculate item sizes and row layout using resolveDataSize for semantic support
    const itemSizes = items.map((item) => this.resolveDataSize(item, maxColumns))

    // Build rows based on item sizes
    const rows: number[][] = []
    let currentRow: number[] = []
    let currentRowWidth = 0

    itemSizes.forEach((size, index) => {
      if (currentRowWidth + size > maxColumns && currentRow.length > 0) {
        rows.push(currentRow)
        currentRow = []
        currentRowWidth = 0
      }
      currentRow.push(index)
      currentRowWidth += size
    })
    if (currentRow.length > 0) {
      rows.push(currentRow)
    }

    // Apply spans: expand items in partial rows
    rows.forEach((rowIndices) => {
      const rowItemSizes = rowIndices.map((i) => itemSizes[i])
      const rowWidth = rowItemSizes.reduce((sum, s) => sum + s, 0)
      const remainingSpace = maxColumns - rowWidth

      if (remainingSpace > 0 && this.orphans === 'expand') {
        // First try: distribute to items without data-size
        const expandableItems = rowIndices.filter((i) => !items[i].dataset.size)

        if (expandableItems.length > 0) {
          // Distribute remaining space among items without data-size
          const extraPerItem = Math.floor(remainingSpace / expandableItems.length)
          let leftover = remainingSpace % expandableItems.length

          rowIndices.forEach((itemIndex) => {
            const item = items[itemIndex]
            let span = itemSizes[itemIndex]

            if (!item.dataset.size) {
              span += extraPerItem
              if (leftover > 0) {
                span += 1
                leftover--
              }
            }

            // Skip inline span for semantic values - CSS handles those
            if (!this.isSemanticSize(item.dataset.size)) {
              item.style.gridColumn = `span ${span}`
            }
          })
        } else {
          // All items have data-size - expand semantic items proportionally
          const semanticItems = rowIndices.filter((i) => this.isSemanticSize(items[i].dataset.size))

          if (semanticItems.length > 0) {
            // Distribute remaining space proportionally to semantic items
            const totalSemanticSize = semanticItems.reduce((sum, i) => sum + itemSizes[i], 0)
            let distributed = 0

            rowIndices.forEach((itemIndex, idx) => {
              const item = items[itemIndex]
              let span = itemSizes[itemIndex]

              if (this.isSemanticSize(item.dataset.size)) {
                // Calculate proportional extra space
                const proportion = span / totalSemanticSize
                const extra = Math.round(proportion * remainingSpace)

                // For last semantic item, give remainder to avoid rounding errors
                if (idx === rowIndices.length - 1) {
                  span += remainingSpace - distributed
                } else {
                  span += extra
                  distributed += extra
                }

                // Set inline span for semantic items when expanding
                item.style.gridColumn = `span ${span}`
              } else {
                // Numeric data-size items keep their size
                item.style.gridColumn = `span ${span}`
              }
            })
          } else {
            // All items have numeric data-size - just apply base spans
            rowIndices.forEach((itemIndex) => {
              const item = items[itemIndex]
              item.style.gridColumn = `span ${itemSizes[itemIndex]}`
            })
          }
        }
      } else {
        // Apply base spans (skip semantic values - CSS handles those)
        rowIndices.forEach((itemIndex) => {
          const item = items[itemIndex]
          if (!this.isSemanticSize(item.dataset.size)) {
            item.style.gridColumn = `span ${itemSizes[itemIndex]}`
          }
        })
      }
    })
  }

  private resolveToPixels(cssValue: string): number {
    const trimmed = cssValue.trim()
    const numericValue = parseFloat(trimmed)

    // Pure numeric value (no units)
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return numericValue
    }

    // Check cache to avoid layout thrashing
    if (this.resolvedValuesCache.has(trimmed)) {
      return this.resolvedValuesCache.get(trimmed)!
    }

    // Percentage units are calculated relative to body, not container - warn in dev
    if (trimmed.endsWith('%')) {
      console.warn(
        'smart-grid: Percentage units for --smart-grid-min-width are not fully supported. ' +
          'Use px, rem, em, or ch units instead.'
      )
    }

    // Create temp element to measure CSS value
    const temp = document.createElement('div')
    temp.style.cssText = `position:absolute;visibility:hidden;width:${trimmed};`

    // Copy individual font properties (font shorthand may return empty in some browsers)
    const styles = getComputedStyle(this)
    temp.style.fontSize = styles.fontSize
    temp.style.fontFamily = styles.fontFamily

    document.body.appendChild(temp)
    const pixels = temp.offsetWidth
    temp.remove()

    const result = pixels || numericValue || 200
    this.resolvedValuesCache.set(trimmed, result)
    return result
  }

  private setupObservers(): void {
    this.mutationObserver = new MutationObserver(() => {
      this.applyLayout()
    })
    this.mutationObserver.observe(this, {
      childList: true,
      attributes: true,
      subtree: true,
      attributeFilter: ['data-size'],
    })

    let timeout: ReturnType<typeof setTimeout>
    this.resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const width = entries[0]?.contentRect.width ?? this.clientWidth
        this.handleResize(width)
      }, 100)
    })
    this.resizeObserver.observe(this)
  }

  private handleResize(width: number): void {
    if (width <= 0) {
      this.applyLayout()
      return
    }

    // Calculate effective columns based on width
    // Resolve CSS custom properties to pixel values (supports ch, em, rem, etc.)
    const styles = getComputedStyle(this)
    const minItemWidth = this.resolveToPixels(styles.getPropertyValue('--smart-grid-min-width').trim() || '200px')
    const gap = this.resolveToPixels(styles.getPropertyValue('--smart-grid-gap').trim() || '1rem')

    // Calculate how many columns fit at current width
    const effectiveCols = Math.max(1, Math.floor((width + gap) / (minItemWidth + gap)))

    if (effectiveCols === 1) {
      if (!this.isSingleColumn) {
        this.isSingleColumn = true
        this.dataset.layout = 'single'
        this.clearItemSpans()
        this.setGridColumns(null)
      }
    } else {
      this.isSingleColumn = false
      delete this.dataset.layout
      // Apply layout with effective columns (capped by configured max)
      this.applyLayoutWithColumns(Math.min(effectiveCols, this.columns))
    }
  }

  private applyLayoutWithColumns(maxColumns: number): void {
    const items = this.getItems()
    const itemCount = items.length

    if (itemCount === 0) {
      this.computedColumns = 0
      this.gridColumns = 0
      this.style.removeProperty('--computed-columns')
      this.setGridColumns(null)
      return
    }

    // Handle expand/preserve modes with JavaScript spans
    if (this.balance === 'expand' || this.balance === 'preserve') {
      this.applyBalanceModeWithColumns(items, maxColumns)
      return
    }

    // When data-size items exist, use fixed grid mode
    const hasDataSizeItems = items.some((item) => item.dataset.size)
    if (hasDataSizeItems) {
      this.applyFixedGridWithSizes(items, maxColumns)
      return
    }

    const { gridColumns, spans } = calculateGridConfig(itemCount, maxColumns)
    const distribution = calculateRowDistribution(itemCount, maxColumns)

    const uniqueSizes = [...new Set(distribution)]
    const needsSmartDistribution = uniqueSizes.length > 1

    if (needsSmartDistribution) {
      this.gridColumns = gridColumns
      this.computedColumns = distribution[0]
      this.setGridColumns(gridColumns)
      this.style.setProperty('--computed-columns', this.computedColumns.toString())

      // Skip items with data-size attribute (CSS handles those)
      if (this.orphans === 'expand') {
        items.forEach((item, index) => {
          if (!item.dataset.size && spans[index]) {
            item.style.gridColumn = `span ${spans[index]}`
          }
        })
      } else {
        const fixedSpan = spans[0] || 1
        items.forEach((item) => {
          if (!item.dataset.size) {
            item.style.gridColumn = `span ${fixedSpan}`
          }
        })
      }
    } else {
      this.computedColumns = distribution[0] || maxColumns
      this.gridColumns = 0
      this.style.setProperty('--computed-columns', this.computedColumns.toString())
      this.setGridColumns(null)
      this.clearItemSpans()
    }
  }

  private applyBalanceModeWithColumns(items: HTMLElement[], maxColumns: number): void {
    this.computedColumns = 0
    this.style.setProperty('--max-columns', maxColumns.toString())
    this.style.removeProperty('--computed-columns')

    // If all items have data-size, let CSS handle everything
    const itemsWithoutSize = items.filter((item) => !item.dataset.size)
    if (itemsWithoutSize.length === 0) {
      this.gridColumns = 0
      this.setGridColumns(null)
      return
    }

    const itemCount = itemsWithoutSize.length
    const remainder = itemCount % maxColumns
    const orphanCount = remainder === 0 ? 0 : remainder
    const fullRowCount = Math.floor(itemCount / maxColumns)

    if (orphanCount === 0) {
      this.gridColumns = 0
      this.setGridColumns(null)
      this.clearItemSpans()
      return
    }

    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const lcm = (maxColumns * orphanCount) / gcd(maxColumns, orphanCount)

    this.gridColumns = lcm
    this.setGridColumns(lcm)

    const fullRowSpan = lcm / maxColumns
    const orphanSpan = this.balance === 'expand' ? lcm / orphanCount : fullRowSpan

    let regularItemIndex = 0
    items.forEach((item) => {
      if (item.dataset.size) {
        return
      }

      const isOrphan = regularItemIndex >= fullRowCount * maxColumns
      const span = isOrphan ? orphanSpan : fullRowSpan
      item.style.gridColumn = `span ${span}`
      regularItemIndex++
    })
  }

  getComputedColumns(): number {
    return this.computedColumns
  }
}

customElements.define('smart-grid', SmartGrid)

export { SmartGrid }
