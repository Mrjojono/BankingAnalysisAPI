<script lang="ts">
  let {
    value = $bindable(''),
    label,
    placeholder = '',
    type = 'text',
    error = '',
    disabled = false,
    onkeydown,
  }: {
    value?: string;
    label?: string;
    placeholder?: string;
    type?: string;
    error?: string;
    disabled?: boolean;
    onkeydown?: (e: KeyboardEvent) => void;
  } = $props();
</script>

<label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
  {#if label}
    <span>{label}</span>
  {/if}
  <input
    bind:value
    {type}
    {placeholder}
    {disabled}
    {onkeydown}
    class="w-full px-4 py-2.5 rounded-xl border text-sm bg-surface text-on-surface placeholder:text-outline
      focus:outline-none focus:ring-2 focus:border-transparent transition-all
      {error ? 'border-error focus:ring-error' : 'border-mint-subtle focus:ring-primary'}"
  />
  {#if error}
    <span class="text-xs text-error">{error}</span>
  {/if}
</label>
