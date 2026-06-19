<script lang="ts">
  import type { RuleNodeData } from './types'

  let {
    rules = [] as RuleNodeData[],
    availableRules = [] as RuleNodeData[],
    productId = null as string | null,
    selectedRuleType = 'ELIGIBILITY',
    loading = false,
    onAddRule,
    onLinkRule,
    onSelectRuleType,
  }: {
    rules?: RuleNodeData[]
    availableRules?: RuleNodeData[]
    productId?: string | null
    selectedRuleType?: string
    loading?: boolean
    onAddRule?: () => void
    onLinkRule?: (ruleId: string) => void
    onSelectRuleType?: (t: string) => void
  } = $props()
</script>

<div class="palette">
  <div class="palette-header">
    <h2>Règles</h2>
    <span class="count">{rules.length}</span>
  </div>

  <div class="palette-section">
    <div class="section-title">
      <span>Règles liées</span>
    </div>
    <div class="palette-list">
      {#if rules.length === 0}
        <div class="empty">Aucune règle liée</div>
      {:else}
        {#each rules as rule}
          <div class="rule-item">
            <div class="rule-item-header">
              <span class="rule-item-code">{rule.code || 'Nouveau'}</span>
              <span class="rule-type-badge">{rule.type}</span>
            </div>
            <div class="rule-item-label">{rule.label || 'Sans libellé'}</div>
            <div class="rule-item-detail">{rule.field} {rule.operator} {rule.value}</div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  {#if productId}
    <div class="palette-section">
      <div class="section-title">
        <span>Ajouter une règle</span>
      </div>
      {#if availableRules.length > 0}
        <div class="add-rule-section">
          <span class="add-label">Règles existantes</span>
          <div class="available-list">
            {#each availableRules.slice(0, 20) as rule}
              <button class="available-item" onclick={() => onLinkRule?.(rule.id)}>
                <div class="available-item-info">
                  <span class="available-code">{rule.code}</span>
                  <span class="available-label">{rule.label}</span>
                </div>
                <span class="add-icon">+</span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
      <div class="add-rule-section">
        <span class="add-label">Nouvelle règle</span>
        <div class="add-rule-row">
          <select bind:value={selectedRuleType} onchange={() => onSelectRuleType?.(selectedRuleType)}>
            <option value="ELIGIBILITY">Éligibilité</option>
            <option value="FEE">Frais</option>
            <option value="LIMIT">Limite</option>
            <option value="INTEREST">Intérêt</option>
            <option value="VALUE_DATE">Date valeur</option>
          </select>
          <button class="btn-add" onclick={onAddRule}>Créer</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .palette {
    width: 280px;
    border-right: 1px solid #E5E7EB;
    display: flex;
    flex-direction: column;
    background: #FAFAFA;
    overflow-y: auto;
  }
  .palette-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid #E5E7EB;
  }
  .palette-header h2 {
    font-size: 14px;
    font-weight: 600;
    color: #1F2937;
    margin: 0;
  }
  .count {
    font-size: 11px;
    font-weight: 600;
    color: white;
    background: #3A6A00;
    border-radius: 10px;
    padding: 1px 7px;
  }
  .palette-section {
    border-bottom: 1px solid #E5E7EB;
  }
  .section-title {
    padding: 10px 16px 4px;
    font-size: 11px;
    font-weight: 700;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .palette-list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rule-item {
    background: white;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    padding: 8px 10px;
  }
  .rule-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }
  .rule-item-code {
    font-size: 11px;
    font-weight: 600;
    color: #D97706;
  }
  .rule-type-badge {
    font-size: 9px;
    font-weight: 600;
    color: #6B7280;
    background: #F3F4F6;
    padding: 1px 5px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .rule-item-label {
    font-size: 13px;
    font-weight: 500;
    color: #1F2937;
  }
  .rule-item-detail {
    font-size: 11px;
    color: #6B7280;
    font-family: monospace;
    margin-top: 2px;
  }
  .empty {
    text-align: center;
    color: #9CA3AF;
    font-size: 12px;
    padding: 12px;
  }
  .add-rule-section {
    padding: 8px 12px 12px;
  }
  .add-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    display: block;
    margin-bottom: 6px;
  }
  .available-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 10px;
  }
  .available-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    text-align: left;
    width: 100%;
  }
  .available-item:hover {
    border-color: #3A6A00;
    background: #FAFAFA;
  }
  .available-item-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .available-code {
    font-weight: 600;
    color: #D97706;
    font-size: 11px;
  }
  .available-label {
    color: #1F2937;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .add-icon {
    font-size: 16px;
    font-weight: 700;
    color: #3A6A00;
    flex-shrink: 0;
    margin-left: 8px;
  }
  .add-rule-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .add-rule-row select {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    font-size: 12px;
  }
  .add-rule-row select:focus {
    border-color: #3A6A00;
    outline: none;
  }
  .btn-add {
    padding: 6px 12px;
    background: #3A6A00;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .btn-add:hover {
    background: #2D5200;
  }
</style>
