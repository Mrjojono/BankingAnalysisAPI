<script lang="ts">
  import { onMount } from 'svelte';
  import { ShieldCheck, AlertTriangle, Play } from '@lucide/svelte';
  import CustomerSearch from '../lib/components/CustomerSearch.svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';

  let { initialCustomer }: { initialCustomer?: any } = $props();

  let loading = $state(false);
  let customerId = $state('');
  let selectedCustomer = $state<any>(null);
  let searched = $state(false);

  let dashboard: any = $state(null);
  let products: any[] = $state([]);
  let selectedProduct = $state('');
  let evalResult: any = $state(null);
  let evaluating = $state(false);

  let simAdjustments: Record<string, number> = $state({});
  let simResult: any = $state(null);
  let simulating = $state(false);

  let improvementPlan: any = $state(null);
  let loadingPlan = $state(false);

  let activeTab = $state<'dashboard' | 'simulate' | 'plan'>('dashboard');

  const FIELDS = [
    { value: 'monthlyIncome', label: 'Revenus mensuels', unit: 'FCFA', placeholder: '500000' },
    { value: 'debtRatio', label: "Taux d'endettement", unit: '%', placeholder: '25' },
    { value: 'expenseRatio', label: 'Ratio dépenses/revenus', unit: '%', placeholder: '60' },
    { value: 'savingsRate', label: "Taux d'épargne", unit: '%', placeholder: '15' },
    { value: 'overdraftDays', label: 'Jours de découvert', unit: 'jours', placeholder: '0' },
    { value: 'repaymentRegularity', label: 'Régularité remboursement', unit: '/100', placeholder: '80' },
    { value: 'savingsRegularity', label: "Régularité épargne", unit: '/100', placeholder: '70' },
    { value: 'emergencyFundScore', label: "Fonds d'urgence", unit: '/100', placeholder: '50' },
    { value: 'revenueVolatility', label: 'Volatilité revenus', unit: '/100', placeholder: '30' },
    { value: 'balanceVolatility', label: 'Volatilité solde', unit: '/100', placeholder: '20' },
  ];

  const STATUS_COLORS: Record<string, string> = {
    ELIGIBLE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    PARTIAL: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    NOT_ELIGIBLE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    PASS: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    FAIL: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  };

  const STATUS_LABELS: Record<string, string> = {
    ELIGIBLE: 'Éligible',
    PARTIAL: 'Partiel',
    NOT_ELIGIBLE: 'Non éligible',
    PASS: 'Respecté',
    FAIL: 'Non respecté',
  };

  onMount(() => {
    if (initialCustomer?.id) loadCustomer(initialCustomer);
  });

  async function loadCustomer(customer: any) {
    loading = true; searched = false;
    try {
      const [dash, prods] = await Promise.all([
        api.eligibilityDashboard(customer.id),
        api.eligibilityProducts(),
      ]);
      selectedCustomer = customer;
      customerId = customer.id;
      dashboard = dash;
      products = prods;
      searched = true;
      activeTab = 'dashboard';
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function evaluateProduct() {
    if (!selectedProduct || !customerId) return;
    evaluating = true; evalResult = null;
    try {
      evalResult = await api.eligibilityEvaluate({
        customerId,
        productCode: selectedProduct,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      evaluating = false;
    }
  }

  async function runSimulation() {
    const filled = Object.fromEntries(
      Object.entries(simAdjustments).filter(([, v]) => v !== undefined && v !== null && v !== 0)
    );
    if (!selectedProduct || Object.keys(filled).length === 0) return;
    simulating = true; simResult = null;
    try {
      simResult = await api.eligibilitySimulate({
        customerId,
        productCode: selectedProduct,
        adjustments: filled,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      simulating = false;
    }
  }

  async function loadImprovementPlan() {
    loadingPlan = true; improvementPlan = null;
    try {
      improvementPlan = await api.eligibilityImprovementPlan(customerId);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loadingPlan = false;
    }
  }

  function scoreColor(pct: number) {
    if (pct >= 70) return 'text-emerald-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-[22px] font-bold">Éligibilité</h2>
</div>

<!-- Customer Search -->
<div class="bg-surface rounded-2xl border border-mint-subtle p-5 mb-6">
  <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
    <span>Client</span>
    <CustomerSearch onSelect={loadCustomer} />
  </label>
</div>

{#if !searched && !loading}
  <div class="bg-surface rounded-2xl border border-mint-subtle p-10 text-center">
    <ShieldCheck size={48} class="mx-auto mb-4 text-outline" />
    <p class="text-on-surface-variant text-sm">Recherchez un client par nom, email ou n° de compte pour afficher son tableau de bord d'éligibilité.</p>
  </div>
{:else if loading}
  <div class="bg-surface rounded-2xl border border-mint-subtle p-10 text-center">
    <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
    <p class="text-on-surface-variant text-sm">Chargement des données...</p>
  </div>
{:else if dashboard}
  <!-- Selected customer -->
  {#if selectedCustomer}
    <div class="flex items-center gap-3 mb-4 px-4 py-3 bg-primary-container/30 border border-primary/20 rounded-xl text-sm">
      <ShieldCheck size={18} class="text-primary shrink-0" />
      <span class="font-semibold">{selectedCustomer.firstName}{selectedCustomer.lastName ? ` ${selectedCustomer.lastName}` : ''}</span>
      {#if selectedCustomer.email}
        <span class="text-on-surface-variant">· {selectedCustomer.email}</span>
      {/if}
      {#if selectedCustomer.accountNumber}
        <code class="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono text-on-surface-variant">{selectedCustomer.accountNumber}</code>
      {/if}
    </div>
  {/if}
  <!-- Tabs -->
  <div class="flex gap-2 mb-6">
    {#each [{ id: 'dashboard', label: 'Dashboard' }, { id: 'simulate', label: 'Simulateur' }, { id: 'plan', label: "Plan d'amélioration" }] as tab}
      <button
        onclick={() => { activeTab = tab.id as any; if (tab.id === 'plan' && !improvementPlan) loadImprovementPlan(); }}
        class="px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none {activeTab === tab.id ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>

  {#if activeTab === 'dashboard'}
    <!-- Overview Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
        <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Score moyen</span>
        <span class="text-3xl font-bold {scoreColor(dashboard.overview.averageScore)}">
          {dashboard.overview.averageScore}%
        </span>
      </div>
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
        <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Meilleur produit</span>
        {#if dashboard.overview.bestScore}
          <span class="text-lg font-bold text-primary">{dashboard.overview.bestScore.productName}</span>
          <span class="text-sm {scoreColor(dashboard.overview.bestScore.scorePercent)}">{dashboard.overview.bestScore.scorePercent}% · {STATUS_LABELS[dashboard.overview.bestScore.status] ?? dashboard.overview.bestScore.status}</span>
        {:else}
          <span class="text-on-surface-variant text-sm">·</span>
        {/if}
      </div>
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
        <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Pire produit</span>
        {#if dashboard.overview.worstScore}
          <span class="text-lg font-bold text-red-600">{dashboard.overview.worstScore.productName}</span>
          <span class="text-sm {scoreColor(dashboard.overview.worstScore.scorePercent)}">{dashboard.overview.worstScore.scorePercent}% · {STATUS_LABELS[dashboard.overview.worstScore.status] ?? dashboard.overview.worstScore.status}</span>
        {:else}
          <span class="text-on-surface-variant text-sm">·</span>
        {/if}
      </div>
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
        <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Produits évalués</span>
        <span class="text-3xl font-bold">{dashboard.overview.totalProducts}</span>
      </div>
    </div>

    <!-- Product Scores Table -->
    <div class="bg-surface rounded-2xl overflow-x-auto border border-mint-subtle mb-6">
      <table class="w-full border-collapse">
        <thead>
          <tr class="bg-background">
            <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Produit</th>
            <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Code</th>
            <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Score</th>
            <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Statut</th>
          </tr>
        </thead>
        <tbody>
          {#each dashboard.productScores as ps}
            <tr class="hover:bg-[#fafcfa] transition-all border-t border-mint-subtle/50">
              <td class="px-4 py-3 text-sm font-semibold">{ps.productName}</td>
              <td class="px-4 py-3"><code class="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono">{ps.productCode}</code></td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="w-24 h-2 bg-surface-container rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all {ps.scorePercent >= 70 ? 'bg-emerald-500' : ps.scorePercent >= 40 ? 'bg-amber-500' : 'bg-red-500'}" style="width: {Math.min(ps.scorePercent, 100)}%"></div>
                  </div>
                  <span class="text-sm font-semibold {scoreColor(ps.scorePercent)}">{ps.scorePercent}%</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-block px-2 py-1 rounded-md text-xs font-semibold {STATUS_COLORS[ps.status] ?? 'bg-surface-container text-on-surface-variant'}">
                  {STATUS_LABELS[ps.status] ?? ps.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Critical Rules -->
    {#if dashboard.criticalRules && dashboard.criticalRules.length > 0}
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5">
        <h3 class="text-sm font-bold mb-4">Règles critiques (top 5)</h3>
        <div class="flex flex-col gap-3">
          {#each dashboard.criticalRules as rule}
            <div class="flex items-start gap-3 p-3 rounded-xl bg-red-50/50 border border-red-100">
              <AlertTriangle size={18} class="text-red-500 mt-0.5 shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-semibold">{rule.label}</span>
                  <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold {STATUS_COLORS[rule.status] ?? ''}">{STATUS_LABELS[rule.status] ?? rule.status}</span>
                </div>
                {#if rule.message}<p class="text-xs text-on-surface-variant">{rule.message}</p>{/if}
                {#if rule.advice}<p class="text-xs text-primary font-medium mt-1">{rule.advice}</p>{/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

  {:else if activeTab === 'simulate'}
    <!-- Simulator -->
    <div class="grid grid-cols-2 gap-6">
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5">
        <h3 class="text-sm font-bold mb-4">Paramètres de simulation</h3>
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant mb-3">
          Produit
          <select bind:value={selectedProduct} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
            <option value="">Sélectionner…</option>
            {#each products as p}
              <option value={p.code}>{p.name}</option>
            {/each}
          </select>
        </label>
        <div class="flex flex-col gap-3">
          {#each FIELDS as f}
            <label class="flex flex-col gap-1 text-xs font-semibold text-on-surface-variant">
              {f.label} ({f.unit})
              <input
                type="number"
                placeholder={f.placeholder}
                oninput={(e) => {
                  const v = Number((e.target as HTMLInputElement).value);
                  simAdjustments = { ...simAdjustments, [f.field]: v || 0 };
                }}
                class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
            </label>
          {/each}
        </div>
        <button
          onclick={runSimulation}
          disabled={simulating || !selectedProduct}
          class="mt-4 w-full px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#2d5200] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Play size={16} />
          {simulating ? 'Simulation...' : 'Lancer la simulation'}
        </button>
      </div>

      <div class="bg-surface rounded-2xl border border-mint-subtle p-5">
        {#if simResult}
          <h3 class="text-sm font-bold mb-4">Résultat de la simulation</h3>
          <!-- Score Comparison -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="p-4 rounded-xl bg-background border border-mint-subtle text-center">
              <p class="text-xs font-semibold text-on-surface-variant uppercase mb-1">Score actuel</p>
              <p class="text-2xl font-bold {scoreColor(simResult.current.scorePercent)}">{simResult.current.scorePercent}%</p>
              <p class="text-xs {STATUS_COLORS[simResult.current.status]} mt-1 px-2 py-0.5 rounded inline-block">{STATUS_LABELS[simResult.current.status]}</p>
            </div>
            <div class="p-4 rounded-xl bg-primary-container/30 border border-primary/20 text-center">
              <p class="text-xs font-semibold text-on-surface-variant uppercase mb-1">Score simulé</p>
              <p class="text-2xl font-bold {scoreColor(simResult.simulated.scorePercent)}">{simResult.simulated.scorePercent}%</p>
              <p class="text-xs {STATUS_COLORS[simResult.simulated.status]} mt-1 px-2 py-0.5 rounded inline-block">{STATUS_LABELS[simResult.simulated.status]}</p>
            </div>
          </div>
          <!-- Adjustments -->
          {#if simResult.adjustments && simResult.adjustments.length > 0}
            <h4 class="text-xs font-bold text-on-surface-variant uppercase mb-2">Ajustements</h4>
            <div class="flex flex-col gap-2">
              {#each simResult.adjustments as adj}
                <div class="flex items-center justify-between p-2 rounded-lg bg-background text-sm">
                  <span class="font-semibold">{adj.field}</span>
                  <span class="text-on-surface-variant">
                    {adj.from.toLocaleString('fr-FR')} → {adj.to.toLocaleString('fr-FR')}
                    <span class="font-semibold {adj.delta >= 0 ? 'text-emerald-600' : 'text-red-600'} ml-1">
                      ({adj.delta >= 0 ? '+' : ''}{adj.delta.toLocaleString('fr-FR')})
                    </span>
                  </span>
                </div>
              {/each}
            </div>
          {/if}
          <!-- Diffs in failed rules -->
          {#if simResult.simulated.ruleResults}
            <h4 class="text-xs font-bold text-on-surface-variant uppercase mt-4 mb-2">Règles impactées</h4>
            <div class="flex flex-col gap-1.5">
              {#each simResult.simulated.ruleResults.filter((r) => r.status !== 'PASS') as rule}
                <div class="flex items-center justify-between p-2 rounded-lg bg-red-50/50 text-xs">
                  <span class="font-semibold">{rule.label}</span>
                  <span class="{STATUS_COLORS[rule.status]} px-1.5 py-0.5 rounded">{STATUS_LABELS[rule.status] ?? rule.status}</span>
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          <div class="flex flex-col items-center justify-center h-full text-center py-10">
            <Play size={48} class="text-outline mb-4" />
            <p class="text-on-surface-variant text-sm">Configurez les paramètres et lancez la simulation.</p>
          </div>
        {/if}
      </div>
    </div>

  {:else if activeTab === 'plan'}
    <!-- Improvement Plan -->
    {#if loadingPlan}
      <div class="bg-surface rounded-2xl border border-mint-subtle p-10 text-center">
        <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-on-surface-variant text-sm">Chargement du plan...</p>
      </div>
    {:else if improvementPlan}
      <!-- Summary -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
          <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Score actuel</span>
          <span class="text-3xl font-bold {scoreColor(improvementPlan.currentGlobalScore / Math.max(improvementPlan.maxScore, 1) * 100)}">
            {Math.round(improvementPlan.currentGlobalScore / Math.max(improvementPlan.maxScore, 1) * 100)}%
          </span>
        </div>
        <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
          <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Score potentiel</span>
          <span class="text-3xl font-bold text-primary">{improvementPlan.improvementRate}%</span>
        </div>
        <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
          <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Règles à améliorer</span>
          <span class="text-3xl font-bold">{improvementPlan.items.length}</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="bg-surface rounded-2xl border border-mint-subtle p-5 mb-6">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-on-surface-variant">Progression vers l'éligibilité</span>
          <span class="text-xs font-bold text-primary">{improvementPlan.improvementRate}%</span>
        </div>
        <div class="w-full h-3 bg-surface-container rounded-full overflow-hidden">
          <div class="h-full bg-primary rounded-full transition-all" style="width: {improvementPlan.improvementRate}%"></div>
        </div>
      </div>

      <!-- Items -->
      <div class="bg-surface rounded-2xl border border-mint-subtle overflow-hidden">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-background">
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Règle</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Champ</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Valeur</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Seuil</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Statut</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Gain</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Conseil</th>
            </tr>
          </thead>
          <tbody>
            {#each improvementPlan.items as item}
              <tr class="hover:bg-[#fafcfa] transition-all border-t border-mint-subtle/50">
                <td class="px-4 py-3 text-sm font-semibold">{item.label}</td>
                <td class="px-4 py-3"><code class="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono">{item.field}</code></td>
                <td class="px-4 py-3 text-sm">{item.clientValue != null ? Number(item.clientValue).toLocaleString('fr-FR') : '·'}</td>
                <td class="px-4 py-3 text-sm">{item.threshold != null ? Number(item.threshold).toLocaleString('fr-FR') : '·'}</td>
                <td class="px-4 py-3">
                  <span class="inline-block px-1.5 py-0.5 rounded text-xs font-semibold {STATUS_COLORS[item.status] ?? ''}">
                    {STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-primary">+{item.improvementGap}</td>
                <td class="px-4 py-3 text-xs max-w-[250px]">
                  {#if item.advice}
                    <span class="text-primary">{item.advice}</span>
                  {:else}
                    <span class="text-outline">·</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
{/if}
