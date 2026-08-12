<script lang="ts">
  import { api } from '../../api';
  import { AlertTriangle, Activity, Save, RotateCw, TrendingUp, Hash, Gauge } from '@lucide/svelte';
  import Spinner from '../Spinner.svelte';

  let loading = $state(true);
  let drift = $state<any>(null);
  let stats = $state<any>(null);
  let error = $state('');

  let saveLoading = $state(false);

  async function refresh() {
    loading = true;
    error = '';
    try {
      const [d, s] = await Promise.all([
        api.driftReport().catch(() => null),
        api.monitoringStats().catch(() => null),
      ]);
      drift = d;
      stats = s;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function saveBase() {
    saveLoading = true;
    try {
      await api.saveBaseline();
      await refresh();
    } catch (e: any) {
      error = e.message;
    } finally {
      saveLoading = false;
    }
  }

  $effect(() => { refresh(); });
</script>

<div class="space-y-4">
  {#if loading}
    <div class="text-center py-6"><Spinner text="Chargement monitoring..." size="md" /></div>
  {:else if error}
    <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
  {:else}
    {#if drift?.alerts?.length}
      <div class="space-y-2">
        <p class="text-xs font-bold text-red-700 flex items-center gap-1"><AlertTriangle size={14} /> Alertes actives</p>
        {#each drift.alerts as alert}
          <div class="p-2 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">{alert}</div>
        {/each}
      </div>
    {:else}
      <p class="text-xs text-green-700 flex items-center gap-1">✓ Aucune alerte de drift</p>
    {/if}

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="p-3 rounded-xl bg-surface-container-low">
        <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><Activity size={13} /> Refus</div>
        <p class="text-lg font-bold text-on-surface">{drift?.refusalRate != null ? (drift.refusalRate * 100).toFixed(1) + '%' : '·'}</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container-low">
        <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><TrendingUp size={13} /> DIVERS</div>
        <p class="text-lg font-bold text-on-surface">{drift?.diversRate != null ? (drift.diversRate * 100).toFixed(1) + '%' : '·'}</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container-low">
        <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><Gauge size={13} /> Conf. moy.</div>
        <p class="text-lg font-bold text-on-surface">{stats?.avgConfidence != null ? (stats.avgConfidence * 100).toFixed(0) + '%' : '·'}</p>
      </div>
      <div class="p-3 rounded-xl bg-surface-container-low">
        <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><Hash size={13} /> Prédictions</div>
        <p class="text-lg font-bold text-on-surface">{stats?.totalLogs ?? 0}</p>
      </div>
    </div>

    {#if stats?.topPredictions}
      <div>
        <p class="text-xs font-bold text-on-surface mb-2">Distribution des catégories</p>
        <div class="space-y-1.5">
          {#each Object.entries(stats.topPredictions) as [label, count]}
            {@const pct = stats.totalLogs > 0 ? ((count as number) / stats.totalLogs * 100) : 0}
            <div class="flex items-center gap-2 text-xs">
              <span class="w-24 truncate text-on-surface font-medium">{label}</span>
              <div class="flex-1 h-4 rounded-full bg-surface-container-low overflow-hidden">
                <div class="h-full rounded-full bg-primary/60 transition-all" style="width: {pct}%"></div>
              </div>
              <span class="w-14 text-right text-outline font-mono text-[11px]">{pct.toFixed(1)}%</span>
              <span class="w-8 text-right text-outline font-mono text-[11px]">{count}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#if stats?.avgLatency != null}
      <div class="p-3 rounded-xl bg-surface-container-low text-xs">
        <span class="text-outline">Latence moyenne:</span>
        <span class="font-bold text-on-surface font-mono">{stats.avgLatency.toFixed(0)} ms</span>
      </div>
    {/if}

    <div class="flex gap-2">
      <button onclick={refresh}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
        <RotateCw size={13} /> Rafraîchir
      </button>
      <button onclick={saveBase} disabled={saveLoading}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none disabled:opacity-50">
        <Save size={13} /> {saveLoading ? 'Sauvegarde...' : 'Sauvegarder baseline'}
      </button>
    </div>
  {/if}
</div>
