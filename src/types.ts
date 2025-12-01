export type FillMode = 'equal-extra' | 'none'
export type SemanticSize = 'small' | 'medium' | 'large'

export const SIZE_UNITS: Record<SemanticSize, number> = {
  small: 1,
  medium: 2,
  large: 3,
}

export interface RowItem {
  index: number
  size: number
}

export type Row = RowItem[]
