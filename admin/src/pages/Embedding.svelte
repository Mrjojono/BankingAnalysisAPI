<script lang="ts">
  import { Layers, Database, Search, AlertCircle, Globe, Info, BookOpen, Target, TrendingUp, Hash } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import InfoDrawer from '../lib/components/InfoDrawer.svelte';

  let stats = $state<any | null>(null);
  let loading = $state(true);
  let error = $state('');
  let infoOpen = $state(false);

  let neighborDesc = $state('');
  let neighbors = $state<any[] | null>(null);
  let neighborLoading = $state(false);
  let neighborError = $state('');

  onMount(async () => {
    try {
      stats = await api.embeddingStats();
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  });

  async function searchNeighbors() {
    if (!neighborDesc.trim()) return;
    neighborLoading = true;
    neighborError = '';
    try {
      const res = await api.embeddingNeighbors(neighborDesc, 5);
      neighbors = res.neighbors;
    } catch (e: any) {
      neighborError = e.message;
      neighbors = null;
    } finally {
      neighborLoading = false;
    }
  }

  function catColor(i: number): string {
    const colors = [
      'bg-green-100 text-green-800',
      'bg-blue-100 text-blue-800',
      'bg-amber-100 text-amber-800',
      'bg-purple-100 text-purple-800',
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

<div class="w-full">
  <div class="flex items-center justify-between mb-6">
    <div class="flex items-center gap-3">
      <Layers size={24} class="text-primary" />
      <h2 class="text-2xl font-bold text-on-surface">Embeddings</h2>
    </div>
    <button
      onclick={() => infoOpen = true}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer border-none"
      title="Comment ça marche ?"
    >
      <Info size={14} /> Aide
    </button>
  </div>

  <InfoDrawer open={infoOpen} onclose={() => infoOpen = false} section="embedding" />

  {#if loading}
    <div class="p-8 text-center text-outline">
      <div class="animate-pulse flex flex-col items-center gap-2">
        <div class="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        Chargement...
      </div>
    </div>
  {/if}

  {#if error}
    <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
      <AlertCircle size={18} /> {error}
    </div>
  {/if}

  {#if stats && !loading}
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border border-mint-subtle rounded-2xl p-5">
        <div class="flex items-center gap-2 text-outline text-xs font-semibold uppercase tracking-wider mb-1">
          <Database size={14} /> Statut
        </div>
        <p class="text-2xl font-bold text-on-surface flex items-center gap-2">
          {#if stats.loaded}
            <Database size={22} class="text-green-600" /> Chargé
          {:else}
            <AlertCircle size={22} class="text-amber-600" /> Non chargé
          {/if}
        </p>
        {#if !stats.loaded}
          <p class="text-xs text-outline mt-1">Lance scripts/download-embeddings.sh</p>
        {/if}
      </div>
      <div class="bg-white border border-mint-subtle rounded-2xl p-5">
        <div class="flex items-center gap-2 text-outline text-xs font-semibold uppercase tracking-wider mb-1">
          <BookOpen size={14} /> Vocabulaire
        </div>
        <p class="text-2xl font-bold text-on-surface">
          {stats.vocabSize?.toLocaleString() ?? '-'}
        </p>
        <p class="text-xs text-outline mt-1">mots chargés sur 50 000 max</p>
      </div>
      <div class="bg-white border border-mint-subtle rounded-2xl p-5">
        <div class="flex items-center gap-2 text-outline text-xs font-semibold uppercase tracking-wider mb-1">
          <Target size={14} /> Catégories
        </div>
        <p class="text-2xl font-bold text-on-surface">
          {stats.categories ?? '-'}
        </p>
        <p class="text-xs text-outline mt-1">centroïdes construits</p>
      </div>
    </div>

    <div class="bg-white border border-mint-subtle rounded-2xl p-6">
      <div class="flex items-center gap-2 mb-4">
        <Hash size={16} class="text-primary" />
        <h3 class="text-sm font-semibold text-on-surface">Mots-clés trouvés dans le fichier .vec par catégorie</h3>
        <span class="text-xs text-outline ml-1">(trouvés / total mots-clés définis)</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        {#each Object.entries(stats.wordsPerCategory ?? {}) as [cat, count]}
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low">
            <span class="text-sm font-medium text-on-surface">{cat}</span>
            <span class="text-sm font-mono px-2 py-0.5 rounded {count >= 10 ? 'bg-green-100 text-green-800' : count >= 5 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}">
              {count}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="mt-6 bg-white border border-mint-subtle rounded-2xl p-6">
    <div class="flex items-center gap-2 mb-3">
      <TrendingUp size={16} class="text-primary" />
      <h3 class="text-sm font-semibold text-on-surface">Recherche sémantique</h3>
      <span class="text-xs text-outline ml-1">— similarité cosinus avec les centroïdes</span>
    </div>
    <div class="flex gap-3 mb-4">
      <input
        id="neighbor-desc"
        bind:value={neighborDesc}
        placeholder="Ex: Loyer appartement"
        onkeydown={(e) => e.key === 'Enter' && searchNeighbors()}
        class="flex-1 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
      />
      <button
        onclick={searchNeighbors}
        disabled={neighborLoading || !neighborDesc.trim()}
        class="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none"
      >
        <Search size={18} />
        Chercher
      </button>
    </div>

    {#if neighborLoading}
      <div class="flex items-center gap-2 text-sm text-outline">
        <div class="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        Recherche...
      </div>
    {/if}

    {#if neighborError}
      <p class="text-sm text-red-600">{neighborError}</p>
    {/if}

    {#if neighbors && !neighborLoading}
      <div class="space-y-2">
        {#each neighbors as n, i}
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low">
            <div class="flex items-center gap-3">
              <span class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold {catColor(i)}">{i + 1}</span>
              <span class="font-medium text-on-surface text-sm">{n.category}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-outline">
                {n.score >= 0.7 ? 'Très proche' : n.score >= 0.5 ? 'Proche' : n.score >= 0.3 ? 'Éloigné' : 'Très éloigné'}
              </span>
              <span class="font-mono text-sm px-2 py-0.5 rounded {scoreLabel(n.score)}">
                {n.score.toFixed(4)}
              </span>
            </div>
          </div>
        {/each}
      </div>
      {#if neighbors.length === 0}
        <p class="text-sm text-outline">Aucun voisin trouvé.</p>
      {/if}
    {/if}
  </div>
</div>
