<script lang="ts">
  let { children } = $props() as { children?: import('svelte').Snippet };

  let ref = $state<HTMLElement | null>(null);
  let visible = $state(false);

  $effect(() => {
    if (!ref) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true;
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(ref);
    return () => observer.disconnect();
  });
</script>

<div
  bind:this={ref}
  class="transition-all duration-700 ease-out"
  class:opacity-100={visible}
  class:translate-y-0={visible}
  class:opacity-0={!visible}
  class:translate-y-8={!visible}
>
  {#if children}
    {@render children()}
  {/if}
</div>
