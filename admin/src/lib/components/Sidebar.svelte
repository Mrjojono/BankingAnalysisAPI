<script lang="ts">
  import { Landmark, FileCheck, MessageSquare, BookOpen, FileText, LogOut, GitGraph, Bell, GraduationCap, Users, ScrollText, BarChart3, Cpu, ShieldCheck, MessagesSquare, Workflow } from '@lucide/svelte';
  import { getAuth } from '../stores/auth.svelte';

  let {
    page, onNavigate, collapsed = $bindable(false),
    logout,
  }: {
    logout: () => void;
    page: string;
    onNavigate: (p: string) => void;
    collapsed?: boolean;
  } = $props();

  const auth = getAuth();

  const navItems = [
    { section: 'Administration', items: [
      { id: 'products', icon: Landmark, label: 'Produits' },
      { id: 'rules', icon: FileCheck, label: 'Règles' },
      { id: 'graph', icon: GitGraph, label: 'Graphique' },
      { id: 'catalog', icon: MessageSquare, label: 'Messages' },
      { id: 'users', icon: Users, label: 'Utilisateurs' },
      { id: 'logs', icon: ScrollText, label: 'Logs' },
      { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
      { id: 'eligibility', icon: ShieldCheck, label: 'Éligibilité' },
    ]},
    { section: 'IA & Analyse', items: [
      { id: 'sms', icon: MessagesSquare, label: 'SMS' },
      { id: 'pipeline', icon: Workflow, label: 'Pipeline d\'analyse' },
      { id: 'centreIA', icon: Cpu, label: 'Centre IA' },
    ]},
    { section: 'Communication', items: [
      { id: 'notifications', icon: Bell, label: 'Notifications' },
    ]},
    { section: 'Éducation', items: [
      { id: 'education', icon: GraduationCap, label: 'Éducation financière' },
    ]},
    { section: 'Documentation', items: [
      { id: 'glossary', icon: BookOpen, label: 'Lexique' },
      { id: 'docs', icon: FileText, label: 'Documentation' },
    ]},
  ];

  function navBtnClasses(id: string) {
    const base = 'flex items-center gap-3 w-full rounded-xl text-sm font-medium transition-all cursor-pointer';
    const sizing = collapsed ? 'justify-center p-2.5' : 'px-4 py-3';
    const active = page === id
      ? 'bg-primary-container text-on-primary-container'
      : 'text-on-surface-variant hover:bg-surface-container';
    return `${base} ${sizing} ${active}`;
  }
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

  <nav class="flex-1 p-2 flex flex-col gap-3 overflow-y-auto">
    {#each navItems as { section, items }}
      {#if !collapsed}
        <p class="text-[10px] font-bold text-outline uppercase tracking-widest px-3">
          {section}
        </p>
      {/if}
      <div class="flex flex-col gap-1">
        {#each items as { id, icon: Icon, label }}
          <button
            onclick={() => onNavigate(id)}
            title={collapsed ? label : undefined}
            class={navBtnClasses(id)}
          >
            <Icon size={22} class="shrink-0" />
            {#if !collapsed}<span class="truncate">{label}</span>{/if}
          </button>
        {/each}
      </div>
      {#if !collapsed && section !== 'Documentation'}
        <div class="border-t border-mint-subtle mx-3"></div>
      {/if}
    {/each}
  </nav>

  <div class="p-2 border-t border-mint-subtle">
    {#if !collapsed}
      <div class="flex items-center gap-3 p-2 rounded-xl bg-white border border-mint-subtle">
        <div class="w-10 h-10 rounded-full overflow-hidden border border-mint-subtle shrink-0">
          <img
            src="https://ui-avatars.com/api/?name={encodeURIComponent(auth.user?.email ?? 'Admin+Orabank')}&background=3a6a00&color=fff"
            alt="User"
          />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold text-on-surface truncate">{auth.user?.username ?? auth.user?.email ?? 'Admin'}</p>
          <p class="text-xs text-outline">{auth.user?.role ?? '—'}</p>
          <button onclick={logout} class="text-xs font-medium text-on-surface-variant mt-0.5 hover:text-error transition-colors cursor-pointer bg-transparent border-none p-0">
            Déconnexion
          </button>
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
