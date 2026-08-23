<script lang="ts">
  import { api } from '../../api';
  import { FileText, RotateCw, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import Spinner from '../Spinner.svelte';

  let logs: string[] = $state([]);
  let nextOffset = $state(0);
  let offset = $state(0);
  let loading = $state(true);
  let error = $state('');

  async function refresh() {
    loading = true;
    error = '';
    try {
      const res = await api.trainingLogs(offset);
      logs = res.logs ?? [];
      nextOffset = res.nextOffset ?? 0;
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function older() {
    offset = nextOffset;
    await refresh();
  }

  async function newer() {
    offset = 0;
    await refresh();
  }

  $effect(() => { refresh(); });
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between">
    <p class="text-xs text-outline">{logs.length} ligne{logs.length !== 1 ? 's' : ''} de log</p>
    <div class="flex items-center gap-2">
      {#if offset > 0}
        <button onclick={newer} class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
          <ChevronLeft size={13} /> Plus récent
        </button>
      {/if}
      <button onclick={refresh} class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
        <RotateCw size={13} /> Rafraîchir
      </button>
      {#if logs.length > 0 && nextOffset > offset}
        <button onclick={older} class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none">
          Plus ancien <ChevronRight size={13} />
        </button>
      {/if}
    </div>
  </div>

  {#if loading}
    <div class="text-center py-6"><Spinner text="Chargement des logs…" size="md" /></div>
  {:else if error}
    <div class="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
  {:else if logs.length === 0}
    <div class="text-center py-8">
      <FileText size={32} class="text-outline mx-auto mb-2" />
      <p class="text-xs text-outline">Aucun log. Lance un entraînement pour voir la sortie ici.</p>
    </div>
  {:else}
    <div class="max-h-96 overflow-y-auto font-mono text-[11px] bg-gray-900 text-green-300 rounded-xl p-3 space-y-0.5">
      {#each logs as log}
        <div>{log}</div>
      {/each}
    </div>
  {/if}
</div>
