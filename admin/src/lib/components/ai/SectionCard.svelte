<script lang="ts">
  let {
    icon: Icon,
    title,
    description,
    badge,
    onclick,
  }: {
    icon: any;
    title: string;
    description: string;
    badge?: string;
    onclick: () => void;
  } = $props();
</script>

<button
  onclick={onclick}
  class="group flex items-start gap-4 p-5 rounded-2xl bg-white border border-mint-subtle hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer text-left w-full"
>
  <div class="w-12 h-12 rounded-2xl bg-primary-container/40 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary-container/60 transition-colors">
    <Icon size={22} />
  </div>
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-2 mb-0.5">
      <h3 class="text-sm font-bold text-on-surface">{title}</h3>
      {#if badge}
        <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-surface-container-low text-on-surface-variant">{badge}</span>
      {/if}
    </div>
    <p class="text-xs text-outline">{description}</p>
  </div>
  <div class="text-outline/40 group-hover:text-outline/70 transition-colors mt-1">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
</button>
