<script lang="ts">
  import { Cpu, RotateCw, AlertCircle, Info, FlaskConical, Brain, Network, TrendingUp, Activity, X, CheckCircle, XCircle, ScrollText } from '@lucide/svelte';
  import { onMount, tick } from 'svelte';
  import { api } from '../lib/api';
  import Drawer from '../lib/components/Drawer.svelte';
  import InfoDrawer from '../lib/components/InfoDrawer.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import AiStatusCards from '../lib/components/ai/AiStatusCards.svelte';
  import UnifiedTestBar from '../lib/components/ai/UnifiedTestBar.svelte';
  import SectionCard from '../lib/components/ai/SectionCard.svelte';
  import AiDetailedTest from '../lib/components/ai/AiDetailedTest.svelte';
  import AiModelsPanel from '../lib/components/ai/AiModelsPanel.svelte';
  import AiEmbeddingPanel from '../lib/components/ai/AiEmbeddingPanel.svelte';
  import AiTrainingDrawer from '../lib/components/ai/AiTrainingDrawer.svelte';
  import AiDriftPanel from '../lib/components/ai/AiDriftPanel.svelte';
  import AiTrainingLogsPanel from '../lib/components/ai/AiTrainingLogsPanel.svelte';

  let loading = $state(true);
  let error = $state('');
  let models = $state<any[]>([]);
  let camenBertStatus = $state<any>(null);
  let embeddingStats = $state<any>(null);
  let datasetInfo = $state<any>(null);
  let regexStats = $state<any>(null);
  let classifierResult = $state<any>(null);
  let cbResult = $state<any>(null);
  let smsResult = $state<any>(null);

  let drawer = $state<string | null>(null);
  let helpOpen = $state(false);
  let testBody = $state('');
  let testLoading = $state(false);
  let trainingOpen = $state(false);
  let driftOpen = $state(false);
  let logsOpen = $state(false);
  let testError = $state('');

  let parsedSms = $derived(smsResult?.steps?.parseSms);

  function clearResults() {
    classifierResult = null;
    cbResult = null;
    smsResult = null;
    testError = '';
    testBody = '';
  }

  onMount(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30_000);
    return () => clearInterval(interval);
  });

  async function refreshAll() {
    try {
      const [mRes, eRes, dRes, rRes] = await Promise.all([
        api.modelList().catch(() => null),
        api.embeddingStats().catch(() => null),
        api.datasetInfo().catch(() => null),
        api.regexStats().catch(() => null),
      ]);
      if (mRes) {
        models = mRes.models ?? [];
        camenBertStatus = mRes.camenBertStatus ?? null;
      }
      embeddingStats = eRes;
      datasetInfo = dRes;
      regexStats = rRes;
    } catch {} finally { loading = false; }
  }

  async function runUnifiedTest(body: string) {
    if (!body.trim()) return;
    testBody = body;
    testLoading = true;
    testError = '';
    classifierResult = null;
    cbResult = null;
    smsResult = null;
    await tick();
    try {
      const [clsRes, camRes, smsResData] = await Promise.all([
        api.testClassifier(body).catch((e) => { console.error('CLS FAIL', e); testError += `Classifieur: ${e.message}\n`; return null; }),
        api.testCamenBert(body).catch((e) => { console.error('CB FAIL', e); testError += `CamenBert: ${e.message}\n`; return null; }),
        api.debugSmsFilter({ address: '', body }).catch((e) => { console.error('SMS FAIL', e); testError += `Filtre SMS: ${e.message}\n`; return null; }),
      ]);
      console.log('TEST RESULTS', { clsRes, camRes, smsResData });
      classifierResult = clsRes;
      cbResult = camRes;
      smsResult = smsResData;
    } finally { testLoading = false; }
  }
</script>

