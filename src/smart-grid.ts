import { parseSize } from './parse-size'
import { buildRows } from './build-rows'
import { calculateSpans } from './calculate-spans'
import { applySpans, clearSpans } from './apply-spans'
import { createUnitResolver, type UnitResolver } from './utils/resolve-to-pixels'
import type { FillMode, Row } from './types'

const MAX_COLUMNS = 12
const DEFAULT_COLUMNS = 3

class SmartGrid extends HTMLElement {
  static observedAttributes = ['columns', 'fill', 'fill-last']

  private mutationObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private unitResolver: UnitResolver | null = null
  private effectiveColumnsValue = 0
  private lastCssProps = ''

  connectedCallback(): void {
    this.unitResolver = createUnitResolver(this)
    this.syncColumnsProperty()
    this.setupObservers()
    this.applyLayout()
  }

  disconnectedCallback(): void {
    this.mutationObserver?.disconnect()
    this.mutationObserver = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.unitResolver = null
    window.visualViewport?.removeEventListener('resize', this.handleViewportResize)
  }

  attributeChangedCallback(): void {
    this.syncColumnsProperty()
    this.applyLayout()
  }

  get columns(): number {
    const attr = this.getAttribute('columns')
    const parsed = attr ? parseInt(attr, 10) : DEFAULT_COLUMNS
    const value = isNaN(parsed) ? DEFAULT_COLUMNS : parsed
    return Math.max(1, Math.min(MAX_COLUMNS, value))
  }

  get fill(): FillMode {
    return this.getAttribute('fill') === 'none' ? 'none' : 'equal-extra'
  }

  get fillLast(): FillMode {
    const attr = this.getAttribute('fill-last')
    if (attr === 'none') {
      return 'none'
    }
    if (attr === 'equal-extra') {
      return 'equal-extra'
    }
    return this.fill
  }

  get effectiveColumns(): number {
    return this.effectiveColumnsValue
  }

  private applyLayout(width?: number): void {
    const items = this.getItems()

    if (items.length === 0) {
      this.style.removeProperty('--grid-columns')
      this.effectiveColumnsValue = 0
      return
    }

    const containerWidth = width ?? this.clientWidth
    const maxColumns = this.calculateEffectiveColumns(containerWidth, items)
    this.effectiveColumnsValue = maxColumns

    const sizes = items.map((item) => parseSize(item, maxColumns))
    const rows = buildRows(sizes, maxColumns)

    this.applyLayoutWithRows(items, rows)
  }

  private applyLayoutWithRows(items: HTMLElement[], rows: Row[]): void {
    const uniqueRowSizes = [...new Set(rows.map((row) => row.length))]
    const allItemsSameSize = rows.flat().every((item) => item.size === 1)

    const fillLastDiffers = this.fillLast !== this.fill
    if (uniqueRowSizes.length === 1 && allItemsSameSize && this.fill === 'equal-extra' && !fillLastDiffers) {
      const uniformSize = uniqueRowSizes[0]
      if (uniformSize === this.columns) {
        this.style.removeProperty('--grid-columns')
      } else {
        this.style.setProperty('--grid-columns', uniformSize.toString())
      }
      clearSpans(items)
      return
    }

    if (this.fill === 'none') {
      const maxRowTotal = Math.max(...rows.map((row) => row.reduce((sum, item) => sum + item.size, 0)))
      this.style.setProperty('--grid-columns', maxRowTotal.toString())
      clearSpans(items)
      return
    }

    const gridColumns = calculateGridColumns(rows)
    this.style.setProperty('--grid-columns', gridColumns.toString())

    const spans = calculateSpans(rows, gridColumns, this.fill, this.fillLast)
    applySpans(items, spans)
  }

