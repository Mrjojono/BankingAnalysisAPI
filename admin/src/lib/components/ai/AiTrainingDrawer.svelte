<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { Play, Activity, CheckCircle2, AlertCircle, StopCircle, BarChart3, FileText, Download, Cog, List, TrendingUp, Target, Hash, Plus, Trash2, Pencil, Brain } from '@lucide/svelte';
  import Drawer from '../Drawer.svelte';
  import { api } from '../../api';

  let {
    open = $bindable(false),
    onDeploy,
  }: {
    open?: boolean;
    onDeploy?: () => void;
  } = $props();

  let activeTab = $state<'camenbert' | 'classifier'>('camenbert');

  // ── CamenBert state ──
  let cTraining = $state(false);
  let cLogs = $state<string[]>([]);
  let cMetrics = $state<any[]>([]);
  let cResult = $state<any | null>(null);
  let cError = $state('');
  let cAccuracy = $state(0);
  let cF1 = $state(0);
  let cCurrentEpoch = $state(0);
  let cTotalEpochs = $state(5);
  let eventSource: EventSource | null = $state(null);
  let logContainer = $state<HTMLDivElement | null>(null);

  let epochs = $state(5);
  let batchSize = $state(16);
  let lr = $state(2e-5);

  // ── Classifier state ──
  let examples = $state<any[]>([]);
  let exCount = $state(0);
  let exLoading = $state(true);
  let clTraining = $state(false);
  let clResult = $state<any | null>(null);
  let clError = $state('');
  let clEpochs = $state(50);
  let clLr = $state(0.01);
  let clLayers: 1 | 2 = $state(1);
  let clMargin = $state(0.5);

  let exampleDrawer = $state(false);
  let editing = $state<any | null>(null);
  let saving = $state(false);
  let saveError = $state('');

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

  onDestroy(() => {
    eventSource?.close();
  });

  // ── CamenBert training ──
  function connectSSE() {
    eventSource?.close();
    const token = getAuth().accessToken;
    const url = token ? `/api/admin/models/training/stream?token=${encodeURIComponent(token)}` : '/api/admin/models/training/stream';
    const es = new EventSource(url);
    eventSource = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'log':
            cLogs = [...cLogs, data.message];
            break;
          case 'epoch':
            cCurrentEpoch = data.epoch ?? cCurrentEpoch;
            cTotalEpochs = data.totalEpochs ?? cTotalEpochs;
            cAccuracy = data.accuracy ?? cAccuracy;
            cF1 = data.f1 ?? cF1;
            cMetrics = [...cMetrics, { epoch: data.epoch, loss: data.loss, accuracy: data.accuracy, f1: data.f1 }];
            cLogs = [...cLogs, `Epoch ${data.epoch}/${cTotalEpochs}: loss=${data.loss?.toFixed(4) ?? '?'}, acc=${data.accuracy != null ? (data.accuracy * 100).toFixed(1) + '%' : '?'}`];
            break;
          case 'complete':
            cAccuracy = data.accuracy ?? cAccuracy;
            cF1 = data.f1 ?? cF1;
            cResult = data;
            cTraining = false;
            cLogs = [...cLogs, `Terminé — Acc: ${(data.accuracy * 100).toFixed(1)}% | F1: ${(data.f1 * 100).toFixed(1)}%`];
            es.close();
            eventSource = null;
            break;
          case 'error':
            cError = data.message;
            cTraining = false;
            cLogs = [...cLogs, `Erreur: ${data.message}`];
            break;
          case 'status':
            if (data.state === 'cancelled') {
              cTraining = false;
              cLogs = [...cLogs, 'Annulé'];
            }
            break;
        }
      } catch {}
    };

    es.onerror = () => {
      cTraining = false;
      es.close();
      eventSource = null;
    };
  }

  async function startCamenBert() {
    if (cTraining) return;
    cTraining = true;
    cError = '';
    cResult = null;
    cLogs = [];
    cMetrics = [];
    cAccuracy = 0;
    cF1 = 0;
    cCurrentEpoch = 0;
    cTotalEpochs = epochs;

    try {
      const res = await api.runModelTraining({ epochs, batchSize, lr });
      if (res.error) {
        cError = res.error;
        cTraining = false;
        return;
      }
      connectSSE();
    } catch (e: any) {
      cError = e.message;
      cTraining = false;
    }
  }

  async function cancelCamenBert() {
    try {
      await api.cancelTraining();
      cTraining = false;
      eventSource?.close();
      eventSource = null;
    } catch {}
  }

  async function deployModel() {
    try {
      await api.deployModel();
      cResult = null;
      cLogs = [...cLogs, 'Modèle déployé !'];
      onDeploy?.();
    } catch (e: any) {
      cError = e.message;
    }
  }

  async function checkExistingStatus() {
    try {
      const s = await api.trainingStatus();
      if (s.state === 'running') {
        cTraining = true;
        cCurrentEpoch = s.currentEpoch;
        cTotalEpochs = s.totalEpochs;
        connectSSE();
      }
    } catch {}
  }

  $effect(() => {
    if (eventSource) {
      tick().then(() => {
        if (logContainer) {
          logContainer.scrollTop = logContainer.scrollHeight;
        }
      });
    }
  });

  // ── Classifier training ──
  async function loadExamples() {
    exLoading = true;
    try {
      const res = await api.trainingExamples();
      examples = res.examples;
      exCount = res.count;
    } catch {} finally { exLoading = false; }
  }

  async function runClassifier() {
    clTraining = true;
    clError = '';
    clResult = null;
    try {
      clResult = await api.runTraining({ epochs: clEpochs, lr: clLr, layers: clLayers, margin: clMargin });
    } catch (e: any) { clError = e.message; } finally { clTraining = false; }
  }

  function openAdd() {
    editing = null;
    formId = 'ex-' + String(Date.now()).slice(-6);
    formExpected = 'LOGEMENT_OK';
    formCategory = 'LOGEMENT';
    formPercent = 0; formChange = 0; formAmount = 0;
    formExpenseRatio = 0; formPrevAmount = 0; formTotalRevenue = 0; formTotalExpenses = 0;
    formLabel = ''; formNotes = '';
    exampleDrawer = true;
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
    exampleDrawer = true;
  }

  async function saveExample() {
    saving = true;
    saveError = '';
    try {
      const body = {
        id: formId,
        expected: formExpected,
        context: {
          category: formCategory, percent: formPercent, change: formChange,
          amount: formAmount, expenseRatio: formExpenseRatio,
          prevAmount: formPrevAmount, totalRevenue: formTotalRevenue,
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
      exampleDrawer = false;
      await loadExamples();
    } catch (e: any) { saveError = e.message; } finally { saving = false; }
  }

  async function removeExample(id: string) {
    if (!confirm('Supprimer cet exemple ?')) return;
    try {
      await api.deleteTrainingExample(id);
      await loadExamples();
    } catch (e: any) { saveError = e.message; }
  }

  function handleClose() {
    open = false;
    eventSource?.close();
    eventSource = null;
  }

  function onTabChange(tab: 'camenbert' | 'classifier') {
    activeTab = tab;
    if (tab === 'classifier') {
      loadExamples();
    }
  }
</script>

<Drawer {open} title="Entraînement" widthClass="max-w-3xl" onclose={handleClose}>
  {#snippet children()}
    <!-- Tabs -->
    <div class="flex gap-1 mb-6 p-1 rounded-xl bg-surface-container-low" role="tablist">
      <button
        role="tab"
        aria-selected={activeTab === 'camenbert'}
        onclick={() => onTabChange('camenbert')}
        class="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none"
        class:bg-surface={activeTab === 'camenbert'}
        class:text-on-surface={activeTab === 'camenbert'}
        class:text-outline={activeTab !== 'camenbert'}
        class:shadow-sm={activeTab === 'camenbert'}
      >
        <Brain size={16} class="inline -mt-0.5" /> CamenBert
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'classifier'}
        onclick={() => onTabChange('classifier')}
        class="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none"
        class:bg-surface={activeTab === 'classifier'}
        class:text-on-surface={activeTab === 'classifier'}
        class:text-outline={activeTab !== 'classifier'}
        class:shadow-sm={activeTab === 'classifier'}
      >
        <TrendingUp size={16} class="inline -mt-0.5" /> Classifieur
      </button>
    </div>

    {#if activeTab === 'camenbert'}
      {#if cTraining || cResult || cError || cLogs.length > 0}
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            {#if cTraining}
              <div class="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <span class="text-sm font-semibold text-on-surface">Epoch {cCurrentEpoch}/{cTotalEpochs}</span>
            {:else if cResult}
              <CheckCircle2 size={18} class="text-green-600" />
              <span class="text-sm font-semibold text-green-700">Terminé</span>
            {:else if cError}
              <AlertCircle size={18} class="text-red-600" />
              <span class="text-sm font-semibold text-red-700">Erreur</span>
            {:else}
              <span class="text-sm font-semibold text-on-surface">Précédent</span>
            {/if}
          </div>
          {#if cTraining}
            <button onclick={cancelCamenBert} class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold hover:bg-red-100 transition-all cursor-pointer border-none">
              <StopCircle size={14} /> Arrêter
            </button>
          {/if}
        </div>

        {#if cTraining}
          <div class="w-full bg-surface-container-low rounded-full h-2.5 mb-4 overflow-hidden">
            <div class="bg-primary h-2.5 rounded-full transition-all duration-500"
              style="width: {cTotalEpochs > 0 ? (cCurrentEpoch / cTotalEpochs * 100) : 0}%"></div>
          </div>
        {/if}

        {#if cMetrics.length > 0}
          <div class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <BarChart3 size={16} class="text-primary" />
              <h3 class="text-xs font-bold text-on-surface">Métriques par epoch</h3>
            </div>
            <div class="max-h-40 overflow-y-auto rounded-xl border border-mint-subtle">
              <table class="w-full text-xs">
                <thead class="bg-surface-container-low">
                  <tr>
                    <th class="text-left px-3 py-2 font-semibold text-outline">Epoch</th>
                    <th class="text-right px-3 py-2 font-semibold text-outline">Loss</th>
                    <th class="text-right px-3 py-2 font-semibold text-outline">Accuracy</th>
                    <th class="text-right px-3 py-2 font-semibold text-outline">F1</th>
                  </tr>
                </thead>
                <tbody>
                  {#each cMetrics as m}
                    <tr class="border-t border-mint-subtle/50">
                      <td class="px-3 py-1.5 font-mono text-on-surface">{m.epoch}</td>
                      <td class="px-3 py-1.5 text-right font-mono text-on-surface">{m.loss?.toFixed(4) ?? '—'}</td>
                      <td class="px-3 py-1.5 text-right font-mono text-on-surface">{m.accuracy != null ? (m.accuracy * 100).toFixed(1) + '%' : '—'}</td>
                      <td class="px-3 py-1.5 text-right font-mono text-on-surface">{m.f1 != null ? (m.f1 * 100).toFixed(1) + '%' : '—'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        {/if}

        <div class="mb-4">
          <div class="flex items-center gap-2 mb-2">
            <FileText size={16} class="text-primary" />
            <h3 class="text-xs font-bold text-on-surface">Logs</h3>
            <span class="text-[10px] text-outline">{cLogs.length} lignes</span>
          </div>
          <div bind:this={logContainer} class="max-h-80 overflow-y-auto font-mono text-[11px] bg-gray-900 text-green-300 rounded-xl p-3 space-y-0.5">
            {#each cLogs as log}
              <div>{log}</div>
            {/each}
            {#if cTraining}
              <div class="animate-pulse text-green-300">_</div>
            {/if}
          </div>
        </div>

        {#if cError}
          <div class="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 mb-4">
            <AlertCircle size={14} /> {cError}
          </div>
        {/if}

        {#if cResult && !cTraining}
          <div class="p-4 rounded-xl bg-green-50 border border-green-200">
            <div class="flex items-center gap-2 mb-3">
              <CheckCircle2 size={18} class="text-green-600" />
              <h3 class="text-sm font-bold text-green-800">Entraînement terminé</h3>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="text-center p-3 rounded-lg bg-white/50">
                <p class="text-[10px] text-green-700/70">Accuracy</p>
                <p class="text-xl font-bold text-green-800">{(cResult.accuracy * 100).toFixed(1)}%</p>
              </div>
              <div class="text-center p-3 rounded-lg bg-white/50">
                <p class="text-[10px] text-green-700/70">F1 Score</p>
                <p class="text-xl font-bold text-green-800">{(cResult.f1 * 100).toFixed(1)}%</p>
              </div>
              <div class="text-center p-3 rounded-lg bg-white/50">
                <p class="text-[10px] text-green-700/70">Échantillons</p>
                <p class="text-xl font-bold text-green-800">{cResult.samples}</p>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick={deployModel} class="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-all cursor-pointer border-none">
                <Download size={16} /> Déployer
              </button>
              <button onclick={handleClose} class="px-4 py-2.5 bg-white text-on-surface-variant rounded-xl text-sm font-semibold hover:bg-surface-container transition-all cursor-pointer border border-mint-subtle">
                Fermer
              </button>
            </div>
          </div>
        {/if}

        {#if !cTraining && !cResult && !cError}
          <div class="border-t border-mint-subtle pt-4 mt-2">
            <button onclick={() => { cLogs = []; cMetrics = []; cResult = null; cError = ''; }}
              class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer border-none">
              <Play size={16} /> Nouvel entraînement
            </button>
          </div>
        {/if}
      {:else}
        <div class="space-y-6">
          <div class="text-center pb-2">
            <Activity size={40} class="text-outline mx-auto mb-2" />
            <p class="text-sm text-outline">Configure les paramètres et lance l'entraînement de CamenBert</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-container-low">
            <div>
              <label for="train-epochs" class="block text-xs font-semibold text-outline mb-1">Epochs</label>
              <input id="train-epochs" type="number" bind:value={epochs} min="1" max="50"
                class="w-full px-3 py-2 rounded-lg border border-mint-subtle text-sm font-mono bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label for="train-batch" class="block text-xs font-semibold text-outline mb-1">Batch size</label>
              <input id="train-batch" type="number" bind:value={batchSize} min="4" max="128" step="4"
                class="w-full px-3 py-2 rounded-lg border border-mint-subtle text-sm font-mono bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div>
              <label for="train-lr" class="block text-xs font-semibold text-outline mb-1">Learning rate</label>
              <input id="train-lr" type="number" bind:value={lr} min="1e-6" max="1e-3" step="1e-6"
                class="w-full px-3 py-2 rounded-lg border border-mint-subtle text-sm font-mono bg-white text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
          </div>

          <button
            onclick={startCamenBert}
            class="flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer border-none"
          >
            <Play size={18} /> Lancer l'entraînement
          </button>
        </div>
      {/if}

    {:else}
      <!-- Classifier tab -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-white border border-mint-subtle rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <Cog size={18} class="text-primary" />
            <h3 class="text-sm font-bold text-on-surface">Configuration</h3>
          </div>
          <div class="space-y-3">
            <div>
              <label for="clf-epochs" class="block text-xs font-semibold text-outline mb-1">Époques</label>
              <input id="clf-epochs" type="number" bind:value={clEpochs} min={1} max={10000}
                class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <p class="text-[10px] text-outline mt-1">Nombre de passages sur les donnees</p>
            </div>
            <div>
              <label for="clf-lr" class="block text-xs font-semibold text-outline mb-1">Learning rate</label>
              <input id="clf-lr" type="number" bind:value={clLr} min={0.0001} max={1} step={0.001}
                class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <p class="text-[10px] text-outline mt-1">Vitesse d'apprentissage (0.01 = défaut)</p>
            </div>
            <div>
              <label for="clf-layers" class="block text-xs font-semibold text-outline mb-1">Couches</label>
              <select id="clf-layers" bind:value={clLayers}
                class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                <option value={1}>1 couche (linéaire — 21 features vers 17 intentions)</option>
                <option value={2}>2 couches (profond — nécessite embeddings)</option>
              </select>
            </div>
            <div>
              <label for="clf-margin" class="block text-xs font-semibold text-outline mb-1">Marge (margin loss)</label>
              <input id="clf-margin" type="number" bind:value={clMargin} min={0.1} max={2} step={0.1}
                class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <p class="text-[10px] text-outline mt-1">Seuil de confiance requis (0.5 = défaut)</p>
            </div>
            <button onclick={runClassifier} disabled={clTraining || exCount === 0}
              class="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 cursor-pointer border-none mt-2">
              {#if clTraining}
                <div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                Entraînement...
              {:else}
                <Play size={16} /> Lancer
              {/if}
            </button>
          </div>
        </div>

        <div class="bg-white border border-mint-subtle rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <List size={18} class="text-primary" />
              <h3 class="text-sm font-bold text-on-surface">Données ({exCount})</h3>
            </div>
            <button onclick={openAdd}
              class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-700 cursor-pointer border-none">
              <Plus size={14} /> Ajouter
            </button>
          </div>
          {#if exLoading}
            <p class="text-sm text-outline">Chargement...</p>
          {:else if exCount === 0}
            <div class="text-center py-8">
              <Activity size={32} class="text-outline mx-auto mb-2" />
              <p class="text-sm text-outline">Aucun exemple</p>
            </div>
          {:else}
            <div class="max-h-72 overflow-y-auto space-y-1.5">
              {#each examples as ex}
                <button onclick={() => openEdit(ex)}
                  class="w-full text-left px-3 py-2 rounded-xl bg-surface-container-low text-xs hover:bg-surface-container cursor-pointer border-none">
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

      {#if clError}
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {clError}
        </div>
      {/if}

      {#if clTraining}
        <div class="mb-4 p-5 bg-white border border-mint-subtle rounded-2xl text-center">
          <div class="flex items-center justify-center gap-2 text-sm font-semibold text-on-surface">
            <div class="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            Entraînement en cours
          </div>
          <div class="mt-3 w-64 mx-auto bg-surface-container-low rounded-full h-2 overflow-hidden">
            <div class="bg-primary h-2 rounded-full animate-pulse" style="width: 100%"></div>
          </div>
        </div>
      {/if}

      {#if clResult && !clTraining}
        <div class="bg-white border border-mint-subtle rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <CheckCircle2 size={20} class="text-green-600" />
            <h3 class="text-sm font-bold text-on-surface">Résultat</h3>
          </div>
          <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="text-center p-3 rounded-xl bg-surface-container-low">
              <p class="text-[10px] text-outline mb-1">Époques</p>
              <p class="text-lg font-bold text-on-surface">{clResult.config?.epochs}</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-surface-container-low">
              <div class="flex items-center justify-center gap-1 text-[10px] text-outline mb-1">
                <Target size={12} /> Précision
              </div>
              <p class="text-lg font-bold text-on-surface">{(clResult.finalAccuracy * 100).toFixed(1)}%</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-surface-container-low">
              <p class="text-[10px] text-outline mb-1">Couches</p>
              <p class="text-lg font-bold text-on-surface">{clResult.config?.layers}</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-surface-container-low">
              <p class="text-[10px] text-outline mb-1">LR</p>
              <p class="text-lg font-bold text-on-surface">{clResult.config?.learningRate}</p>
            </div>
          </div>
          {#if clResult.metrics?.length}
            <div>
              <div class="flex items-center gap-1 mb-2 text-[10px] text-outline">
                <TrendingUp size={12} /> Métriques
              </div>
              <div class="max-h-40 overflow-y-auto rounded-xl border border-mint-subtle">
                <table class="w-full text-xs">
                  <thead class="bg-surface-container-low">
                    <tr>
                      <th class="text-left px-3 py-2 font-semibold text-outline">Epoch</th>
                      <th class="text-right px-3 py-2 font-semibold text-outline">Loss</th>
                      <th class="text-right px-3 py-2 font-semibold text-outline">Acc</th>
                      <th class="text-right px-3 py-2 font-semibold text-outline">Top-3</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each clResult.metrics as m}
                      <tr class="border-t border-mint-subtle/50">
                        <td class="px-3 py-1.5 font-mono text-on-surface">{m.epoch}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-on-surface">{m.loss?.toFixed(4) ?? '—'}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-on-surface">{m.accuracy != null ? (m.accuracy * 100).toFixed(1) + '%' : '—'}</td>
                        <td class="px-3 py-1.5 text-right font-mono text-on-surface">{m.top3Accuracy != null ? (m.top3Accuracy * 100).toFixed(1) + '%' : '—'}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    {/if}
  {/snippet}
</Drawer>

<!-- Classifier example editor sub-drawer -->
<svelte:body class:overflow-hidden={exampleDrawer} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<button
  aria-label="Fermer"
  class="fixed inset-0 bg-black/30 z-40 transition-opacity cursor-default"
  class:pointer-events-auto={exampleDrawer}
  class:opacity-100={exampleDrawer}
  class:opacity-0={!exampleDrawer}
  class:pointer-events-none={!exampleDrawer}
  onclick={() => exampleDrawer = false}
></button>

<aside
  class="fixed top-0 right-0 h-full w-full max-w-lg bg-surface z-50 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
  class:translate-x-0={exampleDrawer}
  class:translate-x-full={!exampleDrawer}
>
  <header class="flex items-center justify-between px-6 h-16 border-b border-mint-subtle shrink-0">
    <h2 class="text-lg font-bold text-on-surface">
      {editing ? 'Modifier' : 'Ajouter'} un exemple
    </h2>
    <button onclick={() => exampleDrawer = false} aria-label="Fermer"
      class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all cursor-pointer border-none">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
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
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label for="ex-expected" class="block text-xs font-semibold text-outline mb-1">Intention</label>
        <select id="ex-expected" bind:value={formExpected}
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          {#each INTENTS as intent}
            <option value={intent}>{intent}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="ex-label" class="block text-xs font-semibold text-outline mb-1">Libellé</label>
        <input id="ex-label" bind:value={formLabel} placeholder="Ex: Loyer mensuel"
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label for="ex-category" class="block text-xs font-semibold text-outline mb-1">Catégorie</label>
        <input id="ex-category" bind:value={formCategory} placeholder="LOGEMENT"
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ex-percent" class="block text-xs font-semibold text-outline mb-1">Percent (%)</label>
          <input id="ex-percent" type="number" bind:value={formPercent}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="ex-change" class="block text-xs font-semibold text-outline mb-1">Change (%)</label>
          <input id="ex-change" type="number" bind:value={formChange}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ex-amount" class="block text-xs font-semibold text-outline mb-1">Montant</label>
          <input id="ex-amount" type="number" bind:value={formAmount}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="ex-prev-amount" class="block text-xs font-semibold text-outline mb-1">Montant préc.</label>
          <input id="ex-prev-amount" type="number" bind:value={formPrevAmount}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ex-expense-ratio" class="block text-xs font-semibold text-outline mb-1">Ratio dép.</label>
          <input id="ex-expense-ratio" type="number" bind:value={formExpenseRatio}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label for="ex-total-revenue" class="block text-xs font-semibold text-outline mb-1">Revenus</label>
          <input id="ex-total-revenue" type="number" bind:value={formTotalRevenue}
            class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>
      <div>
        <label for="ex-total-expenses" class="block text-xs font-semibold text-outline mb-1">Dépenses totales</label>
        <input id="ex-total-expenses" type="number" bind:value={formTotalExpenses}
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
      <div>
        <label for="ex-notes" class="block text-xs font-semibold text-outline mb-1">Notes</label>
        <input id="ex-notes" bind:value={formNotes} placeholder="Optionnel"
          class="w-full px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>
    </div>
  </div>

  <div class="px-6 py-4 border-t border-mint-subtle shrink-0 bg-surface flex items-center justify-between">
    <div>
      {#if editing}
        <button onclick={() => removeExample(editing.id)}
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 text-sm font-semibold hover:bg-red-50 cursor-pointer border-none">
          <Trash2 size={16} /> Supprimer
        </button>
      {/if}
    </div>
    <div class="flex gap-2">
      <button onclick={() => exampleDrawer = false}
        class="px-4 py-2 rounded-xl bg-surface border border-mint-subtle text-on-surface-variant text-sm font-semibold hover:bg-surface-container cursor-pointer">
        Annuler
      </button>
      <button onclick={saveExample} disabled={saving}
        class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 cursor-pointer border-none">
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
