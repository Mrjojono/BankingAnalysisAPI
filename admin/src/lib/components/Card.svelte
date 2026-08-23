<script lang="ts">
  let {
    class: className = '',
    padding = true,
    children,
  }: {
    class?: string;
    padding?: boolean;
    children?: import('svelte').Snippet;
  } = $props();
</script>

<div class="bg-white border border-mint-subtle rounded-2xl {padding ? 'p-6' : ''} {className}">
  {@render children?.()}
</div>
