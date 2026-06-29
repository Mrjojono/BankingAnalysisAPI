<script lang="ts">
  import { Pencil, Trash2 } from '@lucide/svelte';

  const DIFFICULTIES = [
    { value: 'BEGINNER', label: 'Débutant', class: 'bg-green-50 text-green-700 ring-green-200' },
    { value: 'INTERMEDIATE', label: 'Intermédiaire', class: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { value: 'ADVANCED', label: 'Avancé', class: 'bg-red-50 text-red-700 ring-red-200' },
  ];
  const DIFFICULTY_MAP = Object.fromEntries(DIFFICULTIES.map(d => [d.value, d]));

  let {
    paths = $bindable([]),
    onEdit,
    onDelete,
  }: {
    paths?: any[];
    onEdit?: (p: any) => void;
    onDelete?: (id: string) => void;
  } = $props();

  let page = $state(1);
  const PER_PAGE = 15;

  let paged = $derived(paths.slice((page - 1) * PER_PAGE, page * PER_PAGE));
  let totalPages = $derived(Math.max(1, Math.ceil(paths.length / PER_PAGE)));
  $effect(() => { if (page > totalPages && totalPages > 0) page = totalPages; });
  $effect(() => { page = 1; });

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
</script>

<div class="bg-surface rounded-2xl overflow-x-auto border border-mint-subtle">
  <table class="w-full border-collapse min-w-[700px]">
    <thead>
      <tr class="bg-background">
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Titre</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Difficulté</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Ordre</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Leçons</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant">Statut</th>
        <th class="text-left px-4 py-3 text-sm font-semibold text-on-surface-variant"></th>
      </tr>
    </thead>
    <tbody>
      {#each paged as p}
        <tr class="hover:bg-[#fafcfa] transition-all border-t border-mint-subtle/50">
          <td class="px-4 py-3 text-sm font-semibold">{p.title}</td>
          <td class="px-4 py-3">
            <span class="inline-block px-2 py-1 rounded-md text-xs font-semibold {DIFFICULTY_MAP[p.difficulty]?.class ?? 'bg-surface-container text-on-surface-variant'}">
              {DIFFICULTY_MAP[p.difficulty]?.label ?? p.difficulty}
            </span>
          </td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">{p.order}</td>
          <td class="px-4 py-3 text-sm">{p._count?.lessons ?? p.lessons?.length ?? 0}</td>
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
              <button onclick={() => onEdit?.(p)} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-all cursor-pointer border-none text-on-surface-variant" title="Modifier">
                <Pencil size={18} />
              </button>
              <button onclick={() => onDelete?.(p.id)} class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant" title="Supprimer">
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
        {paths.length} parcours — page {page}/{totalPages}
      </span>
      <div class="flex gap-1">{@html ' '}
        <button onclick={() => page = Math.max(1, page - 1)} disabled={page <= 1}
          class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">←</button>
        {#if pages[0] > 1}
          <button onclick={() => page = 1} class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer">1</button>
          {#if pages[0] > 2}<span class="px-2 py-1.5 text-sm text-on-surface-variant">…</span>{/if}
        {/if}
        {#each pages as p}
          <button onclick={() => page = p}
            class="px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer {page === p ? 'bg-primary text-white border-primary' : 'border-mint-subtle bg-white hover:bg-surface-container'}">{p}</button>
        {/each}
        {#if pages[pages.length - 1] < totalPages}
          {#if pages[pages.length - 1] < totalPages - 1}<span class="px-2 py-1.5 text-sm text-on-surface-variant">…</span>{/if}
          <button onclick={() => page = totalPages} class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer">{totalPages}</button>
        {/if}
        <button onclick={() => page = Math.min(totalPages, page + 1)} disabled={page >= totalPages}
          class="px-3 py-1.5 rounded-lg text-sm font-semibold border border-mint-subtle bg-white hover:bg-surface-container transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">→</button>
      </div>
    </div>
  {/if}
</div>
