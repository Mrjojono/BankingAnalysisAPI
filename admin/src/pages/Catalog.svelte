<script lang="ts">
  import { Info, Plus, Trash2, Loader, Sparkles } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Button from '../lib/components/Button.svelte';
  import Input from '../lib/components/Input.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import FragmentsEditor from '../lib/components/FragmentsEditor.svelte';

  let tab = $state<'classic' | 'fragments'>('fragments');

  // ─── Classic catalog ───
  let catalog = $state<Record<string, any>>({});
  let sections = $derived(Object.entries(catalog));
  let error = $state('');
  let editingSection = $state<string | null>(null);
  let editingPattern = $state<string | null>(null);
  let drawerOpen = $state(false);
  let helpOpen = $state(false);
  let saving = $state(false);
  let patternForm = $state<{ label: string; unit: string; pass: string[]; fail: string[]; partial: string[]; advice: string[] } | null>(null);
  let interpretationForm = $state<{ label: string; levels: Record<string, { label: string; message: string; priorities: string[] }> } | null>(null);

  const LEVEL_KEYS = ['EXCELLENT', 'BON', 'MOYEN', 'FAIBLE', 'CRITIQUE'];

  const SECTION_KEYS: Record<string, { label: string }> = {
    eligibility: { label: 'Éligibilité' },
    advice_templates: { label: 'Conseils' },
    interpreter: { label: 'Interpréteur' },
    labels: { label: 'Libellés' },
    score_labels: { label: 'Étiquettes de score' },
    score_interpretations: { label: 'Interprétations du score' },
  };

  const PLACEHOLDER_HINTS = [
    { token: '{value}', desc: 'Valeur du client' },
    { token: '{threshold}', desc: 'Seuil de la règle' },
    { token: '{unit}', desc: 'Unité (%, FCFA, …)' },
    { token: '{min}', desc: 'Borne min (BETWEEN)' },
    { token: '{max}', desc: 'Borne max (BETWEEN)' },
    { token: '{gap}', desc: 'Écart à combler' },
    { token: '{label}', desc: 'Libellé du champ' },
    { token: '{article}', desc: 'Article (le, la, l\')' },
  ];

  onMount(async () => {
    try {
      catalog = await api.getCatalog();
    } catch (e: any) {
      error = 'Erreur chargement catalogue : ' + e.message;
    }
  });

  function openEditor(section: string, pattern: string) {
    editingSection = section;
    editingPattern = pattern;
    const data = catalog[section]?.[pattern] ?? {};
    if (section === 'labels') {
      patternForm = {
        label: data.label ?? '', unit: data.article ?? '',
        pass: [], fail: [], partial: [], advice: [],
      };
    } else if (section === 'score_labels') {
      patternForm = {
        label: '', unit: '',
        pass: Array.isArray(data) ? [...data] : [],
        fail: [], partial: [], advice: [],
      };
    } else if (section === 'interpreter') {
      patternForm = {
        label: data.title ?? '', unit: '',
        pass: Array.isArray(data.templates) ? [...data.templates] : [],
        fail: [], partial: [], advice: [],
      };
    } else if (section === 'advice_templates') {
      patternForm = {
        label: '', unit: '',
        pass: Array.isArray(data) ? [...data] : [],
        fail: [], partial: [], advice: [],
      };
    } else if (section === 'score_interpretations') {
      const levels: Record<string, any> = {};
      for (const lvl of LEVEL_KEYS) {
        const l = data.levels?.[lvl];
        levels[lvl] = {
          label: l?.label ?? '',
          message: l?.message ?? '',
          priorities: Array.isArray(l?.priorities) ? [...l.priorities] : [],
        };
      }
      interpretationForm = { label: data.label ?? '', levels };
    } else {
      patternForm = {
        label: data.label ?? '', unit: data.unit ?? '',
        pass: Array.isArray(data.pass) ? [...data.pass] : [],
        fail: Array.isArray(data.fail) ? [...data.fail] : [],
        partial: Array.isArray(data.partial) ? [...data.partial] : [],
        advice: Array.isArray(data.advice) ? [...data.advice] : [],
      };
    }
    drawerOpen = true;
  }

  function addTemplate(arr: string[]) { arr.push(''); }
  function removeTemplate(arr: string[], i: number) { arr.splice(i, 1); }

  async function saveForm() {
    saving = true;
    if (!editingSection || !editingPattern || !patternForm) return;
    const patten = editingPattern;
    const section = editingSection;
    const form = patternForm;

    if (section === 'interpreter') {
      const data = catalog[section]?.[patten] ?? {};
      Object.assign(data, { severity: data.severity ?? 'WARNING', title: form.label, templates: form.pass.filter(Boolean), actions: data.actions ?? [] });
    } else if (section === 'labels') {
      catalog[section][patten] = { label: form.label, article: form.unit };
    } else if (section === 'advice_templates') {
      catalog[section][patten] = form.pass.filter(Boolean);
    } else if (section === 'score_labels') {
      catalog[section][patten] = form.pass.filter(Boolean);
    } else if (section === 'score_interpretations') {
      if (interpretationForm) catalog[section][patten] = { label: interpretationForm.label, levels: interpretationForm.levels };
    } else {
      const data = catalog[section]?.[patten] ?? {};
      Object.assign(data, { label: form.label, unit: form.unit, pass: form.pass.filter(Boolean), fail: form.fail.filter(Boolean), partial: form.partial.filter(Boolean), advice: form.advice.filter(Boolean) });
    }

    await api.updateCatalog(catalog);
    catalog = await api.getCatalog();
    toast.success('Catalogue mis à jour');
    saving = false;
    drawerOpen = false;
    editingSection = null;
    editingPattern = null;
    patternForm = null;
  }

  function sectionLabel(section: string) {
    return catalog[section]?.label ?? SECTION_KEYS[section]?.label ?? section;
  }
