<script lang="ts">
  import { api } from '../../api';

  let {
    camenBertStatus,
    embeddingStats,
    datasetInfo,
    regexStats,
  }: {
    camenBertStatus: any;
    embeddingStats: any;
    datasetInfo: any;
    regexStats: any;
  } = $props();

  let loadingModel = $state(false);
  let loadError = $state('');

  async function loadModel() {
    loadingModel = true;
    loadError = '';
    try {
      const res = await api.loadCamenBert();
      if (res.ready) {
        camenBertStatus = { ...camenBertStatus, ready: true };
      }
    } catch (e: any) {
      loadError = e.message;
    } finally {
      loadingModel = false;
    }
  }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- CamenBert -->
  <div class="p-4 rounded-2xl bg-white border border-mint-subtle">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-primary-container/40 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M6 15a6 6 0 0 1 12 0v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2z"/></svg>
        </div>
        <span class="text-sm font-bold text-on-surface">CamenBert</span>
      </div>
      <div class="flex items-center gap-1">
        {#if camenBertStatus?.lazy}
          <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-purple-50 text-purple-700">Lazy</span>
        {/if}
        {#if camenBertStatus?.ready}
          <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700">● Chargé</span>
        {:else}
          <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">Non chargé</span>
        {/if}
      </div>
    </div>
    {#if !camenBertStatus?.ready}
      <button onclick={loadModel} disabled={loadingModel}
        class="w-full mt-2 text-xs px-3 py-1.5 rounded-lg font-semibold bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 border-none">
        {#if loadingModel}
          <span class="inline-block animate-spin mr-1">⟳</span> Chargement...
        {:else}
          Charger le modèle CamenBert
        {/if}
      </button>
    {/if}
    {#if loadError}
      <div class="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 leading-tight">
        <p>{loadError}</p>
        {#if loadError.includes('External data') || loadError.includes('onnx.data')}
          <p class="mt-1 font-semibold">→ Lance dans le terminal : <code class="bg-red-100 px-1 rounded">bash src/sms/camenbert/scripts/download-camenbert.sh</code></p>
        {/if}
      </div>
    {:else if camenBertStatus?.loadError}
      <div class="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700 leading-tight">
        <p>{camenBertStatus.loadError}</p>
        {#if camenBertStatus.loadError.includes('External data') || camenBertStatus.loadError.includes('onnx.data')}
          <p class="mt-1 font-semibold">→ Lance dans le terminal : <code class="bg-red-100 px-1 rounded">bash src/sms/camenbert/scripts/download-camenbert.sh</code></p>
        {/if}
      </div>
    {/if}
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Modèle</p>
        <p class="font-semibold text-on-surface font-mono text-[11px] truncate">{camenBertStatus?.modelName ?? '·'}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Seuil</p>
        <p class="font-semibold text-on-surface">{camenBertStatus?.threshold != null ? (camenBertStatus.threshold * 100) + '%' : '·'}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Mémoire</p>
        <p class="font-semibold text-on-surface">80 MB</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Accuracy</p>
        <p class="font-semibold text-on-surface">·</p>
      </div>
      {#if camenBertStatus?.metrics?.totalInferences > 0}
        <div class="p-2 rounded-lg bg-surface-container-low">
          <p class="text-outline">Inférences</p>
          <p class="font-semibold text-on-surface font-mono">{camenBertStatus.metrics.totalInferences}</p>
        </div>
        <div class="p-2 rounded-lg bg-surface-container-low">
          <p class="text-outline">Latence moy.</p>
          <p class="font-semibold text-on-surface font-mono">{camenBertStatus.metrics.avgLatencyMs.toFixed(0)} ms</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Embeddings -->
  <div class="p-4 rounded-2xl bg-white border border-mint-subtle">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-primary-container/40 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
        </div>
        <span class="text-sm font-bold text-on-surface">Embeddings</span>
      </div>
      {#if embeddingStats?.loaded}
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700">● Chargé</span>
      {:else}
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-700">○ Non chargé</span>
      {/if}
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Vocabulaire</p>
        <p class="font-semibold text-on-surface">{embeddingStats?.vocabSize ?? 0}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Catégories</p>
        <p class="font-semibold text-on-surface">{embeddingStats?.categories ?? 0}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low col-span-2">
        <p class="text-outline">Fichier</p>
        <p class="font-semibold text-on-surface font-mono text-[11px] truncate">{embeddingStats?.file ?? '·'}</p>
      </div>
    </div>
  </div>

  <!-- Dataset -->
  <div class="p-4 rounded-2xl bg-white border border-mint-subtle">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-primary-container/40 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/></svg>
        </div>
        <span class="text-sm font-bold text-on-surface">Dataset</span>
      </div>
      {#if datasetInfo?.exists}
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700">● Prêt</span>
      {:else}
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700">✗ Manquant</span>
      {/if}
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Exemples</p>
        <p class="font-semibold text-on-surface">{datasetInfo?.count ?? 0}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Labels</p>
        <p class="font-semibold text-on-surface">{datasetInfo?.labels ? Object.keys(datasetInfo.labels).length : '·'}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low col-span-2">
        <p class="text-outline">Dernier entraînement</p>
        <p class="font-semibold text-on-surface">
          {#if datasetInfo?.lastTraining}
            {new Date(datasetInfo.lastTraining).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          {:else}
            ·          {/if}
        </p>
      </div>
    </div>
  </div>

  <!-- RegEx -->
  <div class="p-4 rounded-2xl bg-white border border-mint-subtle">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-primary-container/40 flex items-center justify-center">
          <svg class="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M3 16v5h5"/><path d="M16 21h5v-5"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
        </div>
        <span class="text-sm font-bold text-on-surface">Règles RegEx</span>
      </div>
      <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-50 text-green-700">● Actif</span>
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs">
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Patterns</p>
        <p class="font-semibold text-on-surface">{regexStats?.total ?? '·'}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Opérateurs</p>
        <p class="font-semibold text-on-surface">{regexStats?.operators?.length ?? '·'}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Crédit</p>
        <p class="font-semibold text-green-700">{regexStats?.creditCount ?? '·'}</p>
      </div>
      <div class="p-2 rounded-lg bg-surface-container-low">
        <p class="text-outline">Débit</p>
        <p class="font-semibold text-red-700">{regexStats?.debitCount ?? '·'}</p>
      </div>
    </div>
  </div>
</div>