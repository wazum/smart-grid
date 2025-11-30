import { describe, it, expect } from 'vitest'
import { calculateRowDistribution, calculateGridConfig } from './distribute'

/**
 * Smart row distribution algorithm.
 *
 * Given N items and max M columns, calculate optimal row distribution
 * to avoid bad orphans (single items) while keeping max columns constraint.
 *
 * Examples:
 * - 7 items, max 3 → [3, 2, 2] not [3, 3, 1]
 * - 10 items, max 3 → [3, 3, 2, 2] not [3, 3, 3, 1]
 * - 13 items, max 4 → [4, 4, 3, 2] not [4, 4, 4, 1]
 */

describe('calculateRowDistribution', () => {
    describe('perfect fit (no redistribution needed)', () => {
        it('returns single row for items <= maxColumns', () => {
            expect(calculateRowDistribution(3, 3)).toEqual([3])
            expect(calculateRowDistribution(2, 3)).toEqual([2])
            expect(calculateRowDistribution(1, 3)).toEqual([1])
        })

        it('returns even rows when items divide perfectly', () => {
            expect(calculateRowDistribution(6, 3)).toEqual([3, 3])
            expect(calculateRowDistribution(9, 3)).toEqual([3, 3, 3])
            expect(calculateRowDistribution(12, 4)).toEqual([4, 4, 4])
        })
    })

    describe('acceptable orphan ratio (>= 34%)', () => {
        it('keeps 5 items as 3+2 (66% fill)', () => {
            expect(calculateRowDistribution(5, 3)).toEqual([3, 2])
        })

        it('keeps 8 items as 3+3+2 (66% fill)', () => {
            expect(calculateRowDistribution(8, 3)).toEqual([3, 3, 2])
        })

        it('keeps 7 items in 4-col as 4+3 (75% fill)', () => {
            expect(calculateRowDistribution(7, 4)).toEqual([4, 3])
        })
    })

    describe('bad orphan - smart redistribution', () => {
        it('redistributes 7 items in 3-col to 3+2+2 (not 3+3+1)', () => {
            // 7 % 3 = 1 → single orphan is bad
            // Smart: 3 + 2 + 2 = 7
            expect(calculateRowDistribution(7, 3)).toEqual([3, 2, 2])
        })

        it('redistributes 10 items in 3-col to 3+3+2+2 (not 3+3+3+1)', () => {
            // 10 % 3 = 1 → single orphan is bad
            // Smart: 3 + 3 + 2 + 2 = 10
            expect(calculateRowDistribution(10, 3)).toEqual([3, 3, 2, 2])
        })

        it('redistributes 13 items in 4-col to 4+4+3+2 (max first, balance tail)', () => {
            // 13 % 4 = 1 → single orphan is bad
            // Smart: keep max columns first, balance only tail
            // 4 + 4 + 3 + 2 = 13 (2 full rows, then balanced 3+2)
            expect(calculateRowDistribution(13, 4)).toEqual([4, 4, 3, 2])
        })

        it('redistributes 4 items in 3-col to 2+2 (not 3+1)', () => {
            // 4 % 3 = 1 → single orphan is bad
            // Smart: 2 + 2 = 4
            expect(calculateRowDistribution(4, 3)).toEqual([2, 2])
        })
    })

    describe('edge cases', () => {
        it('handles empty grid', () => {
            expect(calculateRowDistribution(0, 3)).toEqual([])
        })

        it('handles maxColumns of 1', () => {
            expect(calculateRowDistribution(5, 1)).toEqual([1, 1, 1, 1, 1])
        })

        it('handles maxColumns of 2', () => {
            // 3 items, max 2: 3 % 2 = 1 (50% acceptable)
            expect(calculateRowDistribution(3, 2)).toEqual([2, 1])
        })
    })

    describe('constraint: never exceeds maxColumns per row', () => {
        it('no row exceeds maxColumns', () => {
            const testCases = [
                { items: 7, max: 3 },
                { items: 10, max: 3 },
                { items: 13, max: 4 },
                { items: 100, max: 5 },
            ]

            for (const { items, max } of testCases) {
                const distribution = calculateRowDistribution(items, max)
                for (const rowCount of distribution) {
                    expect(rowCount).toBeLessThanOrEqual(max)
                }
                // Also verify total items
                expect(distribution.reduce((a, b) => a + b, 0)).toBe(items)
            }
        })
    })
})
