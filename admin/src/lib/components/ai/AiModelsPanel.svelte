<script lang="ts">
  import { Brain, Gauge, Hash, Clock, AlertCircle } from '@lucide/svelte';

  let {
    models,
    camenBertStatus,
  }: {
    models: any[];
    camenBertStatus?: any;
  } = $props();

  const STATUS_COLORS: Record<string, string> = {
    loaded: 'bg-green-50 text-green-700 ring-green-200',
    loading: 'bg-amber-50 text-amber-700 ring-amber-200',
    unloaded: 'bg-slate-50 text-slate-700 ring-slate-200',
    error: 'bg-red-50 text-red-700 ring-red-200',
  };
</script>

<div class="space-y-4">
  {#if camenBertStatus?.metrics?.totalInferences > 0}
    <div>
      <p class="text-xs font-bold text-on-surface mb-2 flex items-center gap-1"><Gauge size={14} /> CamenBert · Métriques en temps réel</p>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div class="p-2 rounded-lg bg-surface-container-low">
          <div class="flex items-center gap-1 text-outline"><Hash size={12} /> Inférences</div>
          <p class="font-bold text-on-surface font-mono">{camenBertStatus.metrics.totalInferences}</p>
        </div>
        <div class="p-2 rounded-lg bg-surface-container-low">
          <div class="flex items-center gap-1 text-outline"><AlertCircle size={12} /> Nuls</div>
          <p class="font-bold text-on-surface font-mono">{camenBertStatus.metrics.nullResults} ({(camenBertStatus.metrics.nullRate * 100).toFixed(1)}%)</p>
        </div>
        <div class="p-2 rounded-lg bg-surface-container-low">
          <div class="flex items-center gap-1 text-outline"><Clock size={12} /> Lat. moy.</div>
          <p class="font-bold text-on-surface font-mono">{camenBertStatus.metrics.avgLatencyMs.toFixed(0)} ms</p>
        </div>
        <div class="p-2 rounded-lg bg-surface-container-low">
          <div class="flex items-center gap-1 text-outline"><Clock size={12} /> Dernière</div>
          <p class="font-bold text-on-surface font-mono">{camenBertStatus.metrics.lastLatencyMs.toFixed(0)} ms</p>
        </div>
      </div>
    </div>
  {:else if camenBertStatus?.ready}
    <div class="p-3 rounded-xl bg-surface-container-low text-xs text-outline text-center">Aucune inference effectuée pour le moment. Les métriques apparaîtront après quelques tests.</div>
  {/if}

  <div>
    {#if models.length === 0}
      <p class="text-xs text-outline text-center py-4">Aucun modèle chargé</p>
    {:else}
      <p class="text-xs font-bold text-on-surface mb-2">Modèles disponibles</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        {#each models as model}
          <div class="p-4 rounded-xl border border-mint-subtle bg-white">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <Brain size={16} class="text-primary" />
                <span class="text-sm font-bold text-on-surface">{model.name}</span>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold {STATUS_COLORS[model.status]}">
                {model.status === 'loaded' ? 'Chargé' : model.status === 'unloaded' ? 'Déchargé' : model.status}
              </span>
            </div>
            <div class="text-xs text-outline space-y-0.5">
              <div class="flex justify-between"><span>Type</span><span class="font-mono text-on-surface">{model.type}</span></div>
              <div class="flex justify-between"><span>Taille</span><span class="font-mono text-on-surface">{model.sizeMB?.toFixed(1) ?? '?'} MB</span></div>
              <div class="flex justify-between"><span>Mémoire</span><span class="font-mono text-on-surface">{model.memoryMB} MB</span></div>
              <div class="flex justify-between"><span>Dernière util.</span><span class="text-on-surface">{model.lastUsed !== 'jamais' ? new Date(model.lastUsed).toLocaleString('fr-FR') : '·'}</span></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
