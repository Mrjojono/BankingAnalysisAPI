<script lang="ts">
  import { Plus, Pencil, Trash2, Search, Info } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Drawer from '../lib/components/Drawer.svelte';

  let rules = $state<any[]>([]);
  let products = $state<any[]>([]);
  let editing = $state<any | null>(null);
  let saving = $state(false);
  let error = $state('');
  let drawerOpen = $state(false);
  let helpOpen = $state(false);
  let search = $state('');

  const RULE_TYPES = [
    { value: 'ELIGIBILITY', label: 'Éligibilité (scorée)', desc: 'Détermine le score du client' },
    { value: 'FEE', label: 'Frais', desc: 'Frais fixes ou proportionnels' },
    { value: 'LIMIT', label: 'Limite', desc: 'Plafond opérationnel' },
    { value: 'INTEREST', label: 'Intérêt', desc: "Taux d'intérêt" },
    { value: 'VALUE_DATE', label: 'Date valeur', desc: 'Date de valeur des opérations' },
  ];

  const TYPE_STYLES: Record<string, string> = {
    ELIGIBILITY: 'bg-blue-50 text-blue-700',
    FEE: 'bg-red-50 text-red-700',
    LIMIT: 'bg-amber-50 text-amber-700',
    INTEREST: 'bg-purple-50 text-purple-700',
    VALUE_DATE: 'bg-cyan-50 text-cyan-700',
  };

  const FIELDS = [
    { value: 'monthlyIncome', label: 'Revenus mensuels (monthlyIncome)' },
    { value: 'debtRatio', label: "Taux d'endettement (debtRatio)" },
    { value: 'expenseRatio', label: 'Ratio dépenses/revenus (expenseRatio)' },
    { value: 'repaymentRegularity', label: 'Régularité remboursement (repaymentRegularity)' },
    { value: 'savingsRate', label: "Taux d'épargne (savingsRate)" },
    { value: 'overdraftDays', label: 'Jours de découvert (overdraftDays)' },
    { value: 'revenueVolatility', label: 'Volatilité revenus (revenueVolatility)' },
    { value: 'savingsRegularity', label: "Régularité épargne (savingsRegularity)" },
    { value: 'emergencyFundScore', label: "Fonds d'urgence (emergencyFundScore)" },
    { value: 'balanceVolatility', label: 'Volatilité solde (balanceVolatility)' },
  ];

  const OPERATORS = [
    { value: 'GREATER_THAN', label: '> (supérieur)' },
    { value: 'LESS_THAN', label: '< (inférieur)' },
    { value: 'GREATER_OR_EQUAL', label: '≥ (supérieur ou égal)' },
    { value: 'LESS_OR_EQUAL', label: '≤ (inférieur ou égal)' },
    { value: 'EQUALS', label: '= (égal)' },
    { value: 'NOT_EQUALS', label: '≠ (différent)' },
    { value: 'IN', label: '∈ (dans la liste)' },
    { value: 'NOT_IN', label: '∉ (pas dans la liste)' },
    { value: 'BETWEEN', label: 'Entre deux valeurs' },
  ];

  const PERIODS = [
    { value: 'DAILY', label: 'Quotidien' },
    { value: 'WEEKLY', label: 'Hebdomadaire' },
    { value: 'MONTHLY', label: 'Mensuel' },
    { value: 'YEARLY', label: 'Annuel' },
    { value: 'PER_TRANSACTION', label: 'Par opération' },
  ];

  const CURRENCIES = [
    { value: 'XOF', label: 'Franc CFA (XOF)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'USD', label: 'Dollar (USD)' },
    { value: 'GBP', label: 'Livre Sterling (GBP)' },
  ];

  const OPERATOR_LABELS = Object.fromEntries(OPERATORS.map(o => [o.value, o.label]));
  const TYPE_LABELS = Object.fromEntries(RULE_TYPES.map(t => [t.value, t.label]));

  onMount(async () => {
    try { [rules, products] = await Promise.all([api.listRules(), api.listProducts()]); }
    catch { error = 'Erreur chargement des règles'; }
  });

  let filtered = $derived.by(() => {
    if (!search) return rules;
    const q = search.toLowerCase();
    return rules.filter(r =>
      r.type?.toLowerCase().includes(q) ||
      r.code?.toLowerCase().includes(q) ||
      r.label?.toLowerCase().includes(q) ||
      r.field?.toLowerCase().includes(q) ||
      r.operator?.toLowerCase().includes(q)
    );
  });

  let isBetween = $derived(editing?.operator === 'BETWEEN');
  let isScoreType = $derived(editing?.type === 'ELIGIBILITY');
  let isFeeType = $derived(editing?.type === 'FEE');

  function productName(prodId: string) {
    return products.find(p => p.id === prodId)?.code ?? prodId;
  }

  function emptyRule() {
    return {
      productId: '', code: '', type: 'ELIGIBILITY', label: '', description: '',
      field: '', operator: 'GREATER_THAN', value: null, valueMin: null, valueMax: null,
      percentage: null, flatAmount: null, minAmount: null, maxAmount: null,
      currency: null, period: null, conditions: null,
      weight: 0, priority: 0, isActive: true,
    };
  }

  function openForm(r?: any) {
    if (r) {
      editing = { ...r, conditions: r.conditions ? JSON.parse(JSON.stringify(r.conditions)) : null };
    } else {
      editing = emptyRule();
    }
    drawerOpen = true;
  }

  function toNumber(v: any): number | null {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  async function save() {
    if (!editing) return;
    saving = true; error = '';
    try {
      const payload = {
        productId: editing.productId,
        code: editing.code,
        type: editing.type,
        label: editing.label,
        description: editing.description,
        field: editing.field,
        operator: editing.operator,
        value: toNumber(editing.value),
        valueMin: toNumber(editing.valueMin),
        valueMax: toNumber(editing.valueMax),
        percentage: toNumber(editing.percentage),
        flatAmount: toNumber(editing.flatAmount),
        minAmount: toNumber(editing.minAmount),
        maxAmount: toNumber(editing.maxAmount),
        currency: editing.currency || null,
        period: editing.period || null,
        conditions: editing.conditions,
        weight: toNumber(editing.weight) ?? 0,
        priority: toNumber(editing.priority) ?? 0,
        isActive: editing.isActive,
      };
      if (editing.id) {
        const updated = await api.updateRule(editing.id, payload);
        rules = rules.map(r => r.id === updated.id ? updated : r);
      } else {
        const created = await api.createRule(payload);
        rules = [...rules, created];
      }
      drawerOpen = false; editing = null;
    } catch (e: any) { error = e.message; }
    finally { saving = false; }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette règle ?')) return;
    await api.deleteRule(id);
    rules = rules.filter(r => r.id !== id);
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-[22px] font-bold">Règles</h2>
  <button onclick={() => helpOpen = true}
    class="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-mint-subtle rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer">
    <Info size={18} />
    Aide
  </button>
</div>

<Drawer open={helpOpen} title="Aide — Règles" onclose={() => helpOpen = false}>
  <div class="flex flex-col gap-4 text-sm leading-relaxed text-on-surface">
    <p>Cette page gère les règles associées aux produits bancaires. Les règles sont évaluées par le moteur d'éligibilité pour déterminer si un client peut obtenir un produit.</p>

    <h4 class="font-bold text-base mt-2">Types de règles</h4>
    <ul class="list-disc pl-5 flex flex-col gap-1.5">
      <li><span class="font-semibold text-blue-700">Éligibilité (ELIGIBILITY)</span> — règle scorée. L'ensemble des règles ELIGIBILITY d'un produit produit un score global. Poids (weight) de 1 à 10 : plus le poids est élevé, plus la règle est importante dans la décision.</li>
      <li><span class="font-semibold text-red-700">Frais (FEE)</span> — définit des frais (montant fixe <code>flatAmount</code>, pourcentage <code>percentage</code>, avec min/max optionnels). Non scorée.</li>
      <li><span class="font-semibold text-amber-700">Limite (LIMIT)</span> — plafond opérationnel (retrait DAB, paiement TPE, etc.). Non scorée.</li>
      <li><span class="font-semibold text-purple-700">Intérêt (INTEREST)</span> — taux d'intérêt (ex: 3,5%/an). Non scorée.</li>
      <li><span class="font-semibold text-cyan-700">Date valeur (VALUE_DATE)</span> — délai de valeur d'une opération (ex: J+1). Non scorée.</li>
    </ul>

    <h4 class="font-bold text-base mt-2">Score d'éligibilité</h4>
    <p>Le score est calculé ainsi : <code>∑scoreEarned / ∑weight × 100</code>, arrondi à l'entier.</p>
    <ul class="list-disc pl-5">
      <li>Règle <strong>PASS</strong> → la valeur client respecte le seuil → rapporte 100% du poids</li>
      <li>Règle <strong>PARTIAL</strong> → la valeur est proche du seuil (écart ≤ 20%) → rapporte 40% du poids</li>
      <li>Règle <strong>FAIL</strong> → la valeur dépasse le seuil → rapporte 0</li>
    </ul>
    <p>Seuils de décision : <span class="font-semibold text-primary">≥ 80% → Éligible</span>, <span class="font-semibold text-amber-600">≥ 50% → Partiel</span>, <span class="font-semibold text-red-600">&lt; 50% → Inéligible</span>.</p>

    <h4 class="font-bold text-base mt-2">Champs métier (field)</h4>
    <p>Le champ <code class="font-mono">field</code> de la règle est mappé automatiquement aux métriques calculées par le moteur analytics via <code>ANALYTICS_FIELD_MAP</code>. Exemples : <code class="font-mono">monthlyIncome</code> → revenus mensuels, <code class="font-mono">debtRatio</code> → taux d'endettement.</p>

    <h4 class="font-bold text-base mt-2">Exemple concret</h4>
    <p class="bg-surface-container-low p-3 rounded-xl text-xs leading-relaxed">
      <strong>Règle :</strong> ELIGIBILITY, field=<code>monthlyIncome</code>, operator=<code>GREATER_OR_EQUAL</code>, value=200000, weight=5<br />
      <strong>Client :</strong> revenus = 180 000 FCFA<br />
      <strong>Évaluation :</strong> 180 000 &lt; 200 000 → FAIL → 0/5 points<br />
      <strong>Mais :</strong> écart = (200000 - 180000) / 200000 = 10% ≤ 20% → PARTIAL → 2/5 points (40%)
    </p>
  </div>
</Drawer>

<Drawer open={drawerOpen} title={editing?.id ? 'Modifier la règle' : 'Nouvelle règle'} onclose={() => { drawerOpen = false; editing = null; }}>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Type
      <select bind:value={editing!.type} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
        {#each RULE_TYPES as t}
          <option value={t.value}>{t.label}</option>
        {/each}
      </select>
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Produit
      <select bind:value={editing!.productId} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
        <option value="">— Aucun —</option>
        {#each products as p}
          <option value={p.id}>{p.code} — {p.name}</option>
        {/each}
      </select>
    </label>
    <div class="grid grid-cols-2 gap-4">
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Code
        <input bind:value={editing!.code} placeholder="ex: REVENUS_MIN" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
      </label>
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Label
        <input bind:value={editing!.label} placeholder="ex: Revenus minimum" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
      </label>
    </div>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Description
      <textarea bind:value={editing!.description} rows="2" placeholder="Description optionnelle…" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"></textarea>
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Champ métier (field)
      <select bind:value={editing!.field} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
        <option value="">— Sélectionner —</option>
        {#each FIELDS as f}
          <option value={f.value}>{f.label}</option>
        {/each}
      </select>
    </label>
    <div class="grid grid-cols-2 gap-4">
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Opérateur
        <select bind:value={editing!.operator} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          {#each OPERATORS as op}
            <option value={op.value}>{op.label}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Valeur seuil (value)
        <input type="number" bind:value={editing!.value} placeholder="ex: 200000" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
      </label>
    </div>
    {#if isBetween}
      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Valeur min (valueMin)
          <input type="number" bind:value={editing!.valueMin} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Valeur max (valueMax)
          <input type="number" bind:value={editing!.valueMax} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
      </div>
    {/if}
    {#if isScoreType}
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Poids (weight)
        <input type="number" bind:value={editing!.weight} min="1" max="10" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
      </label>
    {/if}
    {#if isFeeType}
      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Montant fixe (flatAmount)
          <input type="number" bind:value={editing!.flatAmount} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Pourcentage (%)
          <input type="number" bind:value={editing!.percentage} step="0.01" placeholder="ex: 0.5" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Montant min (minAmount)
          <input type="number" bind:value={editing!.minAmount} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Montant max (maxAmount)
          <input type="number" bind:value={editing!.maxAmount} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
      </div>
    {/if}
    <div class="grid grid-cols-2 gap-4">
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Devise
        <select bind:value={editing!.currency} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          <option value="">— Non spécifiée —</option>
          {#each CURRENCIES as c}
            <option value={c.value}>{c.label}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Période
        <select bind:value={editing!.period} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          <option value="">— Non spécifiée —</option>
          {#each PERIODS as p}
            <option value={p.value}>{p.label}</option>
          {/each}
        </select>
      </label>
    </div>
    <details class="group">
      <summary class="text-sm font-semibold text-on-surface-variant cursor-pointer list-none flex items-center gap-2 select-none">
        <span class="transition-transform group-open:rotate-90">▸</span>
        Conditions avancées (JSON)
      </summary>
      <textarea bind:value={editing!.conditions} rows="4" placeholder="null" class="w-full mt-2 px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical font-mono"></textarea>
    </details>
    <div class="grid grid-cols-2 gap-4">
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Priorité
        <input type="number" bind:value={editing!.priority} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
      </label>
      <label class="flex items-center gap-2 text-sm font-semibold text-on-surface-variant pt-6">
        <input type="checkbox" bind:checked={editing!.isActive} class="w-4 h-4 rounded border-mint-subtle text-primary focus:ring-primary" />
        Active
      </label>
    </div>
    <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
      <button onclick={() => { drawerOpen = false; editing = null; }} class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-mint-subtle hover:bg-surface-container transition-all cursor-pointer">
        Annuler
      </button>
      <button onclick={save} disabled={saving} class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#2d5200] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  </div>
</Drawer>

{#if error}
  <div class="bg-red-50 text-error px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>
{/if}

<button onclick={() => openForm()} class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-[#2d5200] transition-all cursor-pointer border-none mb-4">
  <Plus size={18} />
  Nouvelle règle
</button>

<div class="relative mb-4">
  <Search size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
  <input bind:value={search} placeholder="Rechercher une règle (type, code, label, champ, opérateur)…"
    class="w-full pl-10 pr-4 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all" />
</div>

<div class="bg-surface rounded-2xl overflow-auto border border-mint-subtle">
  <table class="w-full border-collapse">
    <thead>
      <tr class="bg-background">
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Type</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Produit</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Code</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Label</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Champ</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Opérateur</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Valeur</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Poids</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant">Statut</th>
        <th class="text-left px-5 py-3 text-sm font-semibold text-on-surface-variant"></th>
      </tr>
    </thead>
    <tbody>
      {#each filtered as r}
        <tr class="hover:bg-[#fafcfa] transition-all">
          <td class="px-5 py-3">
            <span class="inline-block px-2 py-1 rounded-md text-xs font-semibold {TYPE_STYLES[r.type] ?? 'bg-surface-container text-on-surface-variant'}">
              {TYPE_LABELS[r.type] ?? r.type}
            </span>
          </td>
          <td class="px-5 py-3 text-sm font-semibold">{r.product?.code ?? productName(r.productId)}</td>
          <td class="px-5 py-3 text-sm"><code class="bg-surface-container px-2 py-1 rounded-md text-xs font-mono">{r.code}</code></td>
          <td class="px-5 py-3 text-sm">{r.label}</td>
          <td class="px-5 py-3 text-sm font-mono text-xs">{r.field}</td>
          <td class="px-5 py-3 text-xs font-mono">{OPERATOR_LABELS[r.operator] ?? r.operator}</td>
          <td class="px-5 py-3 text-sm">{r.value ?? (r.valueMin != null ? `${r.valueMin} – ${r.valueMax}` : '—')}</td>
          <td class="px-5 py-3 text-sm">{r.type === 'ELIGIBILITY' ? r.weight : '—'}</td>
          <td class="px-5 py-3">
            {#if r.isActive}
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>Active
              </span>
            {:else}
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-outline">
                <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Inactive
              </span>
            {/if}
          </td>
          <td class="px-5 py-3">
            <div class="flex gap-1">
              <button onclick={() => openForm(r)} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-all cursor-pointer border-none text-on-surface-variant">
                <Pencil size={18} />
              </button>
              <button onclick={() => remove(r.id)} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant">
                <Trash2 size={18} />
              </button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
