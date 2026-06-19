import type { Node, Edge } from '@xyflow/svelte'

export interface ProductNodeData extends Record<string, unknown> {
  id: string
  code: string
  name: string
  category: string
  isActive: boolean
}

export interface RuleNodeData extends Record<string, unknown> {
  id: string
  productId: string
  code: string
  label: string
  type: string
  field: string
  operator: string
  value: number
  valueMin: number | null
  valueMax: number | null
  percentage: number | null
  flatAmount: number | null
  minAmount: number | null
  maxAmount: number | null
  currency: string | null
  period: string | null
  weight: number
  priority: number
  description: string
  isActive: boolean
}

export type CustomNode = Node<ProductNodeData, 'product'> | Node<RuleNodeData, 'rule'>
export type CustomEdge = Edge
