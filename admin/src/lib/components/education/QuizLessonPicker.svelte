<script lang="ts">
  import { Search, BookOpen, X } from '@lucide/svelte';

  let {
    lessons = [] as any[],
    linkedLessonIds = [] as string[],
    onlink,
    onunlink,
  }: {
    lessons?: any[];
    linkedLessonIds?: string[];
    onlink: (lessonId: string) => void;
    onunlink: (lessonId: string) => void;
  } = $props();

  let search = $state('');
  let filtered = $derived.by(() => {
    if (!search) return lessons;
    const q = search.toLowerCase();
    return lessons.filter(l =>
      l.title?.toLowerCase().includes(q) || l.summary?.toLowerCase().includes(q)
    );
  });
</script>

<div class="flex flex-col gap-3">
  <div class="relative">
    <Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline" />
    <input bind:value={search} placeholder="Filtrer les leçons..."
      class="w-full pl-8 pr-3 py-2 border border-mint-subtle rounded-lg text-sm bg-white focus:border-primary focus:outline-none" />
  </div>

  <!-- Liées -->
  {#if linkedLessonIds.length > 0}
    <div class="flex flex-col gap-1">
      <span class="text-[11px] font-semibold text-primary uppercase tracking-wide">Liées ({linkedLessonIds.length})</span>
      {#each lessons.filter(l => linkedLessonIds.includes(l.id)) as lesson}
        <div class="flex items-center justify-between px-2.5 py-2 bg-[#F0F7E6] rounded-lg border border-primary/20">
          <div class="flex items-center gap-2 min-w-0">
            <BookOpen size={14} class="text-primary shrink-0" />
            <span class="text-[12px] font-medium text-on-surface truncate">{lesson.title}</span>
          </div>
          <button onclick={() => onunlink(lesson.id)}
            class="p-1 cursor-pointer text-primary hover:text-error bg-transparent border-none shrink-0">
            <X size={14} />
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Disponibles -->
  <div class="flex flex-col gap-1">
    <span class="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">Disponibles</span>
    {#each filtered.filter(l => !linkedLessonIds.includes(l.id)) as lesson}
      <button onclick={() => onlink(lesson.id)}
        class="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-transparent cursor-pointer text-left w-full hover:border-primary hover:bg-[#F0F7E6] bg-white transition-all">
        <BookOpen size={14} class="text-outline shrink-0" />
        <span class="text-[12px] text-on-surface truncate">{lesson.title}</span>
      </button>
    {:else}
      <p class="text-[12px] text-outline text-center py-3">Toutes les leçons sont liées</p>
    {/each}
  </div>
</div>
