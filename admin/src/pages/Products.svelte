<script lang="ts">
  import { Plus, Pencil, Trash2, Search, Info } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Drawer from '../lib/components/Drawer.svelte';

  let products = $state<any[]>([]);
  let editing = $state<any | null>(null);
  let saving = $state(false);
  let error = $state('');
  let drawerOpen = $state(false);
  let helpOpen = $state(false);
  let search = $state('');

  const CATEGORIES: { value: string; label: string; desc: string; class: string }[] = [
    { value: 'ACCOUNT', label: 'Compte', desc: 'Ouverture, clôture et gestion de comptes bancaires', class: 'bg-blue-50 text-blue-700 ring-blue-200' },
    { value: 'CARD', label: 'Carte', desc: 'Cartes de crédit, débit et prépayées', class: 'bg-purple-50 text-purple-700 ring-purple-200' },
    { value: 'LOAN', label: 'Crédit', desc: 'Prêts consommation, habitat, trésorerie et caution', class: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { value: 'PAYMENT', label: 'Paiement', desc: 'Moyens de paiement (chèques, virements, effets de commerce)', class: 'bg-green-50 text-green-700 ring-green-200' },
    { value: 'DIGITAL', label: 'Digital', desc: 'Banque à distance, mobile money, services en ligne', class: 'bg-cyan-50 text-cyan-700 ring-cyan-200' },
    { value: 'BANKING', label: 'Services bancaires', desc: 'Attestations, relevés, oppositions et services divers', class: 'bg-gray-50 text-gray-700 ring-gray-200' },
    { value: 'INCIDENT', label: 'Incident', desc: 'Frais d\'incidents de paiement et rejets', class: 'bg-red-50 text-red-700 ring-red-200' },
    { value: 'FOREX', label: 'Change', desc: 'Opérations de change et devises étrangères', class: 'bg-teal-50 text-teal-700 ring-teal-200' },
    { value: 'INTERNATIONAL', label: 'International', desc: 'Transferts et opérations vers l\'étranger', class: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
    { value: 'MISC', label: 'Autres services', desc: 'Services divers et prestations annexes', class: 'bg-orange-50 text-orange-700 ring-orange-200' },
  ];

  let stats = $derived.by(() => {
    const total = products.length;
    const active = products.filter(p => p.isActive).length;
    const totalRules = products.reduce((s, p) => s + (p.rules?.length ?? 0), 0);
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return { total, active, totalRules, categories: cats.size };
  });

  const TYPE_LABELS: Record<string, string> = {
    ELIGIBILITY: 'Élig.',
    FEE: 'Frais',
    LIMIT: 'Limite',
    INTEREST: 'Intérêt',
    VALUE_DATE: 'Dt valeur',
  };

  function rulesBreakdown(rules: any[]) {
    const counts: Record<string, number> = {};
    for (const r of rules) {
      counts[r.type] = (counts[r.type] ?? 0) + 1;
    }
    return counts;
  }

  const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.value, c]));

  const TYPE_STYLES: Record<string, string> = {
    ELIGIBILITY: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    FEE: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    LIMIT: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    INTEREST: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    VALUE_DATE: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
  };

  onMount(async () => {
    try { products = await api.listProducts(); }
    catch { error = 'Erreur chargement produits'; }
  });

  let page = $state(1);
  const PER_PAGE = 15;

  let filtered = $derived.by(() => {
    if (!search) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PER_PAGE)));
  let paged = $derived(filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE));

  let pages = $derived.by(() => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const half = Math.floor(maxVisible / 2);
    let start = page - half;
    let end = page + half;
    if (start < 1) { start = 1; end = maxVisible; }
    if (end > totalPages) { end = totalPages; start = totalPages - maxVisible + 1; }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  $effect(() => { if (page > totalPages) page = totalPages; });

  function openForm(p?: any) {
    editing = p ? { ...p } : { code: '', name: '', description: '', reference: '', category: '', isActive: true };
    drawerOpen = true;
  }

  async function save() {
    if (!editing) return;
    saving = true; error = '';
    try {
      if (editing.id) {
        const updated = await api.updateProduct(editing.id, editing);
        products = products.map(p => p.id === updated.id ? updated : p);
      } else {
        const created = await api.createProduct(editing);
        products = [...products, created];
      }
      drawerOpen = false;
      editing = null;
    } catch (e: any) { error = e.message; }
    finally { saving = false; }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce produit ?')) return;
    await api.deleteProduct(id);
    products = products.filter(p => p.id !== id);
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-[22px] font-bold">Produits bancaires</h2>
  <div class="flex items-center gap-3">
    <button onclick={() => helpOpen = true}
      class="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-mint-subtle rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer">
      <Info size={18} />
      Aide
    </button>
    <button onclick={() => openForm()} class="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-[#2d5200] transition-all cursor-pointer border-none">
      <Plus size={18} />
      Nouveau produit
    </button>
  </div>
</div>

<Drawer open={helpOpen} title="Aide — Produits bancaires" onclose={() => helpOpen = false}>
  <div class="flex flex-col gap-4 text-sm leading-relaxed text-on-surface">
    <p>Cette page liste tous les produits bancaires disponibles dans le système. Chaque produit peut avoir des règles d'éligibilité associées.</p>

    <h4 class="font-bold text-base mt-2">Code produit</h4>
    <p>Identifiant unique du produit (ex: <code>COMPTES_PART</code>, <code>VISA_LIBERTE</code>, <code>CREDIT_HABITAT_PART</code>). Utilisé pour regrouper les règles par produit et pour l'évaluation d'éligibilité.</p>

    <h4 class="font-bold text-base mt-2">Catégories</h4>
    <p>Chaque produit appartient à une catégorie métier : Compte, Carte, Crédit, Paiement, Digital, Services bancaires, Incident, Change, International, Autres services.</p>

    <h4 class="font-bold text-base mt-2">Règles associées</h4>
    <p>La colonne <strong>Règles</strong> affiche le nombre de règles liées à ce produit. C'est le lien entre la page Produits et la page Règles : les règles sont créées et modifiées depuis la page Règles, en sélectionnant le produit concerné.</p>

    <h4 class="font-bold text-base mt-2">Statut</h4>
    <ul class="list-disc pl-5">
      <li><span class="font-semibold text-primary">Actif</span> — le produit est visible et utilisable pour l'éligibilité</li>
      <li><span class="font-semibold text-outline">Inactif</span> — le produit est désactivé, ses règles ne sont pas évaluées</li>
    </ul>
  </div>
</Drawer>

<Drawer open={drawerOpen} title={editing?.id ? 'Modifier le produit' : 'Nouveau produit'} onclose={() => { drawerOpen = false; editing = null; }}>
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Code
      <input bind:value={editing!.code} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Nom
      <input bind:value={editing!.name} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Référence (section)
      <input bind:value={editing!.reference} placeholder="ex: A-I" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Description
      <textarea bind:value={editing!.description} rows="3" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"></textarea>
    </label>
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Catégorie
      <select bind:value={editing!.category} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
        <option value="">— Sélectionner —</option>
        {#each CATEGORIES as cat}
          <option value={cat.value}>{cat.label} — {cat.desc}</option>
        {/each}
      </select>
    </label>
    <label class="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
      <input type="checkbox" bind:checked={editing!.isActive} class="w-4 h-4 rounded border-mint-subtle text-primary focus:ring-primary" />
      Actif
    </label>
    <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
      <button onclick={() => { drawerOpen = false; editing = null; }} class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-mint-subtle hover:bg-surface-container transition-all cursor-pointer">
        Annuler
      </button>
      <button onclick={save} disabled={saving} class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-[#2d5200] transition-all cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </div>
  </div>
</Drawer>

{#if error}
  <div class="bg-red-50 text-error px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>
{/if}

<div class="grid grid-cols-4 gap-4 mb-6">
  <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total produits</span>
    <span class="text-3xl font-bold">{stats.total}</span>
  </div>
  <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Actifs</span>
    <span class="text-3xl font-bold text-primary">{stats.active}</span>
  </div>
  <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Règles associées</span>
    <span class="text-3xl font-bold">{stats.totalRules}</span>
  </div>
  <div class="bg-surface rounded-2xl border border-mint-subtle p-5 flex flex-col gap-1">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Catégories</span>
    <span class="text-3xl font-bold">{stats.categories}</span>
  </div>
</div>

<div class="relative mb-4">
  <Search size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
  <input bind:value={search} placeholder="Rechercher un produit (code, nom, catégorie)…"
    class="w-full pl-10 pr-4 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all" />
</div>

<div class="bg-surface rounded-2xl overflow-x-auto border border-mint-subtle">
  <table class="w-full border-collapse min-w-[700px]">
    <thead>
      <tr class="bg-background">
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Code</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Nom</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Réf.</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Catégorie</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Règles</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Description</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Statut</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant"></th>
      </tr>
    </thead>
    <tbody>
      {#each paged as p}
        <tr class="hover:bg-[#fafcfa] transition-all border-t border-mint-subtle/50">
          <td class="px-4 py-3 text-sm"><code class="bg-surface-container px-1.5 py-0.5 rounded text-xs font-mono font-semibold tracking-tight">{p.code}</code></td>
          <td class="px-4 py-3 text-sm font-semibold">{p.name}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">{p.reference ?? '—'}</td>
          <td class="px-4 py-3">
            {#if CATEGORY_MAP[p.category]}
              <span class="inline-block px-2 py-1 rounded-md text-xs font-semibold {CATEGORY_MAP[p.category].class}">{CATEGORY_MAP[p.category].label}</span>
            {:else}
              <span class="inline-block bg-surface-container text-on-surface-variant px-2 py-1 rounded-md text-xs font-medium">{p.category ?? '—'}</span>
            {/if}
          </td>
          <td class="px-4 py-3">
            {#if p.rules?.length}
              <div class="flex flex-wrap gap-1">
                {#each Object.entries(rulesBreakdown(p.rules)) as [type, count]}
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium {TYPE_STYLES[type] ?? 'bg-surface-container text-on-surface-variant'}">
                    {TYPE_LABELS[type] ?? type}
                    <span class="font-bold">{count}</span>
                  </span>
                {/each}
              </div>
            {:else}
              <span class="text-sm text-outline">0</span>
            {/if}
          </td>
          <td class="px-4 py-3 text-sm text-on-surface-variant max-w-[200px] truncate" title={p.description ?? ''}>{p.description ?? '—'}</td>
          <td class="px-4 py-3">
            {#if p.isActive}
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span class="w-1.5 h-1.5 rounded-full bg-primary"></span>Actif
              </span>
            {:else}
              <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-outline">
                <span class="w-1.5 h-1.5 rounded-full bg-outline"></span>Inactif
              </span>
            {/if}
          </td>
          <td class="px-4 py-3">
            <div class="flex gap-1">
              <button onclick={() => openForm(p)} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-all cursor-pointer border-none text-on-surface-variant">
                <Pencil size={18} />
              </button>
              <button onclick={() => remove(p.id)} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant">
                <Trash2 size={18} />
              </button>
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if totalPages > 1}
    <div class="flex items-center justify-between px-4 py-3 border-t border-mint-subtle bg-background">
      <span class="text-sm text-on-surface-variant">
        {filtered.length} produit{filtered.length > 1 ? 's' : ''} — page {page}/{totalPages}
      </span>
      <div class="flex gap-1">
        <button onclick={() => page = Math.max(1, page - 1)} disabled={page <= 1}
          class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          ←
        </button>
        {#if pages[0] > 1}
          <button onclick={() => page = 1} class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer">1</button>
          {#if pages[0] > 2}<span class="px-2 py-1.5 text-sm text-on-surface-variant">…</span>{/if}
        {/if}
        {#each pages as p}
          <button onclick={() => page = p}
            class="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer {page === p ? 'bg-primary text-white border-primary' : 'border-mint-subtle bg-white hover:bg-surface-container'}">
            {p}
          </button>
        {/each}
        {#if pages[pages.length - 1] < totalPages}
          {#if pages[pages.length - 1] < totalPages - 1}<span class="px-2 py-1.5 text-sm text-on-surface-variant">…</span>{/if}
          <button onclick={() => page = totalPages} class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer">{totalPages}</button>
        {/if}
        <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page >= totalPages}
          class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          →
        </button>
      </div>
    </div>
  {/if}
</div>
