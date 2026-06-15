<script lang="ts">
  import { Landmark, FileCheck, MessageSquare, BookOpen, LogOut, FlaskConical, Layers, Brain } from '@lucide/svelte';

  let {
    page, onNavigate, collapsed = $bindable(false),
    logout,
  }: {
    logout: () => void;
    page: string;
    onNavigate: (p: string) => void;
    collapsed?: boolean;
  } = $props();

  const items = [
    { id: 'products', icon: Landmark, label: 'Produits' },
    { id: 'rules', icon: FileCheck, label: 'Règles' },
    { id: 'catalog', icon: MessageSquare, label: 'Messages' },
  ];

  const analyticsItems = [
    { id: 'classifier', icon: FlaskConical, label: 'Classifieur' },
    { id: 'embedding', icon: Layers, label: 'Embeddings' },
    { id: 'training', icon: Brain, label: 'Entraînement' },
  ];

  const bottomItems = [
    { id: 'glossary', icon: BookOpen, label: 'Lexique' },
  ];
</script>

<aside
  class="bg-surface-container-low border-r border-mint-subtle flex flex-col shrink-0 transition-all duration-200"
  class:w-64={!collapsed}
  class:w-[64px]={collapsed}
>
  <div class="h-16 flex items-center gap-2 px-4 border-b border-mint-subtle">
    {#if !collapsed}
      <h1 class="text-[20px] font-extrabold text-primary tracking-tight min-w-0 shrink-0">
        ORABANK
      </h1>
    {:else}
      <h1 class="text-[20px] font-extrabold text-primary tracking-tight mx-auto">
        O
      </h1>
    {/if}
  </div>

  <nav class="flex-1 p-2 flex flex-col gap-1">
    {#if !collapsed}
      <p class="text-[10px] font-bold text-outline uppercase tracking-widest px-3 pb-2">
        Administration
      </p>
    {/if}
    {#each items as { id, icon: Icon, label }}
      <button
        onclick={() => onNavigate(id)}
        title={collapsed ? label : undefined}
        class="flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all cursor-pointer
          {collapsed
            ? 'justify-center p-2.5'
            : 'px-4 py-3'}
          {page === id
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container'}"
      >
        <Icon size={22} class="shrink-0" />
        {#if !collapsed}<span class="truncate">{label}</span>{/if}
      </button>
    {/each}

    {#if !collapsed}
      <p class="text-[10px] font-bold text-outline uppercase tracking-widest px-3 pb-2 pt-3 mt-1 border-t border-mint-subtle">
        Analytics
      </p>
    {/if}
    {#each analyticsItems as { id, icon: Icon, label }}
      <button
        onclick={() => onNavigate(id)}
        title={collapsed ? label : undefined}
        class="flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all cursor-pointer
          {collapsed
            ? 'justify-center p-2.5'
            : 'px-4 py-3'}
          {page === id
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container'}"
      >
        <Icon size={22} class="shrink-0" />
        {#if !collapsed}<span class="truncate">{label}</span>{/if}
      </button>
    {/each}
  </nav>

  <nav class="p-2 flex flex-col gap-1">
    {#if !collapsed}
      <p class="text-[10px] font-bold text-outline uppercase tracking-widest px-3 pb-2">
        Documentation
      </p>
    {/if}
    {#each bottomItems as { id, icon: Icon, label }}
      <button
        onclick={() => onNavigate(id)}
        title={collapsed ? label : undefined}
        class="flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all cursor-pointer
          {collapsed
            ? 'justify-center p-2.5'
            : 'px-4 py-3'}
          {page === id
            ? 'bg-primary-container text-on-primary-container'
            : 'text-on-surface-variant hover:bg-surface-container'}"
      >
        <Icon size={22} class="shrink-0" />
        {#if !collapsed}<span class="truncate">{label}</span>{/if}
      </button>
    {/each}
  </nav>

  <div class="p-2 border-t border-mint-subtle">
    {#if !collapsed}
      <div class="flex items-center gap-3 p-2 rounded-xl bg-white border border-mint-subtle">
        <div class="w-10 h-10 rounded-full overflow-hidden border border-mint-subtle shrink-0">
          <img src="https://ui-avatars.com/api/?name=Admin+Orabank&background=3a6a00&color=fff" alt="User" />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-bold text-on-surface truncate">Admin</p>
          <button onclick={logout} class="text-sm font-medium text-on-surface-variant">Déconnexion</button>
        </div>
      </div>
    {:else}
      <button onclick={logout} title="Déconnexion"
        class="flex items-center justify-center w-full p-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-error transition-all cursor-pointer border-none">
        <LogOut size={22} />
      </button>
    {/if}
  </div>
</aside>
