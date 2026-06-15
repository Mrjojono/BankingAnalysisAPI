<script lang="ts">
  import { Search, Info } from '@lucide/svelte';
  import { glossary, type GlossaryEntry, CATEGORIES } from '../lib/data/glossary';
  import Drawer from '../lib/components/Drawer.svelte';

  let search = $state('');
  let selectedCategory = $state<string>('all');
  let selectedEntry = $state<GlossaryEntry | null>(null);
  let helpOpen = $state(false);

  let filtered = $derived.by(() => {
    let entries = glossary;
    if (selectedCategory !== 'all') {
      entries = entries.filter(e => e.category === selectedCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      entries = entries.filter(e =>
        e.term.toLowerCase().includes(q) ||
        e.def.toLowerCase().includes(q)
      );
    }
    return entries;
  });

  let grouped = $derived.by(() => {
    const groups: Record<string, GlossaryEntry[]> = {};
    for (const e of filtered) {
      if (!groups[e.category]) groups[e.category] = [];
      groups[e.category].push(e);
    }
    return Object.entries(groups);
  });

  function categoryLabel(cat: string) {
    return CATEGORIES[cat]?.label ?? cat;
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-[22px] font-bold">Lexique</h2>
  <button onclick={() => helpOpen = true}
    class="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-mint-subtle rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer">
    <Info size={18} />
    Aide
  </button>
</div>

<Drawer open={helpOpen} title="Aide — Lexique" onclose={() => helpOpen = false}>
  <div class="flex flex-col gap-4 text-sm leading-relaxed text-on-surface">
    <p>Cette page regroupe les définitions des termes techniques utilisés dans l'application. Les données proviennent du fichier <code>admin/src/lib/data/glossary.ts</code>.</p>

    <h4 class="font-bold text-base mt-2">Les 7 catégories</h4>
    <ul class="list-disc pl-5 flex flex-col gap-1.5">
      <li><span class="font-semibold">Sigles</span> — acronymes bancaires (BCEAO, SWIFT, GIM, TBB, TAF, UEMOA…)</li>
      <li><span class="font-semibold">Produits et services</span> — définitions des produits (compte chèques, prêt consommation, crédit habitat, carte prépayée, découvert…)</li>
      <li><span class="font-semibold">Règles</span> — concepts des règles (ELIGIBILITY/FEE/LIMIT/INTEREST, opérateurs, poids, seuil, périodes, code produit…)</li>
      <li><span class="font-semibold">Métriques</span> — indicateurs financiers calculés par le moteur analytics (debtRatio, monthlyIncome, expenseRatio, overdraftDays, savingsRate…)</li>
      <li><span class="font-semibold">Frais</span> — frais et commissions bancaires (tenue de compte, commission plus fort découvert, frais de dossier…)</li>
      <li><span class="font-semibold">Score et éligibilité</span> — mécanismes de scoring (score éligibilité, statuts ELIGIBLE/PARTIAL/NOT_ELIGIBLE, patterns de messages, moteur d'éligibilité…)</li>
      <li><span class="font-semibold">IA & Analytics</span> — classifieur, embeddings, matrice des poids, intentions, entraînement, sources de données (45 nouveaux termes)</li>
    </ul>

    <h4 class="font-bold text-base mt-2">Navigation</h4>
    <p>Utilisez les filtres de catégorie ou la barre de recherche pour trouver un terme. Cliquez sur un terme pour voir sa définition détaillée dans le panneau latéral.</p>
  </div>
</Drawer>

<div class="flex items-center gap-2 mb-4 flex-wrap">
  <button
    onclick={() => selectedCategory = 'all'}
    class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none
      {selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-surface border border-mint-subtle text-on-surface-variant hover:bg-surface-container'}"
  >
    Tous
  </button>
  {#each Object.entries(CATEGORIES) as [key, cat]}
    <button
      onclick={() => selectedCategory = key}
      class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none
        {selectedCategory === key ? 'bg-primary text-white' : 'bg-surface border border-mint-subtle text-on-surface-variant hover:bg-surface-container'}"
    >
      {cat.label}
    </button>
  {/each}
</div>

<div class="relative mb-6">
  <Search size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
  <input bind:value={search} placeholder="Rechercher un terme…"
    class="w-full pl-10 pr-4 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all" />
</div>

<div class="flex gap-8">
  <div class="flex-1 flex flex-col gap-6">
    {#each grouped as [category, entries]}
      <div class="bg-surface rounded-2xl border border-mint-subtle overflow-hidden">
        <div class="px-6 py-3 bg-background border-b border-mint-subtle">
          <h3 class="font-bold text-sm text-on-surface-variant">{categoryLabel(category)}</h3>
        </div>
        <div class="divide-y divide-mint-subtle">
          {#each entries as entry}
            <button
              onclick={() => selectedEntry = entry}
              class="w-full text-left px-6 py-3.5 hover:bg-[#fafcfa] transition-all cursor-pointer border-none"
            >
              <div class="font-semibold text-sm">{entry.term}</div>
              <div class="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{entry.def}</div>
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  {#if selectedEntry}
    <div class="w-80 shrink-0 bg-surface rounded-2xl border border-mint-subtle p-6 h-fit sticky top-8">
      <div class="flex items-center justify-between mb-3">
        <span class="inline-block px-2.5 py-1 rounded-md text-xs font-semibold bg-surface-container text-on-surface-variant">
          {categoryLabel(selectedEntry.category)}
        </span>
      </div>
      <h3 class="text-lg font-bold mb-2">{selectedEntry.term}</h3>
      <p class="text-sm leading-relaxed text-on-surface-variant">{selectedEntry.def}</p>
      {#if selectedEntry.seeAlso && selectedEntry.seeAlso.length > 0}
        <div class="mt-4 pt-4 border-t border-mint-subtle">
          <span class="text-xs font-semibold text-on-surface-variant">Voir aussi</span>
          <div class="flex flex-wrap gap-1.5 mt-2">
            {#each selectedEntry.seeAlso as ref}
              <button onclick={() => {
                const found = glossary.find(e => e.term === ref);
                if (found) selectedEntry = found;
              }}
                class="px-2.5 py-1 bg-surface-container-low border border-mint-subtle rounded-lg text-xs font-medium text-on-surface-variant hover:text-primary hover:border-primary transition-all cursor-pointer"
              >
                {ref}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
