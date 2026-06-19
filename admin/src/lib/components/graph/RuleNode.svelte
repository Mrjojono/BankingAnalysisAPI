<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps, Node } from '@xyflow/svelte'
  import type { RuleNodeData } from './types'

  let {
    data = {} as RuleNodeData,
    selected = false,
    dragging = false,
  }: NodeProps<Node<RuleNodeData>> = $props()

  const TYPE_LABELS: Record<string, string> = {
    ELIGIBILITY: 'Éligibilité',
    FEE: 'Frais',
    LIMIT: 'Limite',
    INTEREST: 'Intérêt',
    VALUE_DATE: 'Dt valeur',
  }
  const TYPE_COLORS: Record<string, string> = {
    ELIGIBILITY: '#3B82F6',
    FEE: '#EF4444',
    LIMIT: '#F59E0B',
    INTEREST: '#8B5CF6',
    VALUE_DATE: '#06B6D4',
  }
  const OPERATOR_LABELS: Record<string, string> = {
    GREATER_THAN: '>',
    LESS_THAN: '<',
    EQUALS: '=',
    GREATER_OR_EQUAL: '≥',
    LESS_OR_EQUAL: '≤',
    BETWEEN: '∈',
  }
  const FIELD_LABELS: Record<string, string> = {
    monthlyIncome: 'Revenu mensuel',
    debtRatio: "Taux d'endettement",
    expenseRatio: 'Ratio dépenses',
    savingsRate: "Taux d'épargne",
    overdraftDays: 'Jours découvert',
    balanceVolatility: 'Volatilité solde',
  }
  const PERIOD_LABELS: Record<string, string> = {
    MONTHLY: '/mois',
    QUARTERLY: '/trimestre',
    ANNUAL: '/an',
    ONE_TIME: 'unique',
  }

  function fmt(v: number | null | undefined): string {
    return v != null ? Number(v).toLocaleString('fr-FR') : ''
  }
</script>

<div class="rule-node" class:selected class:dragging class:inactive={!data.isActive}>
  <Handle type="target" position={Position.Left} id="tl" />
  <Handle type="target" position={Position.Top} id="tt" />
  <Handle type="source" position={Position.Right} id="sr" />
  <Handle type="source" position={Position.Bottom} id="sb" />
  <div class="rule-node-header" style="background: {data.isActive ? TYPE_COLORS[data.type] ?? '#6B7280' : '#9CA3AF'}">
    <span class="rule-code">{data.code || 'Nouveau'}</span>
    <span class="rule-type-badge" style="background: {TYPE_COLORS[data.type] ?? '#6B7280'}">
      {TYPE_LABELS[data.type] ?? data.type}
    </span>
  </div>
  <div class="rule-node-body">
    <span class="rule-label">{data.label || 'Sans libellé'}</span>

    {#if data.type === 'FEE'}
      <div class="value-block">
        {#if data.percentage != null}
          <span class="value-line"><span class="value-label">Taux</span><span class="value-main">{data.percentage}%</span></span>
        {/if}
        {#if data.flatAmount != null}
          <span class="value-line"><span class="value-label">Montant</span><span class="value-main">{fmt(data.flatAmount)} {data.currency ?? 'XOF'}</span></span>
        {/if}
        {#if data.minAmount != null || data.maxAmount != null}
          <span class="value-line">
            <span class="value-label">Plafond</span>
            <span class="value-main">{fmt(data.minAmount)} – {fmt(data.maxAmount)} {data.currency ?? 'XOF'}</span>
          </span>
        {/if}
        {#if data.period}
          <span class="value-line"><span class="value-label">Période</span><span class="value-main">{PERIOD_LABELS[data.period] ?? data.period}</span></span>
        {/if}
      </div>
    {:else if data.type === 'LIMIT' || data.type === 'ELIGIBILITY'}
      <div class="condition">
        <span class="condition-field">{FIELD_LABELS[data.field] ?? data.field}</span>
        <span class="condition-op">{OPERATOR_LABELS[data.operator] ?? data.operator}</span>
        <span class="condition-value">{data.operator === 'BETWEEN' ? `${fmt(data.valueMin)} – ${fmt(data.valueMax)}` : fmt(data.value)}</span>
        {#if data.currency}
          <span class="condition-currency">{data.currency}</span>
        {/if}
      </div>
    {:else}
      <div class="condition">
        <span class="condition-field">{FIELD_LABELS[data.field] ?? data.field}</span>
        <span class="condition-op">{OPERATOR_LABELS[data.operator] ?? data.operator}</span>
        <span class="condition-value">{fmt(data.value)}</span>
      </div>
    {/if}
  </div>
  <div class="rule-node-footer">
    <span class="status-dot" class:active={data.isActive} class:inactive={!data.isActive}></span>
    <span class="status-text">{data.isActive ? 'Actif' : 'Inactif'}</span>
    {#if data.weight > 0}
      <span class="weight-badge">{data.weight}</span>
    {/if}
  </div>
</div>

<style>
  .rule-node {
    background: white;
    border: 2px solid #D97706;
    border-radius: 8px;
    padding: 0;
    min-width: 190px;
    max-width: 260px;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .rule-node.selected {
    border-color: #2563EB;
    box-shadow: 0 0 0 2px rgba(37,99,235,0.3);
  }
  .rule-node.dragging {
    opacity: 0.8;
    box-shadow: 0 8px 16px rgba(0,0,0,0.15);
  }
  .rule-node.inactive {
    opacity: 0.7;
    border-color: #9CA3AF;
  }
  .rule-node-header {
    color: white;
    padding: 6px 10px;
    border-radius: 6px 6px 0 0;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .rule-code {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rule-type-badge {
    font-size: 9px;
    font-weight: 700;
    color: white;
    padding: 1px 6px;
    border-radius: 4px;
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .rule-node-body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rule-label {
    font-weight: 600;
    color: #1F2937;
    font-size: 14px;
  }
  .value-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .value-line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    background: #F9FAFB;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .value-label {
    color: #6B7280;
    font-size: 11px;
  }
  .value-main {
    font-weight: 700;
    color: #EF4444;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  }
  .condition {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', monospace;
    font-size: 12px;
    background: #F9FAFB;
    padding: 4px 8px;
    border-radius: 4px;
    border: 1px solid #F3F4F6;
  }
  .condition-field {
    color: #3B82F6;
    font-weight: 600;
  }
  .condition-op {
    color: #D97706;
    font-weight: 700;
    margin: 0 2px;
  }
  .condition-value {
    color: #059669;
    font-weight: 600;
  }
  .condition-currency {
    color: #9CA3AF;
    font-size: 10px;
  }
  .rule-node-footer {
    padding: 4px 10px 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .status-dot.active {
    background: #059669;
  }
  .status-dot.inactive {
    background: #9CA3AF;
  }
  .status-text {
    font-size: 10px;
    font-weight: 500;
    color: #6B7280;
  }
  .weight-badge {
    margin-left: auto;
    font-size: 9px;
    font-weight: 700;
    color: white;
    background: #6B7280;
    padding: 0 5px;
    border-radius: 4px;
  }
</style>
