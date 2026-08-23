<script lang="ts">
  let {
    checked = false,
    onchange,
    activeLabel = 'Actif',
    inactiveLabel = 'Inactif',
    title,
  }: {
    checked?: boolean;
    onchange?: (next: boolean) => void;
    activeLabel?: string;
    inactiveLabel?: string;
    title?: string;
  } = $props();
</script>

<button
  onclick={() => onchange?.(!checked)}
  class="inline-flex items-center gap-2 border-none bg-transparent cursor-pointer group"
  {title}
  aria-pressed={checked}
  type="button"
>
  <span class="relative inline-flex w-9 h-5 rounded-full transition-colors {checked ? 'bg-green-600' : 'bg-gray-300 group-hover:bg-gray-400'}">
    <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform {checked ? 'translate-x-4' : ''}"></span>
  </span>
  <span class="text-xs font-semibold {checked ? 'text-green-700' : 'text-gray-500'}">
    {checked ? activeLabel : inactiveLabel}
  </span>
</button>
