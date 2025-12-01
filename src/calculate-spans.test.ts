import { describe, it, expect } from 'vitest'
import { calculateSpans } from './calculate-spans'
import type { Row } from './types'

describe('calculateSpans', () => {
  describe('equal-extra mode', () => {
    it('[1,1] in 4 cols → [2,2]', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
        ],
      ]
      expect(calculateSpans(rows, 4, 'equal-extra')).toEqual([2, 2])
    })

    it('[1,2] in 6 cols → [2,4] (maintain ratio, distribute slack)', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 2 },
        ],
      ]
      expect(calculateSpans(rows, 6, 'equal-extra')).toEqual([2, 4])
    })

    it('[1,1,1] in 3 cols → [1,1,1] (no slack)', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
          { index: 2, size: 1 },
        ],
      ]
      expect(calculateSpans(rows, 3, 'equal-extra')).toEqual([1, 1, 1])
    })

    it('multiple rows distribute independently', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
          { index: 2, size: 1 },
        ],
        [
          { index: 3, size: 1 },
          { index: 4, size: 1 },
        ],
      ]
      expect(calculateSpans(rows, 6, 'equal-extra')).toEqual([2, 2, 2, 3, 3])
    })

    it('[1,1,1,1] in 6 cols → [2,2,2] + remainder handled', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 2 },
        ],
      ]
      // Total size: 3, slack: 3 in 6 cols
      // Each unit gets 6/3 = 2 cols
      expect(calculateSpans(rows, 6, 'equal-extra')).toEqual([2, 4])
    })
  })

  describe('none mode', () => {
    it('[1,1] in 4 cols → [1,1] (no expansion)', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
        ],
      ]
      expect(calculateSpans(rows, 4, 'none')).toEqual([1, 1])
    })

    it('[1,2] in 6 cols → [1,2] (preserve sizes)', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 2 },
        ],
      ]
      expect(calculateSpans(rows, 6, 'none')).toEqual([1, 2])
    })

    it('multiple rows preserve sizes', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 2 },
        ],
        [{ index: 2, size: 3 }],
      ]
      expect(calculateSpans(rows, 6, 'none')).toEqual([1, 2, 3])
    })
  })

  describe('fill-last override', () => {
    it('5 items: last row keeps same width, does not expand', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
          { index: 2, size: 1 },
        ],
        [
          { index: 3, size: 1 },
          { index: 4, size: 1 },
        ],
      ]
      // fill=equal-extra, fill-last=none
      // First row: 3 items get span 2 each (6/3=2)
      // Last row: items keep same width (span 2), leaving gap
      expect(calculateSpans(rows, 6, 'equal-extra', 'none')).toEqual([2, 2, 2, 2, 2])
    })

    it('7 items: middle row expands, last row keeps same width', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
          { index: 2, size: 1 },
        ],
        [
          { index: 3, size: 1 },
          { index: 4, size: 1 },
        ],
        [
          { index: 5, size: 1 },
          { index: 6, size: 1 },
        ],
      ]
      // fill=equal-extra, fill-last=none with 7 items [3, 2, 2]
      // Row 1 (3 items): span 2 each (6/3=2)
      // Row 2 (2 items, NOT last): span 3 each (6/2=3, expanded)
      // Row 3 (2 items, last): span 2 each (same as row 1, NOT expanded)
      expect(calculateSpans(rows, 6, 'equal-extra', 'none')).toEqual([2, 2, 2, 3, 3, 2, 2])
    })

    it('fillLast defaults to fill when not specified', () => {
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
        ],
        [{ index: 2, size: 1 }],
      ]
      expect(calculateSpans(rows, 6, 'equal-extra')).toEqual([3, 3, 6])
    })
  })

  describe('span sum integrity', () => {
    it('[3,1] in 6 cols → spans must sum to exactly 6 (no gaps)', () => {
      // Bug: Math.round(3*1.5)=5 + Math.round(1*1.5)=2 = 7 ≠ 6
      // This causes CSS Grid gaps because spans overflow
      const rows: Row[] = [
        [
          { index: 0, size: 3 },
          { index: 1, size: 1 },
        ],
      ]
      const spans = calculateSpans(rows, 6, 'equal-extra')
      expect(spans.reduce((sum, s) => sum + s, 0)).toBe(6)
    })

    it('mixed sizes: all row spans must sum to maxColumns', () => {
      // Simulates: 4 columns, items [sm, sm, lg, sm] → rows [[0,1], [2,3]]
      // Row 1: sizes [1,1], total=2, in 6 cols
      // Row 2: sizes [3,1], total=4, in 6 cols → must sum to 6
      const rows: Row[] = [
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
        ],
        [
          { index: 2, size: 3 },
          { index: 3, size: 1 },
        ],
      ]
      const spans = calculateSpans(rows, 6, 'equal-extra')

      // Row 1 spans
      const row1Sum = spans[0] + spans[1]
      expect(row1Sum).toBe(6)

      // Row 2 spans
      const row2Sum = spans[2] + spans[3]
      expect(row2Sum).toBe(6)
    })
  })

  describe('edge cases', () => {
    it('empty rows → []', () => {
      expect(calculateSpans([], 6, 'equal-extra')).toEqual([])
    })

    it('single item fills row in equal-extra', () => {
      const rows: Row[] = [[{ index: 0, size: 1 }]]
      expect(calculateSpans(rows, 6, 'equal-extra')).toEqual([6])
    })

    it('single item keeps size in none mode', () => {
      const rows: Row[] = [[{ index: 0, size: 2 }]]
      expect(calculateSpans(rows, 6, 'none')).toEqual([2])
    })
  })
})
