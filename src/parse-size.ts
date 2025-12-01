import { SIZE_UNITS, type SemanticSize } from './types'

export function parseSize(element: HTMLElement, maxColumns: number): number {
  const sizeAttr = element.dataset.size as SemanticSize | undefined
  const units = SIZE_UNITS[sizeAttr as SemanticSize] ?? 1
  return Math.min(units, maxColumns)
}
