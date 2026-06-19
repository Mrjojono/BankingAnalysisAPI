<script lang="ts">
  let {
    text = 'Chargement...',
    size = 'md',
  }: {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
  } = $props();

  const sizes: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
</script>

<div class="flex flex-col items-center justify-center gap-3 py-8 text-outline">
  <div class="{sizes[size]} rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
  {#if text}
    <p class="text-sm">{text}</p>
  {/if}
</div>
