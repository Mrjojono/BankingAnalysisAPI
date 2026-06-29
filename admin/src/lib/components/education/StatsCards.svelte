<script lang="ts">
  import Card from '../Card.svelte';

  let {
    totalPaths = 0,
    totalLessons = 0,
    publishedLessons = 0,
    draftLessons = 0,
  }: {
    totalPaths?: number;
    totalLessons?: number;
    publishedLessons?: number;
    draftLessons?: number;
  } = $props();
</script>

<div class="grid grid-cols-4 gap-4 mb-6">
  <Card padding={false} class="p-5 flex flex-col gap-1 !bg-surface">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Parcours</span>
    <span class="text-3xl font-bold">{totalPaths}</span>
  </Card>
  <Card padding={false} class="p-5 flex flex-col gap-1 !bg-surface">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Leçons</span>
    <span class="text-3xl font-bold">{totalLessons}</span>
  </Card>
  <Card padding={false} class="p-5 flex flex-col gap-1 !bg-surface">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Publiées</span>
    <span class="text-3xl font-bold text-primary">{publishedLessons}</span>
  </Card>
  <Card padding={false} class="p-5 flex flex-col gap-1 !bg-surface">
    <span class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Brouillons</span>
    <span class="text-3xl font-bold text-amber-600">{draftLessons}</span>
  </Card>
</div>
