import { describe, it, expect, beforeEach } from 'vitest'
import { applySpans, clearSpans } from './apply-spans'

describe('applySpans', () => {
  let items: HTMLElement[]

  beforeEach(() => {
    items = [document.createElement('div'), document.createElement('div'), document.createElement('div')]
  })

  it('applies span > 1 as gridColumn style', () => {
    applySpans(items, [2, 3, 1])
    expect(items[0].style.gridColumn).toBe('span 2')
    expect(items[1].style.gridColumn).toBe('span 3')
    expect(items[2].style.gridColumn).toBe('')
  })

  it('removes gridColumn for span = 1', () => {
    items[0].style.gridColumn = 'span 4'
    applySpans(items, [1])
    expect(items[0].style.gridColumn).toBe('')
  })

  it('handles empty arrays', () => {
    expect(() => applySpans([], [])).not.toThrow()
  })
})

describe('clearSpans', () => {
  it('removes gridColumn from all items', () => {
    const items = [document.createElement('div'), document.createElement('div')]
    items[0].style.gridColumn = 'span 2'
    items[1].style.gridColumn = 'span 3'

    clearSpans(items)

    expect(items[0].style.gridColumn).toBe('')
    expect(items[1].style.gridColumn).toBe('')
  })
})
