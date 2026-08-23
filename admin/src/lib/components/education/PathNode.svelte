<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import type { Node } from '@xyflow/svelte';

  let { data }: NodeProps = $props();

  const DIFFICULTY_CLASSES: Record<string, string> = {
    BEGINNER: 'bg-green-50 text-green-700',
    INTERMEDIATE: 'bg-amber-50 text-amber-700',
    ADVANCED: 'bg-red-50 text-red-700',
  };

  const DIFFICULTY_LABELS: Record<string, string> = {
    BEGINNER: 'Débutant',
    INTERMEDIATE: 'Intermédiaire',
    ADVANCED: 'Avancé',
  };
</script>

<div class="min-w-[180px] bg-white border-2 {data.isActive ? 'border-primary' : 'border-mint-subtle'} rounded-2xl shadow-sm overflow-hidden">
  <div class="bg-primary/10 px-4 py-3 border-b border-mint-subtle/50">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-bold text-primary truncate">{data.title ?? 'Sans titre'}</h3>
      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full {DIFFICULTY_CLASSES[data.difficulty] ?? 'bg-surface-container text-on-surface-variant'}">
        {DIFFICULTY_LABELS[data.difficulty] ?? data.difficulty}
      </span>
    </div>
  </div>
  <div class="px-4 py-2 text-xs text-on-surface-variant flex items-center gap-2">
    <span>{data.lessonCount ?? 0} leçon{(data.lessonCount ?? 0) > 1 ? 's' : ''}</span>
    {#if !data.isActive}
      <span class="text-outline">• Inactif</span>
    {/if}
  </div>
  <Handle type="source" position={Position.Right} id="sr" class="!w-3 !h-3 !border-2 !border-primary !bg-white" />
</div>
