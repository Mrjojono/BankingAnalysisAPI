<script lang="ts">
  import { CheckCircle, AlertCircle, Info, X } from '@lucide/svelte';
  import { getToasts } from '../stores/toast.svelte';

  const toasts = getToasts();

  const icons: Record<string, any> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const styles: Record<string, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
</script>

{#if toasts.length > 0}
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
    {#each toasts as t (t.id)}
      <div class="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-slide-in {styles[t.type]}">
        {#if icons[t.type]}
          <svelte:component this={icons[t.type]} size={18} class="shrink-0" />
        {/if}
        <span class="flex-1">{t.message}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }
</style>