  private setupObservers(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      const hasAttributeChange = mutations.some((m) => m.type === 'attributes')
      if (hasAttributeChange) {
        this.unitResolver?.clearCache()
      }
      this.applyLayout()
    })
    this.mutationObserver.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-size'],
    })

    let resizeTimeout: ReturnType<typeof setTimeout>
    this.resizeObserver = new ResizeObserver((entries) => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        const width = entries[0]?.contentRect.width ?? this.clientWidth
        this.handleResize(width)
      }, 50)
    })
    this.resizeObserver.observe(this)

    window.visualViewport?.addEventListener('resize', this.handleViewportResize)
  }

  private handleViewportResize = (): void => {
    this.unitResolver?.clearCache()
    this.applyLayout()
  }

  private handleResize(width: number): void {
    this.unitResolver?.clearCache()
    this.applyLayout(width)
  }

  private syncColumnsProperty(): void {
    this.style.setProperty('--columns', this.columns.toString())
  }

  private getItems(): HTMLElement[] {
    return Array.from(this.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  }

  private calculateEffectiveColumns(width: number, items: HTMLElement[]): number {
    if (width <= 0 || !this.unitResolver) {
      return this.columns
    }

    const minWidths = this.getMinWidthConfig()
    if (!minWidths) {
      return this.columns
    }

    this.invalidateCacheIfStylesChanged(minWidths)

    const gap = this.resolveGap(minWidths)
    const sizesPresent = this.collectItemSizes(items)
    const minWidthPerUnit = this.calculateMinWidthPerUnit(minWidths, sizesPresent)

    if (minWidthPerUnit === 0) {
      return this.columns
    }

    return this.fitColumnsToWidth(width, gap, minWidthPerUnit)
  }

  private getMinWidthConfig(): MinWidthConfig | null {
    const styles = getComputedStyle(this)
    const small = styles.getPropertyValue('--smart-grid-min-width').trim()
    const medium = styles.getPropertyValue('--smart-grid-min-width-medium').trim()
    const large = styles.getPropertyValue('--smart-grid-min-width-large').trim()

    if (!small && !medium && !large) {
      return null
    }

    return {
      small,
      medium,
      large,
      gap: styles.getPropertyValue('--smart-grid-gap').trim(),
      computedColumnGap: styles.columnGap,
      fontSize: styles.fontSize,
      rootFontSize: getComputedStyle(document.documentElement).fontSize,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }
  }

  private invalidateCacheIfStylesChanged(config: MinWidthConfig): void {
    const cacheKey = `${config.small}|${config.medium}|${config.large}|${config.gap}|${config.computedColumnGap}|${config.fontSize}|${config.rootFontSize}|${config.viewportWidth}|${config.viewportHeight}`
    if (cacheKey !== this.lastCssProps) {
      this.unitResolver!.clearCache()
      this.lastCssProps = cacheKey
    }
  }

  private resolveGap(config: MinWidthConfig): number {
    if (config.gap) {
      return this.unitResolver!.resolve(config.gap)
    }
    return parseFloat(config.computedColumnGap) || 0
  }

  private collectItemSizes(items: HTMLElement[]): Set<string> {
    return new Set(items.map((item) => item.dataset.size || 'small'))
  }

  private calculateMinWidthPerUnit(config: MinWidthConfig, sizesPresent: Set<string>): number {
    let maxMinWidthPerUnit = 0

    if (config.small) {
      maxMinWidthPerUnit = this.unitResolver!.resolve(config.small)
    }

    if (sizesPresent.has('medium') && config.medium) {
      const perUnit = this.unitResolver!.resolve(config.medium) / 2
      maxMinWidthPerUnit = Math.max(maxMinWidthPerUnit, perUnit)
    }

    if (sizesPresent.has('large') && config.large) {
      const perUnit = this.unitResolver!.resolve(config.large) / 3
      maxMinWidthPerUnit = Math.max(maxMinWidthPerUnit, perUnit)
    }

    return maxMinWidthPerUnit
  }

  private fitColumnsToWidth(width: number, gap: number, minWidthPerUnit: number): number {
    const columnsThatFit = Math.floor((width + gap) / (minWidthPerUnit + gap))
    return Math.min(Math.max(1, columnsThatFit), this.columns)
  }
}

interface MinWidthConfig {
  small: string
  medium: string
  large: string
  gap: string
  computedColumnGap: string
  fontSize: string
  rootFontSize: string
  viewportWidth: number
  viewportHeight: number
}

function calculateGridColumns(rows: Row[]): number {
  const rowLengths = rows.map((row) => row.length)
  const rowTotals = rows.map((row) => row.reduce((sum, item) => sum + item.size, 0))

  const allSameLength = rowLengths.every((len) => len === rowLengths[0])
  if (allSameLength) {
    return Math.max(...rowTotals)
  }

  return rowLengths.reduce((acc, len) => leastCommonMultiple(acc, len), 1)
}

function leastCommonMultiple(a: number, b: number): number {
  return (a * b) / greatestCommonDivisor(a, b)
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b)
}

customElements.define('smart-grid', SmartGrid)

export { SmartGrid }
