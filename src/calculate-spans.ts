import type { Row, FillMode } from './types'

export function calculateSpans(rows: Row[], maxColumns: number, fill: FillMode, fillLast?: FillMode): number[] {
  if (rows.length === 0) {
    return []
  }

  const effectiveFillLast = fillLast ?? fill

  // Find reference row (densest row) for consistent sizing when fill-last differs from fill
  const maxRowLength = Math.max(...rows.map((row) => row.length))
  const referenceRow = rows.find((row) => row.length === maxRowLength)
  const referenceTotalSize = referenceRow ? referenceRow.reduce((sum, item) => sum + item.size, 0) : maxColumns

  return rows.flatMap((row, rowIndex) => {
    const isLastRow = rowIndex === rows.length - 1
    const mode = isLastRow ? effectiveFillLast : fill

    // fill-last="none" means keep same width as other rows, but don't expand
    // fill="none" (primary) means keep raw sizes
    const useReferenceSize = isLastRow && fillLast === 'none' && fill === 'equal-extra'

    return calculateRowSpans(row, maxColumns, mode, useReferenceSize ? referenceTotalSize : null)
  })
}

function calculateRowSpans(row: Row, maxColumns: number, mode: FillMode, referenceTotalSize: number | null): number[] {
  if (mode === 'none') {
    if (referenceTotalSize !== null) {
      // fill-last="none": use reference sizing for consistent width (intentionally leaves gap)
      const scaleFactor = maxColumns / referenceTotalSize
      return row.map((item) => Math.max(1, Math.round(item.size * scaleFactor)))
    }
    // fill="none": keep raw sizes
    return row.map((item) => item.size)
  }

  const totalSize = row.reduce((sum, item) => sum + item.size, 0)

  if (totalSize === 0) {
    return row.map(() => 1)
  }

  return distributeColumns(row, maxColumns, totalSize)
}

function distributeColumns(row: Row, maxColumns: number, totalSize: number): number[] {
  const scaleFactor = maxColumns / totalSize

  // Calculate exact (fractional) spans and floor values
  const exactSpans = row.map((item) => item.size * scaleFactor)
  const floorSpans = exactSpans.map((span) => Math.max(1, Math.floor(span)))

  // Calculate remainder to distribute
  let remainder = maxColumns - floorSpans.reduce((sum, span) => sum + span, 0)

  // Distribute remainder to items with largest fractional parts (largest remainder method)
  const fractionalParts = exactSpans.map((exact, i) => ({
    index: i,
    fraction: exact - Math.floor(exact),
  }))
  fractionalParts.sort((a, b) => b.fraction - a.fraction)

  const result = [...floorSpans]
  for (const { index } of fractionalParts) {
    if (remainder <= 0) break
    result[index]++
    remainder--
  }

  return result
}
