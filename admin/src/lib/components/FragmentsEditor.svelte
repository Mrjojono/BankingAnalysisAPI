<script lang="ts">
  import { Plus, Trash2, Sparkles, Search, X } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../../lib/api';
  import { toast } from '../../lib/stores/toast.svelte';
  import Button from './Button.svelte';
  import Drawer from './Drawer.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import Card from './Card.svelte';
  import Spinner from './Spinner.svelte';

  let fragments = $state<Record<string, any>>({});
  let loading = $state(true);
  let search = $state('');

  // Slot editor drawer
  let slotDrawerOpen = $state(false);
  let editingGroup = $state<string | null>(null);
  let editingSlot = $state<string | null>(null);
  let editingTemplates = $state<string[]>(['']);
  let editingConditions = $state('');

  // New slot drawer
  let newSlotDrawerOpen = $state(false);
  let newSlotGroup = $state<string | null>(null);
  let newSlotName = $state('');
  let newSlotTemplate = $state('');
  let newSlotConditions = $state('');

  // Composition editor drawer
  let compDrawerOpen = $state(false);
  let editingCompKey = $state<string | null>(null);
  let editingComp = $state<Record<string, any>>({});
  let addingSeverity = $state(false);
  let newSeverityVal = $state('INFO');
  let addingSlotForSev = $state<string | null>(null);
  let newSlotNameForBand = $state('');

  // New composition drawer
  let newCompDrawerOpen = $state(false);
  let newCompName = $state('');

  // Confirm dialog
  let confirm = $state<{ title: string; message: string; action: () => void } | null>(null);
  function ask(title: string, message: string, action: () => void) {
    confirm = { title, message, action };
  }
  function cancelConfirm() { confirm = null; }
  function execConfirm() { confirm?.action(); confirm = null; }

  // Preview state
  let previewKind = $state('');
  let previewSeverity = $state('INFO');
  let previewResult = $state<{ title: string; message: string; action?: string } | null>(null);
  let previewLoading = $state(false);
  let availableIntents = $state<string[]>([]);
  let previewVars = $state('');

  const SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'];
  const CONDITIONS_PLACEHOLDER = '{"max_severity": ["WARNING", "CRITICAL"]}';
  const PREVIEW_PLACEHOLDER = '{"catégorie": "logement", "montant": 150000, "pct": 25}';
  const SLOT_TEMPLATE_PLACEHOLDER = 'ex: Tes dépenses {catégorie} ont bondi de {pct}%';
  const NEW_SLOT_TEMPLATE_PLACEHOLDER = 'ex: Tes dépenses {catégorie} ont augmenté de {pct}%';
  const PLACEHOLDERS = ['{catégorie}', '{montant}', '{pct}', '{label}', '{prev_montant}', '{pct_revenus}', '{seuil}', '{count}'];

  const FRAGMENT_GROUPS: Record<string, { label: string; desc: string }> = {
    observations: { label: 'Observations', desc: 'Constats factuels sur les dépenses' },
    interpretations: { label: 'Interprétations', desc: 'Mise en contexte et comparaisons' },
    recommendations: { label: 'Recommandations', desc: 'Actions concrètes et conseils' },
    encouragements: { label: 'Encouragements', desc: 'Messages positifs et motivation' },
  };

  let filteredGroups = $derived.by(() => {
    if (!search) return Object.entries(FRAGMENT_GROUPS);
    const q = search.toLowerCase();
    return Object.entries(FRAGMENT_GROUPS).filter(([key]) => {
      const group = fragments[key];
      if (!group) return false;
      return Object.keys(group).some(slot =>
        slot.toLowerCase().includes(q) ||
        group[slot]?.templates?.some((t: string) => t.toLowerCase().includes(q))
      );
    });
  });

  let filteredCompositions = $derived.by(() => {
    if (!search || !fragments.compositions) return Object.entries(fragments.compositions ?? {});
    const q = search.toLowerCase();
    return Object.entries(fragments.compositions).filter(([key, comp]) =>
      key.toLowerCase().includes(q) ||
      JSON.stringify(comp).toLowerCase().includes(q)
    );
  });

  onMount(async () => {
    await loadFragments();
  });

  async function loadFragments() {
    loading = true;
    try {
      fragments = await api.getCatalogFragments();
      availableIntents = await api.listNlgIntents();
      if (availableIntents.length > 0 && !previewKind) {
        previewKind = availableIntents[0];
      }
    } catch (e: any) {
      toast.error('Erreur chargement fragments : ' + e.message);
    }
    loading = false;
  }

  // ─── Slot CRUD ───
  function openSlotEditor(group: string, slot: string) {
    editingGroup = group;
    editingSlot = slot;
    const frag = fragments[group]?.[slot];
    editingTemplates = frag?.templates ? [...frag.templates] : [''];
    editingConditions = frag?.conditions ? JSON.stringify(frag.conditions) : '';
    slotDrawerOpen = true;
  }

  function openNewSlotDrawer(group: string) {
    newSlotGroup = group;
    newSlotName = '';
    newSlotTemplate = '';
    newSlotConditions = '';
    newSlotDrawerOpen = true;
  }

  async function createNewSlot() {
    const group = newSlotGroup;
    const name = newSlotName.trim();
    if (!group) { toast.error('Groupe invalide'); return; }
    if (!name) { toast.error('Nom du slot requis'); return; }
    if (fragments[group]?.[name]) {
      toast.error('Ce slot existe déjà.');
      return;
    }
    if (!fragments[group]) fragments[group] = {};
    const entry: any = { templates: [newSlotTemplate.trim() || ''] };
    if (newSlotConditions.trim()) {
      try { entry.conditions = JSON.parse(newSlotConditions); } catch {
        toast.error('Conditions JSON invalides');
        return;
      }
    }
    try {
      fragments[group][name] = entry;
      await api.updateCatalogFragments(fragments);
      fragments = await api.getCatalogFragments();
      toast.success(`Slot "${name}" créé`);
      newSlotDrawerOpen = false;
      openSlotEditor(group, name);
    } catch (e: any) {
      toast.error('Erreur création : ' + e.message);
    }
  }

  async function saveSlot() {
    if (!editingGroup || !editingSlot) return;
    const entry: any = { templates: editingTemplates.filter(Boolean) };
    if (editingConditions.trim()) {
      try { entry.conditions = JSON.parse(editingConditions); } catch {
        toast.error('Conditions JSON invalides');
        return;
      }
    }
    try {
      if (!fragments[editingGroup]) fragments[editingGroup] = {};
      fragments[editingGroup][editingSlot] = entry;
      await api.updateCatalogFragments(fragments);
      fragments = await api.getCatalogFragments();
      toast.success(`Slot "${editingSlot}" mis à jour`);
      slotDrawerOpen = false;
      editingGroup = null;
      editingSlot = null;
    } catch (e: any) {
      toast.error('Erreur sauvegarde : ' + e.message);
    }
  }

  function confirmDeleteSlot(group: string, slot: string) {
    ask(`Supprimer le slot "${slot}" ?`, 'Tous les templates de ce fragment seront perdus.', async () => {
      delete fragments[group][slot];
      await api.updateCatalogFragments(fragments);
      fragments = { ...fragments };
      toast.success(`Slot "${slot}" supprimé`);
    });
  }

  // ─── Composition CRUD ───
  function openCompEditor(key: string) {
    editingCompKey = key;
    editingComp = JSON.parse(JSON.stringify(fragments.compositions?.[key] ?? { severity: {} }));
    compDrawerOpen = true;
  }

  function addSeverityBand() {
    if (editingComp.severity?.[newSeverityVal]) {
      toast.error(`La sévérité ${newSeverityVal} existe déjà.`);
      return;
    }
    if (!editingComp.severity) editingComp.severity = {};
    editingComp.severity[newSeverityVal] = [];
    editingComp = { ...editingComp };
    addingSeverity = false;
  }

  function removeSeverityBand(sev: string) {
    delete editingComp.severity[sev];
    editingComp = { ...editingComp };
  }

  function addSlotToBand(sev: string) {
    const name = newSlotNameForBand.trim();
    if (!name) { toast.error('Nom du slot requis'); return; }
    if (!editingComp.severity[sev]) editingComp.severity[sev] = [];
    editingComp.severity[sev] = [...editingComp.severity[sev], name];
    newSlotNameForBand = '';
    addingSlotForSev = null;
  }

  function removeSlotFromBand(sev: string, idx: number) {
    editingComp.severity[sev].splice(idx, 1);
    editingComp.severity[sev] = [...editingComp.severity[sev]];
  }

  async function saveComposition() {
    if (!editingCompKey) return;
    try {
      if (!fragments.compositions) fragments.compositions = {};
      fragments.compositions[editingCompKey] = editingComp;
      await api.updateCatalogFragments(fragments);
      fragments = await api.getCatalogFragments();
      availableIntents = Object.keys(fragments.compositions ?? {});
      toast.success(`Composition "${editingCompKey}" mise à jour`);
      compDrawerOpen = false;
      editingCompKey = null;
    } catch (e: any) {
      toast.error('Erreur sauvegarde : ' + e.message);
    }
  }

  function confirmDeleteComposition(key: string) {
    ask(`Supprimer la composition "${key}" ?`, 'Cette action est irréversible.', async () => {
      delete fragments.compositions[key];
      await api.updateCatalogFragments(fragments);
      fragments = { ...fragments };
      availableIntents = Object.keys(fragments.compositions ?? {});
      if (previewKind === key) previewKind = availableIntents[0] ?? '';
      toast.success(`Composition "${key}" supprimée`);
    });
  }

  function openNewComposition() {
    newCompName = '';
    newCompDrawerOpen = true;
  }

  async function createComposition() {
    const name = newCompName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!name) { toast.error('Nom requis'); return; }
    if (fragments.compositions?.[name]) {
      toast.error('Cette composition existe déjà.');
      return;
    }
    try {
      if (!fragments.compositions) fragments.compositions = {};
      fragments.compositions[name] = { severity: { INFO: ['ok', 'good'] } };
      await api.updateCatalogFragments(fragments);
      fragments = { ...fragments };
      availableIntents = [...availableIntents, name];
      toast.success(`Composition "${name}" créée`);
      newCompDrawerOpen = false;
      openCompEditor(name);
    } catch (e: any) {
      toast.error('Erreur création : ' + e.message);
    }
  }

  // ─── Preview ───
  async function runPreview() {
    previewLoading = true;
    previewResult = null;
    try {
      let varsObj: Record<string, any> = {};
      if (previewVars.trim()) {
        try { varsObj = JSON.parse(previewVars); } catch {
          previewResult = { title: 'Erreur', message: 'JSON des variables invalide' };
          previewLoading = false;
          return;
        }
      }
      previewResult = await api.previewNlg({ kind: previewKind, severity: previewSeverity, vars: varsObj });
    } catch (e: any) {
      previewResult = { title: 'Erreur', message: e.message };
    }
    previewLoading = false;
  }

  function sevClass(sev: string): string {
    if (sev === 'CRITICAL') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (sev === 'WARNING') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    return 'bg-green-50 text-green-700 ring-1 ring-green-200';
  }

  function getSlotTemplate(slotName: string): string {
    for (const gkey of Object.keys(FRAGMENT_GROUPS)) {
      const tpl = fragments[gkey]?.[slotName]?.templates?.[0];
      if (tpl) return tpl;
    }
    return '';
  }
