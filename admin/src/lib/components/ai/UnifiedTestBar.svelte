<script lang="ts">
  import { Search, Play } from '@lucide/svelte';

  let {
    testLoading,
    onTest,
  }: {
    testLoading: boolean;
    onTest: (body: string) => void;
  } = $props();

  let localBody = $state('');

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && localBody.trim() && !testLoading) onTest(localBody);
  }

  function handleClick() {
    if (localBody.trim() && !testLoading) onTest(localBody);
  }
</script>

<div class="bg-white border border-mint-subtle rounded-2xl p-4">
  <div class="flex items-center gap-3 mb-3">
    <Search size={18} class="text-primary" />
    <h3 class="text-sm font-bold text-on-surface">Test unifié</h3>
    <span class="text-[10px] text-outline">RegEx + CamenBert + Embeddings + Classifieur en un clic</span>
  </div>
  <div class="flex gap-3">
    <input
      bind:value={localBody}
      placeholder="Ex: Vous avez recu 5000 F de M. Kodjo"
      onkeydown={handleKey}
      disabled={testLoading}
      class="flex-1 px-4 py-2.5 rounded-xl border border-mint-subtle bg-surface text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    />
    <button
      onclick={handleClick}
      disabled={testLoading || !localBody.trim()}
      class="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-none min-w-[120px] justify-center"
    >
      {#if testLoading}
        <div class="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
        Test en cours…
      {:else}
        <Play size={18} />
        Tester
      {/if}
    </button>
  </div>
</div>