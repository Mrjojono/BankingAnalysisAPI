<script lang="ts">
  import { Brain, Play, List, AlertCircle, CheckCircle2, Cog, Info, TrendingUp, Target, Hash, Pencil, Plus, Trash2, X } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import InfoDrawer from '../lib/components/InfoDrawer.svelte';

  let examples = $state<any[]>([]);
  let count = $state(0);
  let loading = $state(true);
  let error = $state('');
  let infoOpen = $state(false);

  let training = $state(false);
  let trainingResult = $state<any | null>(null);
  let trainError = $state('');

  let epochs = $state(50);
  let lr = $state(0.01);
  let layers: 1 | 2 = $state(1);
  let margin = $state(0.5);

  // Drawer d'édition
  let drawerOpen = $state(false);
  let editing = $state<any | null>(null);
  let saving = $state(false);
  let saveError = $state('');

  // Champs du formulaire
  let formId = $state('');
  let formExpected = $state('');
  let formCategory = $state('LOGEMENT');
  let formPercent = $state(0);
  let formChange = $state(0);
  let formAmount = $state(0);
  let formExpenseRatio = $state(0);
  let formPrevAmount = $state(0);
  let formTotalRevenue = $state(0);
  let formTotalExpenses = $state(0);
  let formLabel = $state('');
  let formNotes = $state('');

  const INTENTS = [
    'LOGEMENT_CRITICAL', 'LOGEMENT_HIGH', 'LOGEMENT_OK',
    'CREDIT_HIGH', 'CREDIT_NEAR_LIMIT', 'CREDIT_INCREASE',
    'ALIMENTATION_SPIKE', 'ALIMENTATION_HIGH',
    'TRANSPORT_SPIKE', 'TRANSPORT_HIGH',
    'COMMERCE_SPIKE', 'CARBURANT_SPIKE',
    'SANTE_HIGH', 'MOBILE_MONEY_HIGH', 'FEES_HIGH',
    'INCOME_DROP', 'GOOD_HABIT',
  ];

  onMount(async () => {
    await loadExamples();
  });

  async function loadExamples() {
    loading = true;
    try {
      const res = await api.trainingExamples();
      examples = res.examples;
      count = res.count;
      console.log(`[Training] ${count} exemples chargés`);
    } catch (e: any) {
      error = e.message;
      console.error(`[Training] chargement échoué:`, e.message);
    } finally {
      loading = false;
    }
  }

  async function run() {
    training = true;
    trainError = '';
    trainingResult = null;
    try {
      trainingResult = await api.runTraining({ epochs, lr, layers, margin });
    } catch (e: any) {
      trainError = e.message;
    } finally {
      training = false;
    }
  }

  function openAdd() {
    editing = null;
    formId = 'ex-' + String(Date.now()).slice(-6);
    formExpected = 'LOGEMENT_OK';
    formCategory = 'LOGEMENT';
    formPercent = 0;
    formChange = 0;
    formAmount = 0;
    formExpenseRatio = 0;
    formPrevAmount = 0;
    formTotalRevenue = 0;
    formTotalExpenses = 0;
    formLabel = '';
    formNotes = '';
    drawerOpen = true;
  }

  function openEdit(ex: any) {
    editing = ex;
    formId = ex.id;
    formExpected = ex.expected;
    formCategory = ex.context?.category ?? 'LOGEMENT';
    formPercent = ex.context?.percent ?? 0;
    formChange = ex.context?.change ?? 0;
    formAmount = ex.context?.amount ?? 0;
    formExpenseRatio = ex.context?.expenseRatio ?? 0;
    formPrevAmount = ex.context?.prevAmount ?? 0;
    formTotalRevenue = ex.context?.totalRevenue ?? 0;
    formTotalExpenses = ex.context?.totalExpenses ?? 0;
    formLabel = ex.context?.label ?? '';
    formNotes = ex.notes ?? '';
    drawerOpen = true;
  }

  async function save() {
    saving = true;
    saveError = '';
    try {
      const body = {
        id: formId,
        expected: formExpected,
        context: {
          category: formCategory,
          percent: formPercent,
          change: formChange,
          amount: formAmount,
          expenseRatio: formExpenseRatio,
          prevAmount: formPrevAmount,
          totalRevenue: formTotalRevenue,
          totalExpenses: formTotalExpenses,
          label: formLabel || undefined,
        },
        notes: formNotes || undefined,
      };
      if (editing) {
        await api.updateTrainingExample(editing.id, body);
      } else {
        await api.createTrainingExample(body);
      }
      drawerOpen = false;
      await loadExamples();
    } catch (e: any) {
      saveError = e.message;
    } finally {
      saving = false;
    }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet exemple ?')) return;
    try {
      await api.deleteTrainingExample(id);
      await loadExamples();
    } catch (e: any) {
      saveError = e.message;
    }
  }
