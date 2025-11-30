/**
 * Threshold for acceptable orphan ratio.
 * If orphans fill less than this percentage of a row, we redistribute.
 */
const BALANCE_THRESHOLD = 0.34

/**
 * Calculates smart row distribution to avoid bad orphans.
 *
 * Given N items and max M columns, returns an array of row sizes
 * that avoids single-item orphans while respecting max columns.
 *
 * Examples:
 * - 7 items, max 3 → [3, 2, 2] not [3, 3, 1]
 * - 10 items, max 3 → [3, 3, 2, 2] not [3, 3, 3, 1]
 *
 * @param itemCount - Total number of items
 * @param maxColumns - Maximum items per row
 * @returns Array of row sizes
 */
/**
 * Calculate Greatest Common Divisor using Euclidean algorithm.
 */
function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b)
}

/**
 * Calculate Least Common Multiple.
 */
function lcm(a: number, b: number): number {
    return (a * b) / gcd(a, b)
}

/**
 * Calculate LCM of multiple numbers.
 */
function lcmArray(numbers: number[]): number {
    return numbers.reduce((acc, n) => lcm(acc, n), 1)
}

/**
 * Calculate grid configuration for smart distribution.
 *
 * Returns:
 * - gridColumns: total columns for the grid (LCM of row sizes)
 * - spans: array of span values for each item
 *
 * Example for 7 items, max 3: distribution [3, 2, 2]
 * - gridColumns: 6 (LCM of 3, 2)
 * - spans: [2, 2, 2, 3, 3, 3, 3] (items 1-3 span 2, items 4-7 span 3)
 */
export function calculateGridConfig(itemCount: number, maxColumns: number): {
    gridColumns: number
    spans: number[]
} {
    const distribution = calculateRowDistribution(itemCount, maxColumns)

    if (distribution.length === 0) {
        return { gridColumns: maxColumns, spans: [] }
    }

    // Get unique row sizes
    const uniqueSizes = [...new Set(distribution)]

    // Calculate LCM of all row sizes
    const gridColumns = lcmArray(uniqueSizes)

    // Calculate span for each item
    const spans: number[] = []
    for (const rowSize of distribution) {
        const spanPerItem = gridColumns / rowSize
        for (let i = 0; i < rowSize; i++) {
            spans.push(spanPerItem)
        }
    }

    return { gridColumns, spans }
}

export function calculateRowDistribution(itemCount: number, maxColumns: number): number[] {
    if (itemCount === 0) {
        return []
    }

    if (maxColumns <= 0) {
        return []
    }

    // Single row case
    if (itemCount <= maxColumns) {
        return [itemCount]
    }

    // Calculate minimum rows needed
    const minRows = Math.ceil(itemCount / maxColumns)

    // Try to find optimal distribution
    // Strategy: prefer MORE full rows first (max columns at start), only balance tail
    for (let fullRows = minRows - 1; fullRows >= 0; fullRows--) {
        const itemsInFullRows = fullRows * maxColumns
        const remainingItems = itemCount - itemsInFullRows
        const remainingRows = minRows - fullRows

        if (remainingRows === 0) continue

        // Check if remaining items can be distributed across remaining rows
        const itemsPerRemainingRow = Math.ceil(remainingItems / remainingRows)

        if (itemsPerRemainingRow <= maxColumns) {
            // Build the distribution
            const rows: number[] = []

            // Add full rows first
            for (let i = 0; i < fullRows; i++) {
                rows.push(maxColumns)
            }

            // Distribute remaining items evenly across tail rows
            let left = remainingItems
            for (let i = 0; i < remainingRows; i++) {
                const rowSize = Math.ceil(left / (remainingRows - i))
                rows.push(rowSize)
                left -= rowSize
            }

            // Check if last row has acceptable orphan ratio
            const lastRow = rows[rows.length - 1]
            const orphanRatio = lastRow / maxColumns

            if (orphanRatio >= BALANCE_THRESHOLD || rows.length === 1) {
                return rows
            }
        }
    }

    // Fallback: simple fill
    const rows: number[] = []
    let remaining = itemCount
    while (remaining > 0) {
        const rowSize = Math.min(remaining, maxColumns)
        rows.push(rowSize)
        remaining -= rowSize
    }
    return rows
}
