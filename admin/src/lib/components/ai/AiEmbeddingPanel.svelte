<script lang="ts">
  import { api } from '../../api';

  let {
    embeddingStats,
  }: {
    embeddingStats: any;
  } = $props();

  let neighborDesc = $state('');
  let neighbors = $state<any[] | null>(null);
  let neighborLoading = $state(false);

  async function searchNeighbors() {
    if (!neighborDesc.trim()) return;
    neighborLoading = true;
    try {
      const res = await api.embeddingNeighbors(neighborDesc, 5);
      neighbors = res.neighbors;
    } finally {
      neighborLoading = false;
    }
  }

  function catColor(i: number) {
    const colors = [
      'bg-green-100 text-green-800', 'bg-blue-100 text-blue-800',
      'bg-amber-100 text-amber-800', 'bg-purple-100 text-purple-800',
      'bg-cyan-100 text-cyan-800',
    ];
    return colors[i % colors.length];
  }

  function scoreLabel(score: number): string {
    if (score >= 0.7) return 'bg-green-100 text-green-800';
    if (score >= 0.4) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  }
</script>

{#if embeddingStats}
  <div class="grid grid-cols-3 gap-3 mb-4">
    <div class="text-center p-3 rounded-xl bg-surface-container-low">
      <p class="text-xs text-outline">Statut</p>
      <p class="text-sm font-bold text-on-surface">{embeddingStats.loaded ? 'Chargé' : 'Non chargé'}</p>
    </div>
    <div class="text-center p-3 rounded-xl bg-surface-container-low">
      <p class="text-xs text-outline">Vocabulaire</p>
      <p class="text-sm font-bold text-on-surface">{embeddingStats.vocabSize ?? 0}</p>
    </div>
    <div class="text-center p-3 rounded-xl bg-surface-container-low">
      <p class="text-xs text-outline">Catégories</p>
      <p class="text-sm font-bold text-on-surface">{embeddingStats.categories ?? 0}</p>
    </div>
  </div>

  {#if embeddingStats.wordsPerCategory}
    <div class="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
      {#each Object.entries(embeddingStats.wordsPerCategory) as [cat, count]}
        <div class="text-center p-2 rounded-lg {count >= 10 ? 'bg-green-50' : count >= 5 ? 'bg-amber-50' : 'bg-red-50'}">
          <div class="text-[10px] font-semibold text-outline">{cat}</div>
          <div class="text-sm font-bold text-on-surface">{(count as number)}</div>
        </div>
      {/each}
    </div>
  {/if}
{/if}

<div>
  <label for="ai-embed-search" class="block text-xs font-semibold text-outline mb-2">Recherche sémantique</label>
  <div class="flex gap-2">
    <input id="ai-embed-search" bind:value={neighborDesc} placeholder="Ex: Loyer appartement"
      onkeydown={(e) => e.key === 'Enter' && searchNeighbors()}
      class="flex-1 px-3 py-2 rounded-xl border border-mint-subtle bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
    <button onclick={searchNeighbors} disabled={neighborLoading || !neighborDesc.trim()}
      class="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 border-none">
      {neighborLoading ? '...' : 'Chercher'}
    </button>
  </div>
  {#if neighbors}
    <div class="mt-3 space-y-1">
      {#each neighbors as n, i}
        <div class="flex items-center gap-3 p-2 rounded-lg bg-surface-container-low text-xs">
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold {catColor(i)}">{i + 1}</span>
          <span class="font-semibold text-on-surface flex-1">{n.category}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold {scoreLabel(n.score)}">{n.score >= 0.7 ? 'Très proche' : n.score >= 0.5 ? 'Proche' : n.score >= 0.3 ? 'Éloigné' : 'Très éloigné'}</span>
          <span class="font-mono text-outline w-16 text-right">{(n.score as number).toFixed(4)}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>