</script>

<div class="w-full">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <Brain size={24} class="text-primary" />
      <h2 class="text-2xl font-bold text-on-surface">Entraînement</h2>
    </div>
    <button
      onclick={() => infoOpen = true}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none"
    >
      <Info size={14} /> Aide
    </button>
  </div>

  <InfoDrawer open={infoOpen} onclose={() => infoOpen = false} section="training" />

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white border border-mint-subtle rounded-2xl p-6">
      <div class="flex items-center gap-2 mb-4">
        <Cog size={18} class="text-primary" />
        <h3 class="text-sm font-bold text-on-surface">Configuration</h3>
      </div>

      <div class="space-y-4">
        <div>
          <label for="epochs" class="block text-xs font-semibold text-outline mb-1">Époques</label>
          <input id="epochs" type="number" bind:value={epochs} min={1} max={10000}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <p class="text-[10px] text-outline mt-1">Nombre de passages sur les données</p>
        </div>
        <div>
          <label for="lr" class="block text-xs font-semibold text-outline mb-1">Learning rate</label>
          <input id="lr" type="number" bind:value={lr} min={0.0001} max={1} step={0.001}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <p class="text-[10px] text-outline mt-1">Vitesse d'apprentissage (0.01 = défaut)</p>
        </div>
        <div>
          <label for="layers" class="block text-xs font-semibold text-outline mb-1">Couches</label>
          <select id="layers" bind:value={layers}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option value={1}>1 couche (linéaire — 21 features → 17 intentions)</option>
            <option value={2}>2 couches (profond — 321 features → 32 → 17)</option>
          </select>
          <p class="text-[10px] text-outline mt-1">2 couches nécessite les embeddings</p>
        </div>
        <div>
          <label for="margin" class="block text-xs font-semibold text-outline mb-1">Marge (margin loss)</label>
          <input id="margin" type="number" bind:value={margin} min={0.1} max={2} step={0.1}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          <p class="text-[10px] text-outline mt-1">Seuil de confiance requis (0.5 = défaut)</p>
        </div>

        <button
          onclick={run}
          disabled={training || count === 0}
          class="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none mt-2"
        >
          {#if training}
            <div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            Entraînement en cours...
          {:else}
            <Play size={18} /> Lancer l'entraînement
          {/if}
        </button>
      </div>
    </div>

    <div class="bg-white border border-mint-subtle rounded-2xl p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <List size={18} class="text-primary" />
          <h3 class="text-sm font-bold text-on-surface">Données ({count})</h3>
        </div>
        <button
          onclick={openAdd}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-700 transition-all cursor-pointer border-none"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {#if loading}
        <p class="text-sm text-outline">Chargement...</p>
      {:else if error}
        <p class="text-sm text-red-600">{error}</p>
      {:else if count === 0}
        <div class="text-center py-8">
          <List size={32} class="text-outline mx-auto mb-2" />
          <p class="text-sm text-outline">Aucun exemple d'entraînement.</p>
        </div>
      {:else}
        <div class="max-h-80 overflow-y-auto space-y-1.5">
          {#each examples as ex}
            <button
              onclick={() => openEdit(ex)}
              class="w-full text-left px-3 py-2 rounded-xl bg-surface-container-low text-xs hover:bg-surface-container transition-all cursor-pointer border-none"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-mono text-outline">{ex.id}</span>
                <span class="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-semibold">{ex.expected}</span>
              </div>
              <div class="text-outline truncate">{ex.context?.label ?? ex.context?.category ?? '-'}</div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  {#if trainError}
    <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
      <AlertCircle size={18} /> {trainError}
    </div>
  {/if}

  {#if training}
    <div class="mt-4 p-6 bg-white border border-mint-subtle rounded-2xl text-center">
      <div class="flex items-center justify-center gap-2 text-sm font-semibold text-on-surface">
        <div class="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        Entraînement en cours — les poids seront sauvegardés automatiquement
      </div>
      <div class="mt-3 w-64 mx-auto bg-surface-container-low rounded-full h-2 overflow-hidden">
        <div class="bg-primary h-2 rounded-full animate-pulse" style="width: 100%"></div>
      </div>
    </div>
  {/if}

  {#if trainingResult && !training}
    <div class="mt-4 bg-white border border-mint-subtle rounded-2xl p-6">
      <div class="flex items-center gap-2 mb-4">
        <CheckCircle2 size={20} class="text-green-600" />
        <h3 class="text-sm font-bold text-on-surface">Résultat</h3>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-4">
        <div class="text-center p-3 rounded-xl bg-surface-container-low">
          <p class="text-xs text-outline mb-1">Époques</p>
          <p class="text-xl font-bold text-on-surface">{trainingResult.config?.epochs}</p>
        </div>
        <div class="text-center p-3 rounded-xl bg-surface-container-low">
          <div class="flex items-center justify-center gap-1 text-xs text-outline mb-1">
            <Target size={12} /> Précision
          </div>
          <p class="text-xl font-bold text-on-surface">{(trainingResult.finalAccuracy * 100).toFixed(1)}%</p>
        </div>
        <div class="text-center p-3 rounded-xl bg-surface-container-low">
          <p class="text-xs text-outline mb-1">Couches</p>
          <p class="text-xl font-bold text-on-surface">{trainingResult.config?.layers}</p>
        </div>
        <div class="text-center p-3 rounded-xl bg-surface-container-low">
          <p class="text-xs text-outline mb-1">LR</p>
          <p class="text-xl font-bold text-on-surface">{trainingResult.config?.learningRate}</p>
        </div>
      </div>

      {#if trainingResult.metrics?.length}
        <div>
          <div class="flex items-center gap-1 mb-2 text-xs text-outline">
            <TrendingUp size={12} /> Dernières époques (loss ↓ = progrès)
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-mint-subtle">
                  <th class="text-left px-3 py-2 font-semibold text-outline">Époque</th>
                  <th class="text-right px-3 py-2 font-semibold text-outline">Loss</th>
                  <th class="text-right px-3 py-2 font-semibold text-outline">Accuracy</th>
                  <th class="text-right px-3 py-2 font-semibold text-outline">Top-3</th>
                </tr>
              </thead>
              <tbody>
                {#each trainingResult.metrics as m}
                  <tr class="border-b border-mint-subtle/50">
                    <td class="px-3 py-2 font-mono text-on-surface">{m.epoch}</td>
                    <td class="px-3 py-2 text-right font-mono text-on-surface">{m.loss.toFixed(4)}</td>
                    <td class="px-3 py-2 text-right font-mono text-on-surface">{(m.accuracy * 100).toFixed(1)}%</td>
                    <td class="px-3 py-2 text-right font-mono text-on-surface">{(m.top3Accuracy * 100).toFixed(1)}%</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Drawer d'édition -->
<svelte:body class:overflow-hidden={drawerOpen} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<button
  aria-label="Fermer"
  class="fixed inset-0 bg-black/30 z-40 transition-opacity cursor-default"
  class:pointer-events-auto={drawerOpen}
  class:opacity-100={drawerOpen}
  class:opacity-0={!drawerOpen}
  class:pointer-events-none={!drawerOpen}
  onclick={() => drawerOpen = false}
></button>

<aside
  class="fixed top-0 right-0 h-full w-full max-w-lg bg-surface z-50 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
  class:translate-x-0={drawerOpen}
  class:translate-x-full={!drawerOpen}
>
  <header class="flex items-center justify-between px-6 h-16 border-b border-mint-subtle shrink-0">
    <h2 class="text-lg font-bold text-on-surface">
      {editing ? 'Modifier' : 'Ajouter'} un exemple
    </h2>
    <button
      onclick={() => drawerOpen = false}
      class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all cursor-pointer"
    >
      <X size={20} />
    </button>
  </header>

  <div class="flex-1 overflow-y-auto p-6">
    {#if saveError}
      <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
        <AlertCircle size={14} /> {saveError}
      </div>
    {/if}

    <div class="space-y-4">
      <div>
        <label for="ex-id" class="block text-xs font-semibold text-outline mb-1">ID</label>
        <input id="ex-id" bind:value={formId}
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div>
        <label for="ex-expected" class="block text-xs font-semibold text-outline mb-1">Intention attendue</label>
        <select id="ex-expected" bind:value={formExpected}
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          {#each INTENTS as intent}
            <option value={intent}>{intent}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="ex-label" class="block text-xs font-semibold text-outline mb-1">Libellé</label>
        <input id="ex-label" bind:value={formLabel} placeholder="Ex: Loyer mensuel"
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div>
        <label for="ex-category" class="block text-xs font-semibold text-outline mb-1">Catégorie</label>
        <input id="ex-category" bind:value={formCategory} placeholder="LOGEMENT"
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ex-percent" class="block text-xs font-semibold text-outline mb-1">Percent (%)</label>
          <input id="ex-percent" type="number" bind:value={formPercent}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="ex-change" class="block text-xs font-semibold text-outline mb-1">Change (%)</label>
          <input id="ex-change" type="number" bind:value={formChange}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ex-amount" class="block text-xs font-semibold text-outline mb-1">Montant</label>
          <input id="ex-amount" type="number" bind:value={formAmount}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="ex-prev-amount" class="block text-xs font-semibold text-outline mb-1">Montant précédent</label>
          <input id="ex-prev-amount" type="number" bind:value={formPrevAmount}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ex-expense-ratio" class="block text-xs font-semibold text-outline mb-1">Ratio dépenses (%)</label>
          <input id="ex-expense-ratio" type="number" bind:value={formExpenseRatio}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="ex-total-revenue" class="block text-xs font-semibold text-outline mb-1">Revenus totaux</label>
          <input id="ex-total-revenue" type="number" bind:value={formTotalRevenue}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div>
        <label for="ex-total-expenses" class="block text-xs font-semibold text-outline mb-1">Dépenses totales</label>
        <input id="ex-total-expenses" type="number" bind:value={formTotalExpenses}
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div>
        <label for="ex-notes" class="block text-xs font-semibold text-outline mb-1">Notes</label>
        <input id="ex-notes" bind:value={formNotes} placeholder="Optionnel"
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
    </div>
  </div>

  <div class="px-6 py-4 border-t border-mint-subtle shrink-0 bg-surface flex items-center justify-between">
    <div>
      {#if editing}
        <button
          onclick={() => remove(editing.id)}
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 text-sm font-semibold hover:bg-red-50 transition-all cursor-pointer border-none"
        >
          <Trash2 size={16} /> Supprimer
        </button>
      {/if}
    </div>
    <div class="flex gap-2">
      <button
        onclick={() => drawerOpen = false}
        class="px-4 py-2 rounded-xl bg-surface border border-mint-subtle text-on-surface-variant text-sm font-semibold hover:bg-surface-container transition-all cursor-pointer"
      >
        Annuler
      </button>
      <button
        onclick={save}
        disabled={saving}
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 border-none"
      >
        {#if saving}
          <div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
        {:else}
          <CheckCircle2 size={16} />
        {/if}
        {editing ? 'Enregistrer' : 'Créer'}
      </button>
    </div>
  </div>
</aside>