<div class="w-full">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <Cpu size={24} class="text-primary" />
      <h2 class="text-2xl font-bold text-on-surface">Modèles</h2>
    </div>
    <div class="flex items-center gap-2">
      <button onclick={() => { helpOpen = true; }}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
        <Info size={14} /> Aide
      </button>
      <button onclick={refreshAll}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
        <RotateCw size={14} /> Rafraîchir
      </button>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12"><Spinner text="Chargement..." size="lg" /></div>
  {:else if error}
    <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2 mb-6">
      <AlertCircle size={18} /> {error}
    </div>
  {:else}
    <AiStatusCards {camenBertStatus} {embeddingStats} {datasetInfo} {regexStats} />

    <div class="mt-6 mb-8">
      <UnifiedTestBar {testLoading} onTest={(body) => runUnifiedTest(body)} />

      {#if testLoading || classifierResult || cbResult || smsResult || testError}
        <div class="mt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-bold text-on-surface">Résultats</h3>
            <button onclick={clearResults}
              class="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-low text-outline text-[11px] font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
              <X size={12} /> Effacer
            </button>
          </div>

          {#if testLoading}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div class="p-3 rounded-xl bg-surface-container-low animate-pulse">
                <div class="h-3 w-20 bg-outline/20 rounded mb-2"></div>
                <div class="h-4 w-16 bg-outline/20 rounded"></div>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low animate-pulse">
                <div class="h-3 w-20 bg-outline/20 rounded mb-2"></div>
                <div class="h-4 w-24 bg-outline/20 rounded"></div>
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low animate-pulse">
                <div class="h-3 w-20 bg-outline/20 rounded mb-2"></div>
                <div class="h-4 w-16 bg-outline/20 rounded"></div>
              </div>
            </div>
          {:else if classifierResult || cbResult || smsResult}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div class="p-3 rounded-xl bg-surface-container-low">
                <div class="font-semibold text-outline mb-1">RegEx (parseSms)</div>
                {#if parsedSms}
                  <div class="text-on-surface">Direction: <span class="font-bold {parsedSms.direction === 'CREDIT' ? 'text-green-600' : parsedSms.direction === 'DEBIT' ? 'text-red-600' : ''}">{parsedSms.direction ?? '·'}</span></div>
                  <div class="text-on-surface">Montant: <span class="font-mono">{parsedSms.amount ?? '·'} FCFA</span></div>
                {:else}
                  <div class="text-outline">Non parsé</div>
                {/if}
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low">
                <div class="font-semibold text-outline mb-1">CamenBert</div>
                {#if cbResult?.ready && cbResult?.result}
                  <div class="text-on-surface">Catégorie: <span class="font-bold">{cbResult.result.category}</span></div>
                  <div class="text-on-surface">Confiance: <span class="font-mono">{(cbResult.result.confidence * 100).toFixed(1)}%</span></div>
                {:else}
                  <div class="text-outline">{cbResult?.message ?? 'Non disponible'}</div>
                {/if}
              </div>
              <div class="p-3 rounded-xl bg-surface-container-low">
                <div class="font-semibold text-outline mb-1">Classifieur</div>
                {#if classifierResult}
                  <div class="text-on-surface">Catégorie: <span class="font-bold">{classifierResult.winner}</span></div>
                {:else}
                  <div class="text-outline">·</div>
                {/if}
                {#if smsResult}
                  <div class="mt-1 flex items-center gap-1">
                    {#if smsResult.verdict === 'INSERT'}
                      <CheckCircle size={12} class="text-green-600" />
                    {:else}
                      <XCircle size={12} class="text-red-600" />
                    {/if}
                    <span class="px-2 py-0.5 rounded text-xs font-bold {smsResult.verdict === 'INSERT' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}">{smsResult.verdict}</span>
                    <span class="text-outline ml-1">{smsResult.reason}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          {#if testError}
            <div class="mt-2 p-3 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-700 whitespace-pre-line">{testError}</div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SectionCard icon={FlaskConical} title="Test détaillé" description="Classifieur, CamenBert, Filtre SMS" onclick={() => drawer = 'test'} />
      <SectionCard icon={Brain} title="Modèles & Performance" description="Modèles chargés, statut, métriques temps réel" badge={models.length > 0 ? `${models.filter(m => m.status === 'loaded').length}/${models.length}` : undefined} onclick={() => drawer = 'models'} />
      <SectionCard icon={Network} title="Embeddings & Recherche" description="Recherche sémantique, vocabulaire, centroïdes" badge={embeddingStats?.loaded ? 'Chargé' : undefined} onclick={() => drawer = 'embeddings'} />
      <SectionCard icon={TrendingUp} title="Entraînement" description="CamenBert (neural) · Classifieur (catégoriel)" badge={datasetInfo?.exists ? 'Prêt' : undefined} onclick={() => trainingOpen = true} />
    </div>
    <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <SectionCard icon={Activity} title="Drift & Monitoring" description="Distribution, alertes, baselines des prédictions" badge={camenBertStatus?.metrics?.totalInferences ? `${camenBertStatus.metrics.totalInferences} infs` : undefined} onclick={() => driftOpen = true} />
      <SectionCard icon={ScrollText} title="Logs d'entraînement" description="Sortie des runs passés, paginée" onclick={() => logsOpen = true} />
    </div>
    <p class="text-[10px] text-outline mt-2 text-center">Entraîne CamenBert (fine-tune du modèle neural SMS) ou le classifieur catégoriel (dépenses).</p>
  {/if}
</div>

<InfoDrawer open={helpOpen} onclose={() => helpOpen = false} />

<Drawer open={drawer === 'test'} title="Test détaillé" widthClass="max-w-xl" onclose={() => drawer = null}>
  {#snippet children()}
    <AiDetailedTest />
  {/snippet}
</Drawer>

<Drawer open={drawer === 'models'} title="Modèles & Performance" widthClass="max-w-xl" onclose={() => drawer = null}>
  {#snippet children()}
    <AiModelsPanel {models} {camenBertStatus} />
  {/snippet}
</Drawer>

<Drawer open={drawer === 'embeddings'} title="Embeddings & Recherche" widthClass="max-w-xl" onclose={() => drawer = null}>
  {#snippet children()}
    <AiEmbeddingPanel {embeddingStats} />
  {/snippet}
</Drawer>

<Drawer open={driftOpen} title="Drift & Monitoring" widthClass="max-w-xl" onclose={() => driftOpen = false}>
  {#snippet children()}
    <AiDriftPanel />
  {/snippet}
</Drawer>

<Drawer open={logsOpen} title="Logs d'entraînement" widthClass="max-w-2xl" onclose={() => logsOpen = false}>
  {#snippet children()}
    <AiTrainingLogsPanel />
  {/snippet}
</Drawer>

<AiTrainingDrawer bind:open={trainingOpen} onDeploy={refreshAll} />