</script>

{#if loading}
  <Spinner text="Chargement des fragments..." />
{:else}

<div class="relative mb-6">
  <Search size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
  <input
    type="text"
    placeholder="Rechercher un slot, un template, une composition…"
    bind:value={search}
    class="w-full pl-10 pr-10 py-2.5 bg-white border border-mint-subtle rounded-xl text-sm focus:border-primary focus:outline-none transition-all"
  />
  {#if search}
    <button onclick={() => search = ''}
      class="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-outline hover:text-on-surface transition-colors p-1">
      <X size={16} />
    </button>
  {/if}
</div>

<!-- ═══════════ Fragment Groups ═══════════ -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  {#each filteredGroups as [groupKey, groupMeta]}
    <Card padding={false} class="overflow-hidden">
      <div class="px-5 py-4 bg-background border-b border-mint-subtle flex items-center justify-between">
        <div>
          <h3 class="font-bold text-base">{groupMeta.label}</h3>
          <p class="text-xs text-outline mt-0.5">{groupMeta.desc}</p>
        </div>
        <button type="button" onclick={() => openNewSlotDrawer(groupKey)}
          class="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer border-none text-on-surface-variant hover:bg-surface-container px-3 py-1.5 text-xs">
          <Plus size={16} />
        </button>
      </div>
      <div class="p-4">
        {#if fragments[groupKey] && Object.keys(fragments[groupKey]).length > 0}
          <div class="flex flex-wrap gap-2">
            {#each Object.entries(fragments[groupKey]) as [slot, data]}
              <div class="group relative inline-flex">
                <button onclick={() => openSlotEditor(groupKey, slot)}
                  class="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 bg-surface-container-low border border-mint-subtle hover:border-primary hover:bg-primary-container/30 rounded-full text-xs font-medium text-on-surface hover:text-primary transition-all cursor-pointer whitespace-nowrap"
                  title={getSlotTemplate(slot) || slot}>
                  <span class="font-mono font-semibold">{slot}</span>
                  <span class="text-[10px] bg-surface-container px-1.5 py-0.5 rounded-full text-outline leading-none"
                    title="{(data.templates?.length ?? 0) === 1 ? '1 template' : (data.templates?.length ?? 0) + ' templates'}">
                    {data.templates?.length ?? 0}
                  </span>
                </button>
                <button onclick={() => confirmDeleteSlot(groupKey, slot)}
                  class="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full bg-error text-white text-[8px] opacity-0 group-hover:opacity-100 transition-all cursor-pointer border-none shadow-sm hover:bg-red-600 z-10">
                  <Trash2 size={8} />
                </button>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-outline italic">Aucun fragment.</p>
        {/if}
      </div>
    </Card>
  {/each}
</div>

<!-- ═══════════ Compositions ═══════════ -->
<Card padding={false} class="overflow-hidden mb-8">
  <div class="px-5 py-4 bg-background border-b border-mint-subtle flex items-center justify-between">
    <div>
      <h3 class="font-bold text-base">Compositions</h3>
      <p class="text-xs text-outline mt-0.5">Associe un intent à des slots de fragments par sévérité</p>
    </div>
    <Button variant="ghost" size="sm" onclick={openNewComposition}>
      <Plus size={16} />
    </Button>
  </div>
  {#if filteredCompositions.length > 0}
    <div class="p-4 flex flex-wrap gap-2">
      {#each filteredCompositions as [key, comp]}
        <button onclick={() => openCompEditor(key)}
          class="group text-left bg-surface-container-low border border-mint-subtle hover:border-primary hover:bg-primary-container/30 rounded-xl px-4 py-2.5 transition-all cursor-pointer">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="font-bold text-sm text-on-surface">{key}</span>
            <span role="button" tabindex="0" onclick={(e) => { e.stopPropagation(); confirmDeleteComposition(key); }} onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); confirmDeleteComposition(key); } }}
              class="bg-transparent p-0 cursor-pointer text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100 inline-flex">
              <Trash2 size={12} />
            </span>
          </div>
          <div class="flex flex-wrap gap-1">
            {#each Object.entries(comp.severity ?? {}) as [sev, slots]}
              <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold {sevClass(sev)}">
                {sev}
                <span class="text-[9px] opacity-70">{(slots as string[]).length}</span>
              </span>
            {/each}
          </div>
        </button>
      {/each}
    </div>
  {:else}
    <div class="p-6 text-center">
      <p class="text-sm text-outline italic">Aucune composition trouvée</p>
    </div>
  {/if}
</Card>

<!-- ═══════════ Slot Editor Drawer ═══════════ -->
<Drawer
  open={slotDrawerOpen}
  title={editingSlot ?? 'Éditer le fragment'}
  onclose={() => { slotDrawerOpen = false; editingGroup = null; editingSlot = null; }}
  widthClass="max-w-xl"
>
  {#snippet footer()}
    <div class="flex gap-3 justify-end">
      <Button variant="secondary" onclick={() => { slotDrawerOpen = false; editingGroup = null; editingSlot = null; }}>
        Annuler
      </Button>
      <Button onclick={saveSlot}>
        Enregistrer
      </Button>
    </div>
  {/snippet}

  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2 text-xs text-outline font-mono bg-surface-container-low px-3 py-2 rounded-lg">
      <span class="font-semibold text-on-surface-variant">{editingGroup}</span>
      <span>/</span>
      <span>{editingSlot}</span>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold text-on-surface-variant">Variantes</span>
        <Button variant="ghost" size="sm" onclick={() => editingTemplates = [...editingTemplates, '']}>
          <Plus size={14} />
          Ajouter
        </Button>
      </div>
      {#each editingTemplates as _, i}
        <div class="flex gap-2 items-start">
          <textarea bind:value={editingTemplates[i]} rows="2"
            class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all resize-vertical"
            placeholder={SLOT_TEMPLATE_PLACEHOLDER}></textarea>
          <button onclick={() => { editingTemplates.splice(i, 1); editingTemplates = [...editingTemplates]; }}
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-outline shrink-0 mt-1">
            <Trash2 size={16} />
          </button>
        </div>
      {/each}
      {#if editingTemplates.length === 0}
        <p class="text-xs text-outline italic">Aucune variante. Ajoutez-en une.</p>
      {/if}
    </div>

    {#if editingGroup === 'recommendations'}
      <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
        Conditions (JSON, optionnel)
        <input bind:value={editingConditions} placeholder={CONDITIONS_PLACEHOLDER}
          class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none font-mono transition-all" />
      </label>
    {/if}

    <div class="flex flex-wrap gap-1.5">
      <span class="text-xs text-outline w-full font-semibold">Placeholders :</span>
      {#each PLACEHOLDERS as ph}
        <span class="px-2 py-0.5 bg-surface-container rounded text-xs font-mono text-outline">{ph}</span>
      {/each}
    </div>
  </div>
</Drawer>

<!-- ═══════════ New Slot Modal (inline) ═══════════ -->
{#if newSlotDrawerOpen}
  <button aria-label="Fermer" class="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 border-none cursor-default" onclick={() => { newSlotDrawerOpen = false; newSlotGroup = null; }}></button>
  <div class="fixed top-0 right-0 h-full w-full max-w-md bg-surface z-50 shadow-2xl flex flex-col">
    <header class="flex items-center justify-between px-6 h-16 border-b border-mint-subtle shrink-0">
      <h2 class="text-lg font-bold text-on-surface">Nouveau fragment</h2>
      <button onclick={() => { newSlotDrawerOpen = false; newSlotGroup = null; }}
        class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all cursor-pointer border-none">
        <X size={20} />
      </button>
    </header>
    <div class="flex-1 overflow-y-auto p-6">
      <div class="flex flex-col gap-4">
        <p class="text-xs text-outline">Nouveau slot dans <span class="font-semibold text-on-surface-variant">{newSlotGroup}</span></p>
        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Nom du slot
          <input bind:value={newSlotName}
            placeholder="ex: nouveau_slot"
            class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all font-mono"
            onkeydown={(e) => { if (e.key === 'Enter') createNewSlot(); }}
          />
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Template initial
          <textarea bind:value={newSlotTemplate} rows="2"
placeholder={NEW_SLOT_TEMPLATE_PLACEHOLDER}
        class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all resize-vertical"></textarea>
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
          Conditions (JSON, optionnel)
          <input bind:value={newSlotConditions} placeholder={CONDITIONS_PLACEHOLDER}
            class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none font-mono transition-all" />
        </label>
      </div>
    </div>
    <div class="px-6 py-4 border-t border-mint-subtle shrink-0">
      <div class="flex gap-3 justify-end">
        <button type="button" onclick={() => { newSlotDrawerOpen = false; newSlotGroup = null; }}
          class="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer border-none bg-surface-container text-on-surface hover:bg-surface-container-low px-5 py-2.5 text-sm">
          Annuler
        </button>
        <button type="button" onclick={createNewSlot} disabled={!newSlotName.trim()}
          class="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer border-none bg-primary text-white hover:bg-[#2d5200] disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 text-sm">
          Créer
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- ═══════════ Composition Editor Drawer ═══════════ -->
<Drawer
  open={compDrawerOpen}
  title={editingCompKey ?? 'Éditer la composition'}
  onclose={() => { compDrawerOpen = false; editingCompKey = null; }}
  widthClass="max-w-xl"
>
  {#snippet footer()}
    <div class="flex gap-3 justify-end">
      <Button variant="secondary" onclick={() => { compDrawerOpen = false; editingCompKey = null; }}>
        Annuler
      </Button>
      <Button onclick={saveComposition}>
        Enregistrer
      </Button>
    </div>
  {/snippet}

  <div class="flex flex-col gap-4">
    <p class="text-xs text-outline mb-2">Composition pour <span class="font-semibold text-on-surface-variant">{editingCompKey}</span></p>

    {#each Object.entries(editingComp.severity ?? {}) as [sev, slots]}
      <div class="border border-mint-subtle rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-bold px-2 py-0.5 rounded {sevClass(sev)}">{sev}</span>
          <button onclick={() => removeSeverityBand(sev)}
            class="text-outline hover:text-error transition-colors bg-transparent border-none cursor-pointer p-1">
            <Trash2 size={14} />
          </button>
        </div>
        <div class="flex flex-wrap gap-1.5 mb-2">
          {#each slots as slot, idx}
            <span class="group inline-flex items-center gap-1 px-2 py-1 bg-surface-container rounded-lg text-xs font-mono text-on-surface-variant"
              title={getSlotTemplate(slot) || slot}>
              <span class="max-w-[140px] truncate">{slot}</span>
              <button onclick={() => removeSlotFromBand(sev, idx)}
                class="bg-transparent border-none p-0 cursor-pointer text-outline hover:text-error transition-colors">
                <X size={12} />
              </button>
            </span>
          {:else}
            <span class="text-xs text-outline italic">Aucun slot</span>
          {/each}
        </div>

        {#if addingSlotForSev === sev}
          <div class="flex gap-2 items-center mt-2">
            <input bind:value={newSlotNameForBand}
              placeholder="nom du slot"
              class="flex-1 px-3 py-1.5 border border-mint-subtle rounded-lg text-xs bg-white focus:border-primary focus:outline-none font-mono"
              onkeydown={(e) => { if (e.key === 'Enter') addSlotToBand(sev); }}
            />
            <Button size="sm" onclick={() => addSlotToBand(sev)}>Ajouter</Button>
            <button onclick={() => { addingSlotForSev = null; newSlotNameForBand = ''; }}
              class="text-outline hover:text-on-surface bg-transparent border-none cursor-pointer text-xs px-1">
              Annuler
            </button>
          </div>
        {:else}
          <Button variant="ghost" size="sm" onclick={() => { addingSlotForSev = sev; newSlotNameForBand = ''; }}>
            <Plus size={14} />
            Slot
          </Button>
        {/if}
      </div>
    {/each}

    {#if addingSeverity}
      <div class="flex gap-2 items-center border border-mint-subtle rounded-xl p-3">
        <select bind:value={newSeverityVal}
          class="px-3 py-1.5 border border-mint-subtle rounded-lg text-xs bg-white focus:border-primary focus:outline-none">
          {#each SEVERITIES as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
        <Button size="sm" onclick={addSeverityBand}>Ajouter</Button>
        <button onclick={() => addingSeverity = false}
          class="text-outline hover:text-on-surface bg-transparent border-none cursor-pointer text-xs px-1">
          Annuler
        </button>
      </div>
    {:else}
      <Button variant="secondary" onclick={() => { addingSeverity = true; newSeverityVal = 'INFO'; }}>
        <Plus size={14} />
        Ajouter une sévérité
      </Button>
    {/if}
  </div>
</Drawer>

<!-- ═══════════ New Composition Drawer ═══════════ -->
<Drawer
  open={newCompDrawerOpen}
  title="Nouvelle composition"
  onclose={() => { newCompDrawerOpen = false; }}
  widthClass="max-w-sm"
>
  {#snippet footer()}
    <div class="flex gap-3 justify-end">
      <Button variant="secondary" onclick={() => { newCompDrawerOpen = false; }}>
        Annuler
      </Button>
      <Button onclick={createComposition} disabled={!newCompName.trim()}>
        Créer
      </Button>
    </div>
  {/snippet}
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
      Nom de l'intent
      <input bind:value={newCompName}
        placeholder="ex: DEPENSES_LOGEMENT"
        class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all font-mono uppercase"
        onkeydown={(e) => { if (e.key === 'Enter') createComposition(); }}
      />
    </label>
    <p class="text-xs text-outline">Sera converti en majuscules avec underscores. Une bande INFO par défaut sera créée.</p>
  </div>
</Drawer>

<!-- ═══════════ Preview NLG ═══════════ -->
<details class="bg-surface-container-low border border-mint-subtle rounded-xl overflow-hidden mb-8 group">
  <summary class="px-5 py-4 bg-background border-b border-mint-subtle cursor-pointer hover:bg-surface-container-low/50 transition-colors list-none flex items-center justify-between">
    <div>
      <h3 class="font-bold text-base">Preview NLG</h3>
      <p class="text-xs text-outline mt-0.5">Teste la génération de message</p>
    </div>
    <span class="text-outline text-xs group-open:rotate-180 transition-transform">▼</span>
  </summary>
  <div class="p-5">
    <div class="flex flex-wrap gap-4 items-end mb-4">
      <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
        Intent
        <select bind:value={previewKind}
          class="px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all min-w-[220px]">
          {#each availableIntents as k}
            <option value={k}>{k}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant">
        Sévérité
        <select bind:value={previewSeverity}
          class="px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all">
          {#each SEVERITIES as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </label>
      <Button onclick={runPreview} disabled={previewLoading}>
        <Sparkles size={16} />
        {previewLoading ? 'Génération...' : 'Générer'}
      </Button>
    </div>

    <label class="flex flex-col gap-1.5 text-sm font-semibold text-on-surface-variant mb-4">
      Variables (JSON, optionnel)
      <textarea bind:value={previewVars} rows="2" placeholder={PREVIEW_PLACEHOLDER}
        class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all resize-vertical font-mono"></textarea>
    </label>

    {#if previewLoading}
      <div class="flex items-center gap-2 py-4 text-sm text-outline">
        <Spinner text="" size="sm" />
        Composition en cours...
      </div>
    {/if}

    {#if previewResult}
      <div class="border border-mint-subtle rounded-xl overflow-hidden">
        <div class="px-4 py-2 bg-background border-b border-mint-subtle">
          <span class="text-xs font-semibold text-outline uppercase tracking-wide">Résultat</span>
        </div>
        <div class="p-4 flex flex-col gap-3">
          <div>
            <span class="text-xs font-semibold text-outline uppercase">Titre</span>
            <p class="text-sm font-medium text-on-surface mt-0.5">{previewResult.title}</p>
          </div>
          <div>
            <span class="text-xs font-semibold text-outline uppercase">Message</span>
            <p class="text-sm text-on-surface mt-0.5 leading-relaxed">{previewResult.message}</p>
          </div>
          {#if previewResult.action}
            <div>
              <span class="text-xs font-semibold text-outline uppercase">Action</span>
              <p class="text-sm text-on-surface mt-0.5">{previewResult.action}</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</details>

<!-- ═══════════ Confirm Dialog ═══════════ -->
{#if confirm}
  <ConfirmDialog
    open={true}
    title={confirm.title}
    message={confirm.message}
    onconfirm={execConfirm}
    oncancel={cancelConfirm}
  />
{/if}

{/if}
