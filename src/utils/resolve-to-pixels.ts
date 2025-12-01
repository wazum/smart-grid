const PIXELS_PER_INCH = 96
const UNIT_PATTERN = /^(-?\d*\.?\d+)\s*(px|rem|em|vw|vh|vmin|vmax|cm|mm|in|pt|pc)?$/i

export interface UnitResolver {
  resolve(cssValue: string): number
  clearCache(): void
  readonly cacheSize: number
}

export function createUnitResolver(element: Element): UnitResolver {
  const cache = new Map<string, number>()

  return {
    resolve(cssValue: string): number {
      const trimmed = cssValue.trim()
      if (!trimmed) {
        return 0
      }

      const cached = cache.get(trimmed)
      if (cached !== undefined) {
        return cached
      }

      const result = resolveToPixels(trimmed, element)
      cache.set(trimmed, result)
      return result
    },

    clearCache(): void {
      cache.clear()
    },

    get cacheSize(): number {
      return cache.size
    },
  }
}

export function resolveToPixels(cssValue: string, element: Element): number {
  const trimmed = cssValue.trim()
  if (!trimmed) {
    return 0
  }

  const parsed = parseValue(trimmed)
  if (parsed) {
    const styles = getComputedStyle(element)
    const elementFontSize = parseFloat(styles.fontSize)
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)

    const result = convertDirect(parsed.value, parsed.unit, elementFontSize, rootFontSize)
    if (result !== null) {
      return result
    }
  }

  return measureWithDOM(trimmed, element)
}

function parseValue(cssValue: string): { value: number; unit: string } | null {
  const match = cssValue.match(UNIT_PATTERN)
  if (!match) {
    return null
  }

  return {
    value: parseFloat(match[1]),
    unit: (match[2] || '').toLowerCase(),
  }
}

function convertDirect(value: number, unit: string, elementFontSize: number, rootFontSize: number): number | null {
  switch (unit) {
    case '':
    case 'px':
      return value
    case 'rem':
      return value * rootFontSize
    case 'em':
      return value * elementFontSize
    case 'vw':
      return (value * window.innerWidth) / 100
    case 'vh':
      return (value * window.innerHeight) / 100
    case 'vmin':
      return (value * Math.min(window.innerWidth, window.innerHeight)) / 100
    case 'vmax':
      return (value * Math.max(window.innerWidth, window.innerHeight)) / 100
    case 'in':
      return value * PIXELS_PER_INCH
    case 'cm':
      return (value * PIXELS_PER_INCH) / 2.54
    case 'mm':
      return (value * PIXELS_PER_INCH) / 25.4
    case 'pt':
      return (value * PIXELS_PER_INCH) / 72
    case 'pc':
      return (value * PIXELS_PER_INCH) / 6
    default:
      return null
  }
}

function measureWithDOM(cssValue: string, element: Element): number {
  const styles = getComputedStyle(element)
  const temp = document.createElement('div')
  temp.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${cssValue};`
  temp.style.fontSize = styles.fontSize
  temp.style.fontFamily = styles.fontFamily

  document.body.appendChild(temp)
  const pixels = temp.offsetWidth
  temp.remove()

  return pixels
}
