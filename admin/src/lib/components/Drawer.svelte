<script lang="ts">
  import { X } from '@lucide/svelte';

  interface DrawerProps {
    open: boolean;
    title: string;
    onclose: () => void;
    widthClass?: string;
    footer?: import('svelte').Snippet;
    children?: import('svelte').Snippet;
  }

  let { open, title, onclose, widthClass = 'max-w-lg', footer, children }: DrawerProps = $props();
</script>

<svelte:body class:overflow-hidden={open} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<button
  aria-label="Fermer"
  class="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 cursor-default"
  class:opacity-100={open}
  class:opacity-0={!open}
  class:pointer-events-auto={open}
  class:pointer-events-none={!open}
  onclick={onclose}
></button>

<aside
  class="fixed top-0 right-0 h-full w-full {widthClass} bg-surface z-50 shadow-2xl flex flex-col
    transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
  class:translate-x-0={open}
  class:translate-x-full={!open}
>
  <header class="flex items-center justify-between px-6 h-16 border-b border-mint-subtle shrink-0">
    <h2 class="text-lg font-bold text-on-surface">{title}</h2>
    <button
      onclick={onclose}
      class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all cursor-pointer border-none"
    >
      <X size={20} />
    </button>
  </header>

  <div class="flex-1 overflow-y-auto p-6">
    {#if children && open}
      {@render children()}
    {/if}
  </div>

  {#if footer}
    <div class="px-6 py-4 border-t border-mint-subtle shrink-0">
      {@render footer()}
    </div>
  {/if}
</aside>
