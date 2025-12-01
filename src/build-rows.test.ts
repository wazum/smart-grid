import { describe, it, expect } from 'vitest'
import { buildRows } from './build-rows'

describe('buildRows', () => {
  describe('basic placement', () => {
    it('[1,1,1] in 3 cols → [[0,1,2]]', () => {
      const result = buildRows([1, 1, 1], 3)
      expect(result).toEqual([
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
          { index: 2, size: 1 },
        ],
      ])
    })

    it('[1,1,1,1] in 3 cols → [[0,1], [2,3]] (balanced)', () => {
      const result = buildRows([1, 1, 1, 1], 3)
      expect(result).toEqual([
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
        ],
        [
          { index: 2, size: 1 },
          { index: 3, size: 1 },
        ],
      ])
    })

    it('[2,2] in 3 cols → [[0], [1]]', () => {
      const result = buildRows([2, 2], 3)
      expect(result).toEqual([[{ index: 0, size: 2 }], [{ index: 1, size: 2 }]])
    })

    it('[1,2,1] in 3 cols → [[0,1], [2]]', () => {
      const result = buildRows([1, 2, 1], 3)
      expect(result).toEqual([
        [
          { index: 0, size: 1 },
          { index: 1, size: 2 },
        ],
        [{ index: 2, size: 1 }],
      ])
    })
  })

  describe('balanced distribution (uniform items)', () => {
    it('[1,1,1,1,1,1,1] in 3 cols → [[0,1,2], [3,4], [5,6]]', () => {
      const result = buildRows([1, 1, 1, 1, 1, 1, 1], 3)
      expect(result).toEqual([
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
      ])
    })

    it('5 uniform items in 3 cols → [[0,1,2], [3,4]]', () => {
      const result = buildRows([1, 1, 1, 1, 1], 3)
      expect(result).toEqual([
        [
          { index: 0, size: 1 },
          { index: 1, size: 1 },
          { index: 2, size: 1 },
        ],
        [
          { index: 3, size: 1 },
          { index: 4, size: 1 },
        ],
      ])
    })
  })

  describe('mixed sizes', () => {
    it('[1,2,1,1] in 4 cols → [[0,1,2], [3]] (greedy: 1+2+1=4)', () => {
      const result = buildRows([1, 2, 1, 1], 4)
      expect(result).toEqual([
        [
          { index: 0, size: 1 },
          { index: 1, size: 2 },
          { index: 2, size: 1 },
        ],
        [{ index: 3, size: 1 }],
      ])
    })

    it('[3,1,1] in 4 cols → [[0,1], [2]]', () => {
      const result = buildRows([3, 1, 1], 4)
      expect(result).toEqual([
        [
          { index: 0, size: 3 },
          { index: 1, size: 1 },
        ],
        [{ index: 2, size: 1 }],
      ])
    })
  })

  describe('invariants', () => {
    it('all items appear exactly once', () => {
      const sizes = [1, 2, 1, 3, 1]
      const result = buildRows(sizes, 4)
      const indices = result.flat().map((item) => item.index)
      expect(indices.sort()).toEqual([0, 1, 2, 3, 4])
    })

    it('no row exceeds maxColumns', () => {
      const sizes = [2, 2, 3, 1, 1]
      const result = buildRows(sizes, 4)
      for (const row of result) {
        const rowTotal = row.reduce((sum, item) => sum + item.size, 0)
        expect(rowTotal).toBeLessThanOrEqual(4)
      }
    })

    it('items maintain order', () => {
      const sizes = [1, 2, 1, 1]
      const result = buildRows(sizes, 3)
      const indices = result.flat().map((item) => item.index)
      expect(indices).toEqual([0, 1, 2, 3])
    })
  })

  describe('edge cases', () => {
    it('empty sizes → []', () => {
      expect(buildRows([], 3)).toEqual([])
    })

    it('single item → [[0]]', () => {
      expect(buildRows([1], 3)).toEqual([[{ index: 0, size: 1 }]])
    })

    it('item equals maxColumns fills row alone', () => {
      expect(buildRows([3], 3)).toEqual([[{ index: 0, size: 3 }]])
    })
  })
})
