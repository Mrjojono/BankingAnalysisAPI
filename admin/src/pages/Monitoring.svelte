<script lang="ts">
  import { onMount } from 'svelte';
  import { RotateCw, Server, Database, MemoryStick, CircleCheck, CircleX, Activity, TrendingUp, Gauge, Hash, Save, AlertTriangle, Info } from '@lucide/svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Card from '../lib/components/Card.svelte';
  import Spinner from '../lib/components/Spinner.svelte';
  import InfoDrawer from '../lib/components/InfoDrawer.svelte';

  let health: any = null;
  let drift: any = null;
  let stats: any = null;
  let loading = $state(true);
  let error = $state('');
  let saveLoading = $state(false);
  let helpOpen = $state(false);

  async function refresh() {
    loading = true;
    error = '';
    try {
      const [h, d, s] = await Promise.all([
        api.getMonitoringHealth().catch(() => null),
        api.driftReport().catch(() => null),
        api.monitoringStats().catch(() => null),
      ]);
      health = h;
      drift = d;
      stats = s;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function saveBaseline() {
    saveLoading = true;
    try {
      await api.saveBaseline();
      toast.success('Baseline sauvegardée');
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      saveLoading = false;
    }
  }

  onMount(refresh);

  function uptimeLabel(sec: number) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}j ${h}h`;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  }

  function fmtDate(d: string | null) {
    if (!d) return '·';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-2xl font-extrabold text-on-surface tracking-tight">Monitoring</h2>
  <div class="flex items-center gap-2">
    <button onclick={() => { helpOpen = true; }} class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
      <Info size={14} /> Aide
    </button>
    <button onclick={refresh} class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-all cursor-pointer border-none shadow-sm">
      <RotateCw size={16} /> Rafraîchir
    </button>
  </div>
</div>

{#if loading}
  <div class="flex justify-center py-16"><Spinner text="Collecte de l'état du système…" size="lg" /></div>
{:else if error}
  <Card><div class="p-4 text-sm text-red-700">{error}</div></Card>
{:else}
  {#if health}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <Card>
        <div class="flex items-center gap-2 text-outline text-xs font-medium uppercase tracking-wider mb-2">
          <Activity size={14} /> Statut global
        </div>
        {#if health.status === 'OK'}
          <span class="flex items-center gap-1.5 text-emerald-700 text-lg font-bold"><CircleCheck size={18} /> OK</span>
        {:else}
          <span class="flex items-center gap-1.5 text-red-700 text-lg font-bold"><CircleX size={18} /> DÉGRADÉ</span>
        {/if}
      </Card>
      <Card>
        <div class="flex items-center gap-2 text-outline text-xs font-medium uppercase tracking-wider mb-2"><Server size={14} /> Uptime</div>
        <p class="text-lg font-bold">{uptimeLabel(health.uptimeSec)}</p>
        <p class="text-[11px] text-outline mt-1">Démarré le {fmtDate(health.startedAt)}</p>
      </Card>
      <Card>
        <div class="flex items-center gap-2 text-outline text-xs font-medium uppercase tracking-wider mb-2"><Database size={14} /> PostgreSQL</div>
        <div class="flex items-center gap-2">
          {#if health.database?.status === 'UP'}
            <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold"><CircleCheck size={13} /> UP</span>
          {:else}
            <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold"><CircleX size={13} /> DOWN</span>
          {/if}
          {#if health.database?.latencyMs != null}
            <span class="text-xs text-outline font-mono">{health.database.latencyMs} ms</span>
          {/if}
        </div>
        {#if health.database?.error}
          <p class="text-[11px] text-red-600 mt-1 break-all">{health.database.error}</p>
        {/if}
      </Card>
      <Card>
        <div class="flex items-center gap-2 text-outline text-xs font-medium uppercase tracking-wider mb-2"><MemoryStick size={14} /> Redis</div>
        <div class="flex items-center gap-2">
          {#if health.redis?.status === 'UP'}
            <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold"><CircleCheck size={13} /> UP</span>
          {:else}
            <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold"><CircleX size={13} /> DOWN</span>
          {/if}
          {#if health.redis?.latencyMs != null}
            <span class="text-xs text-outline font-mono">{health.redis.latencyMs} ms</span>
          {/if}
        </div>
        {#if health.redis?.error}
          <p class="text-[11px] text-red-600 mt-1 break-all">{health.redis.error}</p>
        {/if}
      </Card>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <Card>
        <div class="text-outline text-xs font-medium uppercase tracking-wider mb-2">Mémoire RSS</div>
        <p class="text-lg font-bold">{health.memory?.rssMb} MB</p>
      </Card>
      <Card>
        <div class="text-outline text-xs font-medium uppercase tracking-wider mb-2">Heap utilisé</div>
        <p class="text-lg font-bold">{health.memory?.heapUsedMb} MB <span class="text-xs text-outline">/ {health.memory?.heapTotalMb} MB</span></p>
      </Card>
      <Card>
        <div class="text-outline text-xs font-medium uppercase tracking-wider mb-2">Node.js</div>
        <p class="text-lg font-bold">{health.node}</p>
      </Card>
      <Card>
        <div class="text-outline text-xs font-medium uppercase tracking-wider mb-2">Horodatage</div>
        <p class="text-sm font-semibold">{fmtDate(health.timestamp)}</p>
      </Card>
    </div>
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-on-surface">Drift des modèles</h3>
        {#if drift?.alerts?.length}
          <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold"><AlertTriangle size={13} /> {drift.alerts.length} alerte(s)</span>
        {:else}
          <span class="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">✓ Aucune alerte</span>
        {/if}
      </div>
      {#if drift?.alerts?.length}
        <div class="space-y-2 mb-4">
          {#each drift.alerts as alert}
            <div class="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-700">{alert}</div>
          {/each}
        </div>
      {/if}
      <div class="grid grid-cols-3 gap-3">
        <div class="p-3 rounded-xl bg-surface-container-low">
          <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><CircleX size={13} /> Refus</div>
          <p class="text-lg font-bold">{drift?.refusalRate != null ? (drift.refusalRate * 100).toFixed(1) + '%' : '·'}</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low">
          <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><TrendingUp size={13} /> DIVERS</div>
          <p class="text-lg font-bold">{drift?.diversRate != null ? (drift.diversRate * 100).toFixed(1) + '%' : '·'}</p>
        </div>
        <div class="p-3 rounded-xl bg-surface-container-low">
          <div class="flex items-center gap-1.5 text-outline text-[11px] mb-1"><Gauge size={13} /> Conf. moy.</div>
          <p class="text-lg font-bold">{stats?.avgConfidence != null ? (stats.avgConfidence * 100).toFixed(0) + '%' : '·'}</p>
        </div>
      </div>
      <button onclick={saveBaseline} disabled={saveLoading} class="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none disabled:opacity-50">
        <Save size={13} /> {saveLoading ? 'Sauvegarde…' : 'Sauvegarder baseline'}
      </button>
    </Card>

    <Card>
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-on-surface">Prédictions</h3>
        <span class="flex items-center gap-1 text-xs text-outline"><Hash size={13} /> {stats?.totalLogs ?? 0} logs</span>
      </div>
      {#if stats?.topPredictions}
        <div class="space-y-1.5">
          {#each Object.entries(stats.topPredictions) as [label, count]}
            {@const pct = stats.totalLogs > 0 ? ((count as number) / stats.totalLogs * 100) : 0}
            <div class="flex items-center gap-2 text-xs">
              <span class="w-28 truncate text-on-surface font-medium">{label}</span>
              <div class="flex-1 h-4 rounded-full bg-surface-container-low overflow-hidden">
                <div class="h-full rounded-full bg-primary/60 transition-all" style="width: {pct}%"></div>
              </div>
              <span class="w-14 text-right text-outline font-mono text-[11px]">{pct.toFixed(1)}%</span>
              <span class="w-8 text-right text-outline font-mono text-[11px]">{count}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-sm text-outline text-center py-8">Aucune prédiction enregistrée</p>
      {/if}
      {#if stats?.avgLatency != null}
        <div class="mt-4 p-3 rounded-xl bg-surface-container-low text-xs">
          <span class="text-outline">Latence moyenne: </span><span class="font-bold font-mono">{stats.avgLatency.toFixed(0)} ms</span>
        </div>
      {/if}
    </Card>
  </div>
{/if}

<InfoDrawer open={helpOpen} section="monitoring" onclose={() => helpOpen = false} />
