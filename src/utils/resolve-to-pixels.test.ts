import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resolveToPixels, createUnitResolver } from './resolve-to-pixels'

describe('resolveToPixels', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  describe('empty and invalid values', () => {
    it('returns 0 for empty string', () => {
      expect(resolveToPixels('', container)).toBe(0)
    })

    it('returns 0 for whitespace-only string', () => {
      expect(resolveToPixels('   ', container)).toBe(0)
    })
  })

  describe('unitless numbers', () => {
    it('returns numeric value for plain number', () => {
      expect(resolveToPixels('42', container)).toBe(42)
    })

    it('handles decimal numbers', () => {
      expect(resolveToPixels('16.5', container)).toBe(16.5)
    })

    it('handles negative numbers', () => {
      expect(resolveToPixels('-10', container)).toBe(-10)
    })
  })

  describe('pixel values', () => {
    it('returns numeric value for px unit', () => {
      expect(resolveToPixels('100px', container)).toBe(100)
    })

    it('handles decimal px values', () => {
      expect(resolveToPixels('12.5px', container)).toBe(12.5)
    })

    it('handles negative px values', () => {
      expect(resolveToPixels('-20px', container)).toBe(-20)
    })
  })

  describe('rem values', () => {
    it('converts rem to pixels using root font size', () => {
      document.documentElement.style.fontSize = '16px'
      expect(resolveToPixels('2rem', container)).toBe(32)
    })

    it('handles decimal rem values', () => {
      document.documentElement.style.fontSize = '16px'
      expect(resolveToPixels('1.5rem', container)).toBe(24)
    })

    afterEach(() => {
      document.documentElement.style.fontSize = ''
    })
  })

  describe('em values', () => {
    it('converts em to pixels using element font size', () => {
      container.style.fontSize = '20px'
      expect(resolveToPixels('2em', container)).toBe(40)
    })

    it('handles decimal em values', () => {
      container.style.fontSize = '16px'
      expect(resolveToPixels('1.25em', container)).toBe(20)
    })
  })

  describe('viewport units', () => {
    beforeEach(() => {
      vi.stubGlobal('innerWidth', 1000)
      vi.stubGlobal('innerHeight', 800)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('converts vw to pixels', () => {
      expect(resolveToPixels('10vw', container)).toBe(100)
    })

    it('converts vh to pixels', () => {
      expect(resolveToPixels('50vh', container)).toBe(400)
    })

    it('converts vmin to pixels', () => {
      expect(resolveToPixels('10vmin', container)).toBe(80)
    })

    it('converts vmax to pixels', () => {
      expect(resolveToPixels('10vmax', container)).toBe(100)
    })
  })

  describe('absolute units', () => {
    it('converts cm to pixels', () => {
      const result = resolveToPixels('1cm', container)
      expect(result).toBeCloseTo(37.795, 1)
    })

    it('converts mm to pixels', () => {
      const result = resolveToPixels('10mm', container)
      expect(result).toBeCloseTo(37.795, 1)
    })

    it('converts in to pixels', () => {
      expect(resolveToPixels('1in', container)).toBe(96)
    })

    it('converts pt to pixels', () => {
      const result = resolveToPixels('12pt', container)
      expect(result).toBeCloseTo(16, 0)
    })

    it('converts pc to pixels', () => {
      expect(resolveToPixels('1pc', container)).toBe(16)
    })
  })

  describe('complex values (DOM fallback)', () => {
    it('falls back to DOM measurement for calc()', () => {
      const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        get() {
          return this.style.width === 'calc(100px + 1rem)' ? 116 : 0
        },
      })

      const result = resolveToPixels('calc(100px + 1rem)', container)
      expect(result).toBe(116)

      if (originalOffsetWidth) {
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
      }
    })

    it('falls back to DOM measurement for ch unit', () => {
      const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        get() {
          return this.style.width === '10ch' ? 80 : 0
        },
      })

      const result = resolveToPixels('10ch', container)
      expect(result).toBe(80)

      if (originalOffsetWidth) {
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
      }
    })

    it('applies font styles to temp element for accurate measurement', () => {
      container.style.fontSize = '20px'
      container.style.fontFamily = 'Arial'

      let capturedFontSize = ''
      let capturedFontFamily = ''
      const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        configurable: true,
        get() {
          capturedFontSize = this.style.fontSize
          capturedFontFamily = this.style.fontFamily
          return 100
        },
      })

      resolveToPixels('10ch', container)

      expect(capturedFontSize).toBe('20px')
      expect(capturedFontFamily).toBe('Arial')

      if (originalOffsetWidth) {
        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth)
      }
    })
  })
})

describe('createUnitResolver', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('caches resolved values', () => {
    const resolver = createUnitResolver(container)
    document.documentElement.style.fontSize = '16px'

    const first = resolver.resolve('2rem')
    const second = resolver.resolve('2rem')

    expect(first).toBe(second)
    expect(first).toBe(32)

    document.documentElement.style.fontSize = ''
  })

  it('clears cache on demand', () => {
    const resolver = createUnitResolver(container)
    document.documentElement.style.fontSize = '16px'

    resolver.resolve('2rem')
    resolver.clearCache()
    document.documentElement.style.fontSize = '20px'

    const result = resolver.resolve('2rem')
    expect(result).toBe(40)

    document.documentElement.style.fontSize = ''
  })

  it('returns cache size', () => {
    const resolver = createUnitResolver(container)
    document.documentElement.style.fontSize = '16px'

    resolver.resolve('1rem')
    resolver.resolve('2rem')
    resolver.resolve('1rem')

    expect(resolver.cacheSize).toBe(2)

    document.documentElement.style.fontSize = ''
  })
})
