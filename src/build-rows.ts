import type { Row, RowItem } from './types'

export function buildRows(sizes: number[], maxColumns: number): Row[] {
  if (sizes.length === 0) {
    return []
  }

  const isUniform = sizes.every((s) => s === sizes[0])
  if (isUniform && sizes[0] === 1) {
    return buildBalancedRows(sizes, maxColumns)
  }

  return buildGreedyRows(sizes, maxColumns)
}

function buildGreedyRows(sizes: number[], maxColumns: number): Row[] {
  const rows: Row[] = []
  let currentRow: RowItem[] = []
  let currentRowSize = 0

  sizes.forEach((size, index) => {
    if (currentRowSize + size > maxColumns) {
      if (currentRow.length > 0) {
        rows.push(currentRow)
      }
      currentRow = []
      currentRowSize = 0
    }
    currentRow.push({ index, size })
    currentRowSize += size
  })

  if (currentRow.length > 0) {
    rows.push(currentRow)
  }

  return rows
}

function buildBalancedRows(sizes: number[], maxColumns: number): Row[] {
  const itemCount = sizes.length

  if (itemCount <= maxColumns) {
    return [sizes.map((size, index) => ({ index, size }))]
  }

  const minRows = Math.ceil(itemCount / maxColumns)
  const distribution = calculateBalancedDistribution(itemCount, maxColumns, minRows)

  const rows: Row[] = []
  let itemIndex = 0

  for (const rowSize of distribution) {
    const row: RowItem[] = []
    for (let i = 0; i < rowSize; i++) {
      row.push({ index: itemIndex, size: sizes[itemIndex] })
      itemIndex++
    }
    rows.push(row)
  }

  return rows
}

function calculateBalancedDistribution(items: number, cols: number, minRows: number): number[] {
  for (let fullRows = minRows - 1; fullRows >= 0; fullRows--) {
    const result = tryDistribution(items, cols, minRows, fullRows)
    if (result.length && isBalanced(result, cols)) {
      return result
    }
  }
  return fillGreedy(items, cols)
}

function tryDistribution(items: number, cols: number, minRows: number, fullRows: number): number[] {
  const itemsInFullRows = fullRows * cols
  const remainingItems = items - itemsInFullRows
  const remainingRows = minRows - fullRows

  if (remainingRows <= 0 || remainingItems < 0) {
    return []
  }

  const itemsPerRemainingRow = Math.ceil(remainingItems / remainingRows)
  if (itemsPerRemainingRow > cols) {
    return []
  }

  const rows = Array(fullRows).fill(cols) as number[]
  return rows.concat(distributeRemaining(remainingItems, remainingRows))
}

function distributeRemaining(items: number, rows: number): number[] {
  const distribution: number[] = []
  let remaining = items

  for (let i = 0; i < rows; i++) {
    const rowSize = Math.ceil(remaining / (rows - i))
    distribution.push(rowSize)
    remaining -= rowSize
  }

  return distribution
}

function isBalanced(rows: number[], cols: number): boolean {
  if (!rows.length) {
    return false
  }
  const lastRow = rows[rows.length - 1]
  return rows.length === 1 || lastRow / cols >= 0.34
}

function fillGreedy(items: number, cols: number): number[] {
  const rows: number[] = []
  let remaining = items

  while (remaining > 0) {
    const rowSize = Math.min(remaining, cols)
    rows.push(rowSize)
    remaining -= rowSize
  }

  return rows
}
