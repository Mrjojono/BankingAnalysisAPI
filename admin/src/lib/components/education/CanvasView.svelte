<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { Grab, Crosshair, Lock, Unlock, Search, CheckCircle2 } from '@lucide/svelte';
  import type { Node, Edge, Connection } from '@xyflow/svelte';
  import { api } from '../../api';
  import GraphCanvas from '../graph/GraphCanvas.svelte';
  import PathNode from './PathNode.svelte';
  import LessonNode from './LessonNode.svelte';

  let {
    paths = [] as any[],
    lessons = [] as any[],
    onEditLesson,
    onNewPath,
    onNewLesson,
  }: {
    paths?: any[];
    lessons?: any[];
    onEditLesson?: (lessonId: string) => void;
    onNewPath?: () => void;
    onNewLesson?: (pathId?: string) => void;
  } = $props();

  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);
  let nodeTypes = { path: PathNode as any, lesson: LessonNode as any };
  let loading = $state(true);
  let sidebarOpen = $state(true);
  let canvasMode = $state<'pan' | 'select'>('pan');
  let locked = $state(false);
  let filterDifficulty = $state('');
  let pathSearch = $state('');
  let lessonSearch = $state('');
  let saving = $state(false);
  let saveStatus = $state('');

  $effect(() => {
    const f = filterDifficulty;
    untrack(() => applyFilter(f));
  });

  function applyFilter(f: string) {
    if (!f) {
      const hasHidden = nodes.some(n => n.hidden) || edges.some(e => e.hidden);
      if (!hasHidden) return;
      nodes = nodes.map(n => {
        if (!n.hidden) return n;
        const { hidden, ...rest } = n;
        return rest as Node;
      });
      edges = edges.map(e => {
        if (!e.hidden) return e;
        const { hidden, ...rest } = e;
        return rest as Edge;
      });
    } else {
      nodes = nodes.map(n => {
        const diff = (n.data as any)?.difficulty;
        return { ...n, hidden: diff !== f };
      });
      const hiddenIds = new Set(nodes.filter(n => n.hidden).map(n => n.id));
      edges = edges.map(e => ({ ...e, hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target) }));
    }
  }

  onMount(() => {
    loading = false;
  });

  function addPathToCanvas(p: any) {
    if (nodes.some(n => n.id === `path-${p.id}`)) return;
    const offset = nodes.length * 40;
    nodes = [...nodes, {
      id: `path-${p.id}`,
      type: 'path',
      position: { x: 60 + offset, y: 80 + offset },
      data: {
        id: p.id,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty,
        isActive: p.isActive,
        lessonCount: lessons.filter(l => l.learningPathId === p.id).length,
      },
      draggable: true,
    }];
  }

  function addLessonToCanvas(l: any) {
    if (nodes.some(n => n.id === `lesson-${l.id}`)) return;
    const offset = nodes.length * 40;
    nodes = [...nodes, {
      id: `lesson-${l.id}`,
      type: 'lesson',
      position: { x: 400 + offset, y: 60 + offset },
      data: {
        id: l.id,
        title: l.title,
        status: l.status,
        difficulty: l.difficulty,
        estimatedMinutes: l.estimatedMinutes,
      },
      draggable: true,
    }];
  }

  function handleConnect(conn: Connection): Edge | Connection {
    return {
      id: `e-${conn.source}-${conn.target}-${Date.now()}`,
      source: conn.source,
      target: conn.target,
      sourceHandle: conn.sourceHandle,
      targetHandle: conn.targetHandle,
      animated: true,
      style: 'stroke: #3A6A00; stroke-width: 2px',
    };
  }

  function onNodeClick(id: string) {
    if (id.startsWith('lesson-')) {
      const lessonId = id.replace('lesson-', '');
      onEditLesson?.(lessonId);
    }
  }

  async function saveCanvas() {
    saving = true; saveStatus = '';
    console.log('[Canvas] save edges:', edges.length, edges);
    try {
      const canvasEdges = edges.map(e => ({ source: e.source, target: e.target }));
      const res = await api.saveEducationCanvas(canvasEdges);
      saveStatus = `${res.updated} connexion${res.updated > 1 ? 's' : ''} enregistrée${res.updated > 1 ? 's' : ''}`;
      console.log('[Canvas] save OK:', res);
    } catch (e: any) {
      const msg = typeof e === 'string' ? e : e?.message ?? JSON.stringify(e);
      console.error('[Canvas] save error:', e);
      saveStatus = 'Erreur: ' + msg;
    }
    saving = false;
    setTimeout(() => saveStatus = '', 4000);
  }

  let filteredPaths = $derived.by(() => {
    if (!pathSearch) return paths;
    const q = pathSearch.toLowerCase();
    return paths.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  let filteredLessons = $derived.by(() => {
    if (!lessonSearch) return lessons;
    const q = lessonSearch.toLowerCase();
    return lessons.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.summary?.toLowerCase().includes(q)
    );
  });
</script>

<div class="flex h-full border border-mint-subtle rounded-2xl overflow-hidden bg-surface relative">
  <!-- Toggle sidebar -->
  <button
    class="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-white border border-mint-subtle border-l-0 rounded-r-md cursor-pointer text-[10px] flex items-center justify-center text-outline hover:bg-surface-container"
    onclick={() => sidebarOpen = !sidebarOpen}
  >
    {sidebarOpen ? '◀' : '▶'}
  </button>

  {#if sidebarOpen}
    <div class="w-[260px] border-r border-mint-subtle bg-background flex flex-col overflow-y-auto shrink-0">
      <div class="px-3.5 py-3 border-b border-mint-subtle">
        <h3 class="text-[13px] font-bold text-on-surface">Boîte à outils</h3>
      </div>

      <div class="border-b border-mint-subtle">
        <div class="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">
          <span>Parcours</span>
          <span class="text-[10px] font-semibold text-white bg-primary rounded-full px-1.5 py-0.5">{paths.length}</span>
        </div>
        <div class="px-2.5 pb-2.5 pt-1.5">
          <div class="relative mb-1.5">
            <Search size={12} class="absolute left-2 top-1/2 -translate-y-1/2 text-outline" />
            <input
              bind:value={pathSearch}
              placeholder="Filtrer parcours..."
              class="w-full pl-7 pr-2 py-1.5 border border-mint-subtle rounded-md text-[12px] bg-white focus:border-primary focus:outline-none"
            />
          </div>
          <div class="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
            {#each filteredPaths as p}
              <button
                class="flex items-center justify-between px-2 py-1.5 border border-transparent rounded cursor-pointer text-[12px] text-left w-full hover:border-primary hover:bg-[#F0F7E6] bg-white"
                onclick={() => addPathToCanvas(p)}
              >
                <span class="font-medium text-on-surface truncate min-w-0">{p.title}</span>
                <span class="text-[10px] text-outline shrink-0 ml-1.5">{p.difficulty}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="border-b border-mint-subtle">
        <div class="flex items-center justify-between px-3.5 pt-2.5 pb-1 text-[11px] font-bold text-on-surface-variant uppercase tracking-wide">
          <span>Leçons</span>
          <span class="text-[10px] font-semibold text-white bg-primary rounded-full px-1.5 py-0.5">{lessons.length}</span>
        </div>
        <div class="px-2.5 pb-2.5 pt-1.5">
          <div class="relative mb-1.5">
            <Search size={12} class="absolute left-2 top-1/2 -translate-y-1/2 text-outline" />
            <input
              bind:value={lessonSearch}
              placeholder="Filtrer leçons..."
              class="w-full pl-7 pr-2 py-1.5 border border-mint-subtle rounded-md text-[12px] bg-white focus:border-primary focus:outline-none"
            />
          </div>
          <div class="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
            {#each filteredLessons as l}
              <button
                class="flex items-center justify-between px-2 py-1.5 border border-transparent rounded cursor-pointer text-[12px] text-left w-full hover:border-primary hover:bg-[#F0F7E6] bg-white"
                onclick={() => addLessonToCanvas(l)}
              >
                <span class="font-medium text-on-surface truncate min-w-0">{l.title}</span>
                <span class="text-[10px] text-outline shrink-0 ml-1.5">{l.status}</span>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <div class="px-3.5 py-2.5 text-[11px] text-outline border-t border-mint-subtle mt-auto">
        <p class="m-0">Cliquez pour ajouter au canva, puis connectez en glissant</p>
      </div>
    </div>
  {/if}

  <div class="flex-1 flex flex-col min-w-0">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 px-3.5 py-2 border-b border-mint-subtle bg-white shrink-0">
      <button
        class="text-[12px] font-semibold text-white bg-primary border-0 rounded-md px-3.5 py-1.5 cursor-pointer hover:bg-[#2D5200] disabled:opacity-50 disabled:cursor-wait"
        onclick={() => saveCanvas()}
        disabled={saving}
      >
        {saving ? 'Sauvegarde…' : 'Enregistrer'}
      </button>
      {#if saveStatus}
        <span class="text-[12px] text-primary font-medium flex items-center gap-1">
          <CheckCircle2 size={14} /> {saveStatus}
        </span>
      {/if}

      <button
        class="text-[12px] font-semibold px-3 py-1.5 rounded-md border cursor-pointer transition-all {canvasMode === 'select' ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-mint-subtle hover:bg-surface-container'}"
        onclick={() => canvasMode = canvasMode === 'pan' ? 'select' : 'pan'}
        title={canvasMode === 'pan' ? 'Mode sélection' : 'Mode déplacement'}
      >
        {#if canvasMode === 'pan'}
          <Grab size={16} />
        {:else}
          <Crosshair size={16} />
        {/if}
      </button>

      <button
        class="text-[12px] font-semibold px-3 py-1.5 rounded-md border cursor-pointer transition-all {locked ? 'bg-amber-100 text-amber-700 border-amber-400' : 'bg-white text-on-surface-variant border-mint-subtle hover:bg-surface-container'}"
        onclick={() => locked = !locked}
        title={locked ? 'Déverrouiller le canva' : 'Verrouiller le canva'}
      >
        {#if locked}
          <Lock size={16} />
        {:else}
          <Unlock size={16} />
        {/if}
      </button>

      <select
        class="text-[12px] px-2 py-1.5 border border-mint-subtle rounded-md bg-white text-on-surface focus:border-primary focus:outline-none"
        bind:value={filterDifficulty}
      >
        <option value="">Tous niveaux</option>
        <option value="BEGINNER">Débutant</option>
        <option value="INTERMEDIATE">Intermédiaire</option>
        <option value="ADVANCED">Avancé</option>
      </select>

      <div class="w-px h-5 bg-mint-subtle shrink-0"></div>

      <button
        class="text-[12px] font-semibold text-primary bg-[#F0F7E6] border border-primary rounded-md px-3 py-1.5 cursor-pointer hover:bg-[#D4EDB0]"
        onclick={() => onNewPath?.()}
      >
        + Parcours
      </button>
      <button
        class="text-[12px] font-semibold text-primary bg-[#F0F7E6] border border-primary rounded-md px-3 py-1.5 cursor-pointer hover:bg-[#D4EDB0]"
        onclick={() => onNewLesson?.()}
      >
        + Leçon
      </button>
    </div>

    {#if loading}
      <div class="flex-1 flex items-center justify-center">
        <div class="flex flex-col items-center gap-2">
          <div class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span class="text-sm text-outline">Chargement du graphe…</span>
        </div>
      </div>
    {:else}
      <GraphCanvas
        {nodeTypes}
        bind:nodes
        bind:edges
        mode={canvasMode}
        bind:locked
        onNodeClick={onNodeClick}
        onBeforeConnect={handleConnect}
      />
    {/if}
  </div>
</div>
