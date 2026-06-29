<script lang="ts">
  import { Pencil, Trash2, HelpCircle, BookOpen } from '@lucide/svelte';

  let {
    quizzes = [] as any[],
    onEdit,
    onDelete,
    onView,
  }: {
    quizzes?: any[];
    onEdit?: (q: any) => void;
    onDelete?: (id: string) => void;
    onView?: (q: any) => void;
  } = $props();
</script>

<div class="bg-white rounded-xl border border-mint-subtle overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-mint-subtle bg-surface-container">
        <th class="text-left px-4 py-3 font-semibold text-on-surface-variant text-[12px] uppercase tracking-wide">Titre</th>
        <th class="text-left px-4 py-3 font-semibold text-on-surface-variant text-[12px] uppercase tracking-wide">Statut</th>
        <th class="text-center px-4 py-3 font-semibold text-on-surface-variant text-[12px] uppercase tracking-wide">Questions</th>
        <th class="text-center px-4 py-3 font-semibold text-on-surface-variant text-[12px] uppercase tracking-wide">Score %</th>
        <th class="text-center px-4 py-3 font-semibold text-on-surface-variant text-[12px] uppercase tracking-wide">Liens</th>
        <th class="text-right px-4 py-3 font-semibold text-on-surface-variant text-[12px] uppercase tracking-wide">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each quizzes as q (q.id)}
        <tr class="border-b border-mint-subtle hover:bg-[#f8faf6] transition-colors">
          <td class="px-4 py-3 font-medium text-on-surface">{q.title}</td>
          <td class="px-4 py-3">
            <span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold
              {q.status === 'PUBLISHED' ? 'bg-green-50 text-green-700' : q.status === 'ARCHIVED' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}">
              {q.status === 'PUBLISHED' ? 'Publié' : q.status === 'ARCHIVED' ? 'Archivé' : 'Brouillon'}
            </span>
          </td>
          <td class="px-4 py-3 text-center text-on-surface-variant">{q._count?.questions ?? 0}</td>
          <td class="px-4 py-3 text-center font-medium">{q.passingScore}%</td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center gap-1 text-on-surface-variant">
              <BookOpen size={14} />
              {q._count?.lessonLinks ?? 0}
            </span>
          </td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-1">
              <button onclick={() => onView?.(q)}
                class="p-1.5 rounded-md border border-transparent cursor-pointer text-outline hover:text-primary hover:border-primary transition-all">
                <HelpCircle size={15} />
              </button>
              <button onclick={() => onEdit?.(q)}
                class="p-1.5 rounded-md border border-transparent cursor-pointer text-outline hover:text-primary hover:border-primary transition-all">
                <Pencil size={15} />
              </button>
              <button onclick={() => onDelete?.(q.id)}
                class="p-1.5 rounded-md border border-transparent cursor-pointer text-outline hover:text-error hover:border-error transition-all">
                <Trash2 size={15} />
              </button>
            </div>
          </td>
        </tr>
      {:else}
        <tr>
          <td colspan="6" class="px-4 py-8 text-center text-outline text-sm">Aucun quiz pour le moment</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
