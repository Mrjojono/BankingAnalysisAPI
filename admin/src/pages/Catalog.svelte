<script lang="ts">
  import { Info, Plus, Trash2, Loader } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import Drawer from '../lib/components/Drawer.svelte';
    import App from '../App.svelte';

  let catalog = $state<Record<string, any>>({});
  let sections = $derived(Object.entries(catalog));
  let error = $state('');
  let editingSection = $state<string | null>(null);
  let editingPattern = $state<string | null>(null);
  let drawerOpen = $state(false);
  let helpOpen = $state(false);
  let loading = $state(false);
  let patternForm = $state<{ label: string; unit: string; pass: string[]; fail: string[]; partial: string[]; advice: string[] } | null>(null);
  let interpretationForm = $state<{ label: string; levels: Record<string, { label: string; message: string; priorities: string[] }> } | null>(null);

  const LEVEL_KEYS = ['EXCELLENT', 'BON', 'MOYEN', 'FAIBLE', 'CRITIQUE'];

  type SectionLabel = { label: string; unit: string };

  const SECTION_KEYS: Record<string, SectionLabel> = {
    eligibility: { label: 'Éligibilité', unit: '' },
    advice_templates: { label: 'Conseils', unit: '' },
    interpreter: { label: 'Interpréteur', unit: '' },
    labels: { label: 'Libellés', unit: '' },
    score_labels: { label: 'Étiquettes de score', unit: '' },
    score_interpretations: { label: 'Interprétations du score', unit: '' },
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
      console.log(`[Catalog] chargé`);
    } catch (e: any) {
      error = 'Erreur chargement catalogue : ' + e.message;
      console.error(`[Catalog] chargement échoué:`, e.message);
    }
  });

  function openEditor(section: string, pattern: string) {
    editingSection = section;
    editingPattern = pattern;
    const data = catalog[section]?.[pattern] ?? {};
    if (section === 'labels') {
      patternForm = {
        label: data.label ?? '',
        unit: data.article ?? '',
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
        label: data.title ?? '',
        unit: '',
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
      interpretationForm = {
        label: data.label ?? '',
        levels,
      };
    } else {
      patternForm = {
        label: data.label ?? '',
        unit: data.unit ?? '',
        pass: Array.isArray(data.pass) ? [...data.pass] : [],
        fail: Array.isArray(data.fail) ? [...data.fail] : [],
        partial: Array.isArray(data.partial) ? [...data.partial] : [],
        advice: Array.isArray(data.advice) ? [...data.advice] : [],
      };
    }
    drawerOpen = true;
  }

  function addTemplate(arr: string[]) {
    arr.push('');
  }

  function removeTemplate(arr: string[], i: number) {
    arr.splice(i, 1);
  }

  async function saveForm() {
    loading = true;
    if (!editingSection || !editingPattern || !patternForm) return;
    const patten = editingPattern;
    const section = editingSection;
    const form = patternForm;

    if (section === 'interpreter') {
      const data = catalog[section]?.[patten] ?? {};
      Object.assign(data, {
        severity: data.severity ?? 'WARNING',
        title: form.label,
        templates: form.pass.filter(Boolean),
        actions: data.actions ?? [],
      });
    } else if (section === 'labels') {
      catalog[section][patten] = { label: form.label, article: form.unit };
    } else if (section === 'advice_templates') {
      catalog[section][patten] = form.pass.filter(Boolean);
    } else if (section === 'score_labels') {
      catalog[section][patten] = form.pass.filter(Boolean);
    } else if (section === 'score_interpretations') {
      if (interpretationForm) {
        catalog[section][patten] = {
          label: interpretationForm.label,
          levels: interpretationForm.levels,
        };
      }
    } else {
      const data = catalog[section]?.[patten] ?? {};
      Object.assign(data, {
        label: form.label,
        unit: form.unit,
        pass: form.pass.filter(Boolean),
        fail: form.fail.filter(Boolean),
        partial: form.partial.filter(Boolean),
        advice: form.advice.filter(Boolean),
      });
    }

    await api.updateCatalog(catalog);
    catalog = await api.getCatalog();
    if (loading) loading = false && drawerOpen;
    if (drawerOpen) drawerOpen = false;

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
  <button onclick={() => helpOpen = true}
    class="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-mint-subtle rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer">
    <Info size={18} />
    Aide
  </button>
</div>

<Drawer open={helpOpen} title="Aide — Messages" onclose={() => helpOpen = false}>
  <div class="flex flex-col gap-4 text-sm leading-relaxed text-on-surface">
    <p>Cette page édite le fichier <code>src/messages/catalog.json</code> qui contient tous les modèles de messages du moteur d'éligibilité. Les modifications sont persistées directement sur le disque.</p>

    <h4 class="font-bold text-base mt-2">1. Section Éligibilité</h4>
    <p>Contient 10 patterns (RATE_MAX, AMOUNT_MIN, RANGE, BOOLEAN_TRUE, etc.). Chaque pattern définit 4 variantes de message correspondant aux statuts d'évaluation :</p>
    <ul class="list-disc pl-5">
      <li><span class="font-semibold">pass</span> — condition remplie (PASS)</li>
      <li><span class="font-semibold">fail</span> — condition échouée (FAIL)</li>
      <li><span class="font-semibold">partial</span> — condition partiellement remplie (écart ≤ 20%)</li>
      <li><span class="font-semibold">advice</span> — conseil personnalisé pour aider le client</li>
    </ul>
    <p>Le moteur détecte automatiquement le pattern à utiliser selon le champ et le label de la règle, puis remplit les placeholders (<code>{'{value}'}</code>, <code>{'{threshold}'}</code>, <code>{'{unit}'}</code>, etc.) avec les valeurs réelles du client.</p>

    <h4 class="font-bold text-base mt-2">2. Section Conseils (advice_templates)</h4>
    <p>Alertes financières déclenchées par des comportements détectés (ex: pic de dépenses <code>SPENDING_SPIKE</code>, catégorie dominante <code>TOP_CATEGORY</code>). Chaque clé contient un tableau de messages possibles.</p>

    <h4 class="font-bold text-base mt-2">3. Section Interpréteur (interpreter)</h4>
    <p>Règles d'interprétation budgétaire avec sévérité (WARNING/INFO), un titre, des templates et des actions suggérées. Utilisées pour analyser les catégories de dépenses (LOGEMENT, ALIMENTATION, TRANSPORT…).</p>

    <h4 class="font-bold text-base mt-2">4. Section Étiquettes de score (score_labels)</h4>
      <p>Messages personnalisés pour chaque niveau de score (EXCELLENT, GOOD, FRAGILE, CRITICAL). Chaque clé contient un tableau de variantes de message. Le moteur en choisit une aléatoirement pour accompagner le score.</p>

    <h4 class="font-bold text-base mt-2">5. Section Interprétations du score (score_interpretations)</h4>
      <p>Interprétation détaillée de chaque composant du score global (C1 dépenses, C2 endettement, C3 épargne, C4 stabilité). Chaque composant définit 5 niveaux (EXCELLENT à CRITIQUE) avec un titre, un message d'explication et une liste de priorités d'action.</p>

    <h4 class="font-bold text-base mt-2">6. Section Libellés (labels)</h4>
      <p>Libellés des catégories de budget avec leur article (le, la, l'). Exemple : <code>LOGEMENT → {'{'}"label": "logement", "article": "le"{'}'}</code>.</p>

    <h4 class="font-bold text-base mt-2">Fonctionnement général</h4>
    <p>Quand le moteur évalue une règle :</p>
    <ol class="list-decimal pl-5">
      <li>Il détermine le pattern à utiliser selon le champ et le label de la règle</li>
      <li>Il récupère le message correspondant au statut (pass/fail/partial/advice) dans <code>catalog.json</code></li>
      <li>Il remplace les placeholders par les valeurs réelles du client</li>
      <li>Le message final est renvoyé dans le résultat d'éligibilité</li>
    </ol>
  </div>
</Drawer>

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
            <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container rounded text-xs font-mono text-on-surface-variant"
              title={h.desc}>
              <span class="font-bold">{h.token}</span>
              <span class="text-[10px] text-outline">— {h.desc}</span>
            </span>
          {/each}
        </div>
      {/if}

      {#if editingSection === 'labels'}
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Libellé
          <input bind:value={patternForm.label} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Article
          <input bind:value={patternForm.unit} placeholder="le, la, l'" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
      {:else if editingSection === 'interpreter'}
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Titre
          <input bind:value={patternForm.label} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Templates (messages)
          <div class="flex flex-col gap-2">
            {#each patternForm.pass as _, i}
              <div class="flex gap-2 items-start">
                <input bind:value={patternForm.pass[i]} class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                <button onclick={() => removeTemplate(patternForm.pass, i)}
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                  <Trash2 size={16} />
                </button>
              </div>
            {/each}
            <button onclick={() => addTemplate(patternForm.pass)}
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
            {#each patternForm.pass as _, i}
              <div class="flex gap-2 items-start">
                <input bind:value={patternForm.pass[i]} class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                <button onclick={() => removeTemplate(patternForm.pass, i)}
                  class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                  <Trash2 size={16} />
                </button>
              </div>
            {/each}
            <button onclick={() => addTemplate(patternForm.pass)}
              class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#2d5200] transition-all cursor-pointer border-none bg-transparent mt-1">
              <Plus size={16} />
              Ajouter un message
            </button>
          </div>
        </label>
      {:else if editingSection === 'score_interpretations' && interpretationForm}
        <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
          Nom du composant
          <input bind:value={interpretationForm.label} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
        </label>
        {#each LEVEL_KEYS as lvl}
          <div class="border border-mint-subtle rounded-xl p-4 flex flex-col gap-3">
            <h4 class="font-bold text-sm text-on-surface-variant uppercase tracking-wide">{lvl}</h4>
            <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
              Titre
              <input bind:value={interpretationForm.levels[lvl].label} class="w-full px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            </label>
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
                    <input bind:value={interpretationForm.levels[lvl].priorities[i]} class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
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
          <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
            Libellé
            <input bind:value={patternForm.label} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
          </label>
          <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
            Unité
            <div class="flex gap-1">
              <input bind:value={patternForm.unit} placeholder="%, FCFA, …" class="flex-1 px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
              <select onchange={(e) => { if (e.currentTarget.value) patternForm.unit = e.currentTarget.value; e.currentTarget.value = ''; }}
                class="px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
                <option value="">Presets</option>
                <option value="%">%</option>
                <option value=" FCFA">FCFA</option>
                <option value=" €">€</option>
                <option value=" mois">mois</option>
                <option value=" jours">jours</option>
              </select>
            </div>
          </label>
        </div>

        {#each [{ key: 'pass', label: 'Pass (condition remplie)' }, { key: 'fail', label: 'Fail (condition échouée)' }, { key: 'partial', label: 'Partial (partiellement remplie)' }, { key: 'advice', label: 'Advice (conseil)' }] as cat}
          <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
            {cat.label}
            <div class="flex flex-col gap-2">
              {#each patternForm[cat.key] as _, i}
                <div class="flex gap-2 items-start">
                  <textarea bind:value={patternForm[cat.key][i]} rows="2"
                    class="flex-1 px-3 py-2 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"></textarea>
                  <button onclick={() => removeTemplate(patternForm[cat.key], i)}
                    class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-on-surface-variant shrink-0 mt-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              {/each}
              <button onclick={() => addTemplate(patternForm[cat.key])}
                class="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-[#2d5200] transition-all cursor-pointer border-none bg-transparent mt-1">
                <Plus size={16} />
                Ajouter un message
              </button>
            </div>
          </label>
        {/each}
      {/if}

      <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
        <button onclick={() => { drawerOpen = false; editingSection = null; editingPattern = null; patternForm = null; interpretationForm = null; }}
          class="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white border border-mint-subtle hover:bg-surface-container transition-all cursor-pointer">
          Annuler
        </button>
        <button onclick={saveForm}
          class="px-5 py-2.5 rounded-xl flex flex-row items-center gap-1 text-sm font-semibold bg-primary text-white hover:bg-[#2d5200] transition-all cursor-pointer border-none">
          Enregistrer {#if loading}<Loader size={16} />{/if}
        </button>
      </div>
    </div>
  {/if}
</Drawer>

{#if error}
  <div class="bg-red-50 text-error px-4 py-3 rounded-xl text-sm font-medium mb-4">{error}</div>
{/if}

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
