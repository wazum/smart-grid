import { describe, it, expect } from 'vitest'
import { parseSize } from './parse-size'

describe('parseSize', () => {
  function createElement(size?: string): HTMLElement {
    const el = document.createElement('div')
    if (size) {
      el.dataset.size = size
    }
    return el
  }

  it('small → 1', () => {
    expect(parseSize(createElement('small'), 3)).toBe(1)
  })

  it('medium → 2', () => {
    expect(parseSize(createElement('medium'), 3)).toBe(2)
  })

  it('large → 3', () => {
    expect(parseSize(createElement('large'), 3)).toBe(3)
  })

  it('undefined → 1', () => {
    expect(parseSize(createElement(), 3)).toBe(1)
  })

  it('invalid → 1', () => {
    expect(parseSize(createElement('invalid'), 3)).toBe(1)
    expect(parseSize(createElement('xl'), 3)).toBe(1)
    expect(parseSize(createElement(''), 3)).toBe(1)
  })

  it('large capped to maxColumns=2 → 2', () => {
    expect(parseSize(createElement('large'), 2)).toBe(2)
  })

  it('medium capped to maxColumns=1 → 1', () => {
    expect(parseSize(createElement('medium'), 1)).toBe(1)
  })
})