</script>

<div class="flex items-center justify-between mb-6">
  <h2 class="text-[22px] font-bold">Messages</h2>
  <Button variant="secondary" onclick={() => helpOpen = true}>
    <Info size={18} />
    Aide
  </Button>
</div>

<div class="flex gap-1 mb-6 p-1 bg-surface-container-low rounded-xl w-fit">
  <button onclick={() => tab = 'fragments'}
    class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'fragments' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">
    <span class="inline-flex items-center gap-1.5">
      <Sparkles size={16} />
      NLG v2
    </span>
  </button>
  <button onclick={() => tab = 'classic'}
    class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'classic' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">
    Ancien système
  </button>
</div>

<Drawer open={helpOpen} title="Aide · Messages" onclose={() => helpOpen = false}>
  <div class="flex flex-col gap-4 text-sm leading-relaxed text-on-surface">
    <h4 class="font-bold text-base">NLG v2 (nouveau système)</h4>
    <p>Édite <code>src/messages/catalog-fragments.json</code>. Fragments atomiques composés par le nouveau NLG Engine.
    Les fragments sont sélectionnés par similarité cosinus (embeddings FastText 300d).</p>
    <ul class="list-disc pl-5">
      <li><strong>Observations</strong> : constat factuel</li>
      <li><strong>Interprétations</strong> : mise en contexte</li>
      <li><strong>Recommandations</strong> : action concrète</li>
      <li><strong>Encouragements</strong> : message positif</li>
    </ul>
    <p>Les <strong>Compositions</strong> associent un intent à des slots de fragments par sévérité.</p>
    <p>La <strong>Preview NLG</strong> permet de tester un intent + sévérité et voir le message généré.</p>

    <h4 class="font-bold text-base mt-4">Ancien système</h4>
    <p>Édite <code>src/messages/catalog.json</code> : templates hashés utilisés par <code>realizer.ts</code> en fallback.</p>
    <p>Contient 6 sections : Éligibilité, Conseils, Interpréteur, Libellés, Étiquettes de score, Interprétations du score.</p>
  </div>
</Drawer>

