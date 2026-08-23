<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';

  let { data }: NodeProps = $props();

  const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: 'Débutant',
    INTERMEDIATE: 'Intermédiaire',
    ADVANCED: 'Avancé',
  };

  const STATUS_STYLES: Record<string, string> = {
    DRAFT: 'bg-amber-100 text-amber-700 border-amber-200',
    PUBLISHED: 'bg-green-100 text-green-700 border-green-200',
    ARCHIVED: 'bg-gray-100 text-gray-500 border-gray-200',
  };
</script>

<div class="min-w-[160px] bg-white border-2 rounded-xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-primary transition-all"
  class:border-primary={data.status === 'PUBLISHED'}
  class:border-amber-400={data.status === 'DRAFT'}
  class:border-mint-subtle={data.status === 'ARCHIVED'}>
  <Handle type="target" position={Position.Left} id="tl" class="!w-3 !h-3 !border-2 !border-primary !bg-white" />
  <div class="px-3 py-2.5">
    <div class="flex items-center gap-1.5 mb-1">
      <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border {STATUS_STYLES[data.status] ?? 'bg-surface-container text-on-surface-variant border-mint-subtle'}">
        {data.status ?? 'DRAFT'}
      </span>
      {#if data.estimatedMinutes}
        <span class="text-[10px] text-outline">{data.estimatedMinutes} min</span>
      {/if}
    </div>
    <p class="text-xs font-semibold text-on-surface leading-tight">{data.title ?? 'Sans titre'}</p>
    <span class="text-[10px] text-outline">{DIFFICULTY_LABELS[data.difficulty] ?? data.difficulty}</span>
  </div>
</div>
