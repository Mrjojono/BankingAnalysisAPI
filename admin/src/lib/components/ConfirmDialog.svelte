<script lang="ts">
  import { AlertTriangle, X } from '@lucide/svelte';

  let {
    open = false,
    title = 'Confirmer',
    message = 'Êtes-vous sûr ?',
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'danger' as 'danger' | 'primary',
    onconfirm,
    oncancel,
  }: {
    open: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'primary';
    onconfirm: () => void;
    oncancel?: () => void;
  } = $props();

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && oncancel) oncancel();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true">
    <button class="absolute inset-0 bg-black/30 backdrop-blur-sm cursor-default border-none p-0" onclick={oncancel} aria-label="Annuler"></button>
    <div class="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-scale-in">
      <button onclick={oncancel} class="absolute top-3 right-3 p-1 rounded-lg cursor-pointer bg-transparent border-none text-outline hover:text-on-surface transition-colors">
        <X size={18} />
      </button>
      <div class="flex flex-col items-center text-center gap-3">
        <div class="w-12 h-12 rounded-full flex items-center justify-center {variant === 'danger' ? 'bg-red-50' : 'bg-primary-container'}">
          <AlertTriangle size={24} class={variant === 'danger' ? 'text-red-500' : 'text-primary'} />
        </div>
        <h3 class="text-lg font-bold text-on-surface">{title}</h3>
        <p class="text-sm text-on-surface-variant leading-relaxed">{message}</p>
        <div class="flex gap-3 w-full mt-2">
          {#if cancelText}
            <button onclick={oncancel}
              class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-mint-subtle bg-white text-on-surface cursor-pointer hover:bg-surface-container transition-colors">
              {cancelText}
            </button>
          {/if}
          <button onclick={onconfirm}
            class="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white border-none cursor-pointer transition-colors {variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes scale-in {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  .animate-scale-in {
    animation: scale-in 0.2s ease-out;
  }
</style>