{#if tab === 'fragments'}
  <FragmentsEditor />
{:else}
  <!-- ══════ CLASSIC CATALOG ══════ -->
  {#if error}
    <div class="bg-red-50 text-error px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>
  {/if}

  <Drawer
    open={drawerOpen}
    title={editingPattern ?? 'Éditeur'}
    onclose={() => { drawerOpen = false; editingSection = null; editingPattern = null; patternForm = null; interpretationForm = null; }}
  >
    {#if patternForm || interpretationForm}
      <div class="flex flex-col gap-4">
        {#if editingSection !== 'score_interpretations'}
          <div class="flex flex-wrap gap-2 mb-2">
            <span class="text-xs font-semibold text-on-surface-variant w-full">Placeholders disponibles :</span>
            {#each PLACEHOLDER_HINTS as h}
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded text-xs font-mono text-on-surface-variant" title={h.desc}>
                <span class="font-bold">{h.token}</span>
                <span class="text-[10px] text-outline">· {h.desc}</span>
              </span>
            {/each}
          </div>
        {/if}

        {#if editingSection === 'labels'}
          <Input label="Libellé" bind:value={patternForm!.label} />
          <Input label="Article" bind:value={patternForm!.unit} placeholder="le, la, l'" />
        {:else if editingSection === 'interpreter'}
          <Input label="Titre" bind:value={patternForm!.label} />
          <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
            Templates (messages)
            <div class="flex flex-col gap-2">
              {#each patternForm!.pass as _, i}
                <div class="flex gap-2 items-start">
                  <input bind:value={patternForm!.pass[i]}
                    class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                  <button onclick={() => removeTemplate(patternForm!.pass, i)}
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              {/each}
              <button onclick={() => addTemplate(patternForm!.pass)}
                class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#2d5200] transition-all cursor-pointer border-none bg-transparent mt-1">
                <Plus size={16} />
                Ajouter un template
              </button>
            </div>
          </label>
        {:else if editingSection === 'advice_templates' || editingSection === 'score_labels'}
          <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
            {editingSection === 'advice_templates' ? 'Messages de conseil' : 'Messages'}
            <div class="flex flex-col gap-2">
              {#each patternForm!.pass as _, i}
                <div class="flex gap-2 items-start">
                  <input bind:value={patternForm!.pass[i]}
                    class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                  <button onclick={() => removeTemplate(patternForm!.pass, i)}
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              {/each}
              <button onclick={() => addTemplate(patternForm!.pass)}
                class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#2d5200] transition-all cursor-pointer border-none bg-transparent mt-1">
                <Plus size={16} />
                Ajouter un message
              </button>
            </div>
          </label>
        {:else if editingSection === 'score_interpretations' && interpretationForm}
          <Input label="Nom du composant" bind:value={interpretationForm.label} />
          {#each LEVEL_KEYS as lvl}
            <div class="border border-mint-subtle rounded-xl p-4 flex flex-col gap-3">
              <h4 class="font-bold text-sm text-on-surface-variant uppercase tracking-wide">{lvl}</h4>
              <Input label="Titre" bind:value={interpretationForm.levels[lvl].label} />
              <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
                Message
                <textarea bind:value={interpretationForm.levels[lvl].message} rows="3"
                  class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"></textarea>
              </label>
              <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
                Priorités
                <div class="flex flex-col gap-2">
                  {#each interpretationForm.levels[lvl].priorities as _, i}
                    <div class="flex gap-2 items-start">
                      <input bind:value={interpretationForm.levels[lvl].priorities[i]}
                        class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                      <button onclick={() => interpretationForm.levels[lvl].priorities.splice(i, 1)}
                        class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  {/each}
                  <button onclick={() => interpretationForm.levels[lvl].priorities.push('')}
                    class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#2d5200] transition-all cursor-pointer border-none bg-transparent mt-1">
                    <Plus size={16} />
                    Ajouter une priorité
                  </button>
                </div>
              </label>
            </div>
          {/each}
        {:else}
          <div class="grid grid-cols-2 gap-4">
            <Input label="Libellé" bind:value={patternForm!.label} />
            <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
              Unité
              <select onchange={(e) => { if (e.currentTarget.value) patternForm!.unit = e.currentTarget.value; e.currentTarget.value = ''; }}
                class="px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
                <option value="">Presets</option>
                <option value="%">%</option>
                <option value=" FCFA">FCFA</option>
                <option value=" €">€</option>
                <option value=" mois">mois</option>
                <option value=" jours">jours</option>
              </select>
            </label>
          </div>

          {#each [{ key: 'pass', label: 'Pass (condition remplie)' }, { key: 'fail', label: 'Fail (condition échouée)' }, { key: 'partial', label: 'Partial (partiellement remplie)' }, { key: 'advice', label: 'Advice (conseil)' }] as cat}
            <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
              {cat.label}
              <div class="flex flex-col gap-2">
                {#each patternForm![cat.key] as _, i}
                  <div class="flex gap-2 items-start">
                    <textarea bind:value={patternForm![cat.key][i]} rows="2"
                      class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"></textarea>
                    <button onclick={() => removeTemplate(patternForm![cat.key], i)}
                      class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                {/each}
                <button onclick={() => addTemplate(patternForm![cat.key])}
                  class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#2d5200] transition-all cursor-pointer border-none bg-transparent mt-1">
                  <Plus size={16} />
                  Ajouter un message
                </button>
              </div>
            </label>
          {/each}
        {/if}

        <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
          <Button variant="secondary" onclick={() => { drawerOpen = false; editingSection = null; editingPattern = null; patternForm = null; interpretationForm = null; }}>
            Annuler
          </Button>
          <Button onclick={saveForm} disabled={saving}>
            Enregistrer {#if saving}<Loader size={16} />{/if}
          </Button>
        </div>
      </div>
    {/if}
  </Drawer>

  <div class="flex flex-col gap-6">
    {#each sections as [section, data]}
      <div class="bg-surface rounded-2xl border border-mint-subtle overflow-hidden">
        <div class="px-6 py-4 bg-background border-b border-mint-subtle">
          <h3 class="font-bold text-base">{sectionLabel(section)}</h3>
          <p class="text-xs text-on-surface-variant mt-0.5">
            {section === 'eligibility' ? 'Patterns de messages pour chaque statut (pass/fail/partial/advice)' : ''}
            {section === 'advice_templates' ? 'Alertes financières et conseils personnalisés' : ''}
            {section === 'interpreter' ? "Règles d'interprétation budgétaire" : ''}
            {section === 'labels' ? 'Libellés des catégories de budget' : ''}
            {section === 'score_labels' ? 'Messages personnalisés pour chaque niveau de score financier' : ''}
            {section === 'score_interpretations' ? 'Interprétation détaillée de chaque composant du score (C1-C4)' : ''}
          </p>
        </div>
        <div class="p-4 flex flex-wrap gap-2">
          {#each Object.keys(data).filter(k => k !== 'label') as pattern}
            <button onclick={() => openEditor(section, pattern)}
              class="inline-flex items-center gap-2 px-3.5 py-2 bg-surface-container-low border border-mint-subtle hover:border-primary hover:bg-primary-container/30 rounded-xl text-sm font-medium text-on-surface hover:text-primary transition-all cursor-pointer">
              {pattern}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
