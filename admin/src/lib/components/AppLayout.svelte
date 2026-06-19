<script lang="ts">
  import { ChevronRight, Calendar, PanelLeftClose, PanelLeft } from '@lucide/svelte';
  import Sidebar from './Sidebar.svelte';
  import Toast from './Toast.svelte';
  import { getAuth, logout as doLogout } from '../stores/auth.svelte';

  let {
    page,
    onNavigate,
    children,
  }: {
    page: string;
    onNavigate: (p: string, productId?: string | null) => void;
    children?: import('svelte').Snippet;
  } = $props();

  const auth = getAuth();
  let sidebarCollapsed = $state(false);

  function today() {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  const pageTitles: Record<string, string> = {
    products: 'Produits',
    rules: 'Règles',
    catalog: 'Messages',
    classifier: 'Classifieur',
    embedding: 'Embeddings',
    training: 'Entraînement',
    glossary: 'Lexique',
    docs: 'Documentation',
  };

  async function handleLogout() {
    await doLogout();
  }
</script>

<Toast />
<div class="flex h-screen bg-background text-on-surface antialiased overflow-hidden">
  <Sidebar
    logout={handleLogout}
    {page}
    bind:collapsed={sidebarCollapsed}
    onNavigate={(p: string) => onNavigate(p)}
  />

  <div class="flex-1 flex flex-col overflow-hidden">
    <header class="h-16 bg-surface border-b border-mint-subtle flex items-center justify-between px-8 shrink-0">
      <div class="flex items-center gap-1 text-sm">
        <button
          onclick={() => sidebarCollapsed = !sidebarCollapsed}
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-all cursor-pointer border-none text-on-surface-variant"
          title={sidebarCollapsed ? 'Déplier le menu' : 'Replier le menu'}
        >
          {#if sidebarCollapsed}
            <PanelLeft size={20} />
          {:else}
            <PanelLeftClose size={20} />
          {/if}
        </button>
        <span class="text-on-surface-variant ml-1">Monitoring</span>
        <ChevronRight size={16} class="text-outline" />
        <span class="font-semibold text-on-surface">
          {pageTitles[page] ?? page}
        </span>
      </div>

      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low border border-mint-subtle rounded-full text-sm font-medium text-on-surface-variant">
          <Calendar size={18} class="text-outline" />
          {today()}
        </div>
        <div class="flex items-center gap-2 px-3 py-1.5 text-sm text-on-surface-variant">
          <span class="w-2 h-2 rounded-full bg-green-500"></span>
          {auth.user?.email ?? '—'}
        </div>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#dfe4d8] [&::-webkit-scrollbar-thumb]:rounded-full">
      <div class="max-w-7xl mx-auto">
        {@render children?.()}
      </div>
    </main>
  </div>
</div>
