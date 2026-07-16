<script lang="ts">
  import { Plus, Image, Info, AlertTriangle, Lightbulb, Trash2, ChevronUp, ChevronDown, GripVertical, Heading, List, Minus, HelpCircle } from '@lucide/svelte';
  import type { ContentBlock, ContentBlockType } from '../../../types/education';

  let {
    blocks = $bindable([] as ContentBlock[]),
  }: {
    blocks: ContentBlock[];
  } = $props();

  let dragIdx = $state<number | null>(null);

  const BLOCK_LABELS: Record<ContentBlockType, string> = {
    header: 'Titre', text: 'Texte', callout: 'Encart',
    list: 'Liste', image: 'Image', divider: 'Séparateur', miniQuiz: 'Mini Quiz',
  };

  const BLOCK_ICONS: Record<ContentBlockType, any> = {
    header: Heading, text: null, callout: Info,
    list: List, image: Image, divider: Minus, miniQuiz: HelpCircle,
  };

  function newBlock(type: ContentBlockType): ContentBlock {
    switch (type) {
      case 'header': return { type, text: '', level: 2 };
      case 'text': return { type, text: '' };
      case 'callout': return { type, text: '', variant: 'key' };
      case 'list': return { type, items: ['', ''], ordered: false };
      case 'image': return { type, url: '', alt: '', caption: '' };
      case 'divider': return { type };
      case 'miniQuiz': return { type, question: '', choices: ['', ''], correctIndex: 0, explanation: '' };
    }
  }

  function addBlock(type: ContentBlockType, afterIdx: number) {
    const b = newBlock(type);
    blocks = [...blocks.slice(0, afterIdx + 1), b, ...blocks.slice(afterIdx + 1)];
  }

  function removeBlock(idx: number) {
    if (blocks.length <= 1) return;
    blocks = blocks.filter((_, i) => i !== idx);
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const t = idx + dir;
    if (t < 0 || t >= blocks.length) return;
    const arr = [...blocks];
    [arr[idx], arr[t]] = [arr[t], arr[idx]];
    blocks = arr;
  }

  function updateBlock(idx: number, patch: Partial<ContentBlock>) {
    blocks = blocks.map((b, i) => i === idx ? { ...b, ...patch } as ContentBlock : b);
  }

  function handleDragStart(e: DragEvent, idx: number) { dragIdx = idx; if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }
  function handleDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const arr = [...blocks];
    const [m] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, m);
    blocks = arr;
    dragIdx = idx;
  }
  function handleDragEnd() { dragIdx = null; }
</script>

<div class="flex flex-col gap-3">
  {#each blocks as block, i}
    <div
      class="group relative border border-mint-subtle rounded-xl bg-white transition-all hover:border-primary/40 hover:shadow-sm {dragIdx === i ? 'opacity-60 border-primary' : ''}"
      draggable="true"
      ondragstart={(e) => handleDragStart(e, i)}
      ondragover={(e) => handleDragOver(e, i)}
      ondragend={handleDragEnd}
    >
      <!-- Toolbar -->
      <div class="flex items-center gap-0.5 px-2 py-1.5 bg-surface-container/50 border-b border-mint-subtle/50 rounded-t-xl">
        <span class="text-[10px] font-semibold text-outline uppercase tracking-wider flex items-center gap-1">
          <GripVertical size={12} class="cursor-grab text-outline" />
          {BLOCK_LABELS[block.type]}
        </span>
        <div class="ml-auto flex gap-0.5">
          <button onclick={() => moveBlock(i, -1)} disabled={i === 0}
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container transition-all cursor-pointer border-none text-outline disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronUp size={14} />
          </button>
          <button onclick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1}
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container transition-all cursor-pointer border-none text-outline disabled:opacity-20 disabled:cursor-not-allowed">
            <ChevronDown size={14} />
          </button>
          <div class="w-px h-6 bg-mint-subtle mx-1"></div>
          <div class="relative group/add">
            <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-primary-container hover:text-primary transition-all cursor-pointer border-none text-outline">
              <Plus size={14} />
            </button>
            <div class="absolute right-0 top-full mt-1 z-50 hidden group-hover/add:flex flex-col bg-white border border-mint-subtle rounded-xl shadow-lg py-1 min-w-[150px]">
              {#each Object.entries(BLOCK_LABELS) as [type, label]}
                <button onclick={() => addBlock(type as ContentBlockType, i)}
                  class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left">{label}</button>
              {/each}
            </div>
          </div>
          <button onclick={() => removeBlock(i)}
            class="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-outline">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <!-- Block content -->
      <div class="p-3">
        {#if block.type === 'header'}
          <div class="flex gap-3">
            <input bind:value={block.text}
              oninput={() => blocks = blocks}
              placeholder="Titre de la section…"
              class="flex-1 px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all font-bold" />
            <select bind:value={block.level}
              onchange={() => blocks = blocks}
              class="w-24 px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
          </div>
          <div class="mt-2 px-3 py-2 rounded-lg bg-surface-container/50 text-sm {block.level === 1 ? 'text-xl font-extrabold' : block.level === 2 ? 'text-lg font-bold' : 'text-base font-semibold'}">
            {block.text || 'Aperçu du titre…'}
          </div>

        {:else if block.type === 'text'}
          <textarea bind:value={block.text}
            oninput={() => blocks = blocks}
            rows="4"
            class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"
            placeholder="Contenu texte…"></textarea>

        {:else if block.type === 'callout'}
          <div class="flex flex-col gap-2">
            <div class="flex gap-2">
              <button onclick={() => { block.variant = 'key'; blocks = blocks; }}
                class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer {block.variant === 'key' ? 'bg-primary-container text-primary border-primary/30' : 'bg-white text-outline border-mint-subtle hover:bg-surface-container'}">
                <Info size={14} /> Clé
              </button>
              <button onclick={() => { block.variant = 'tip'; blocks = blocks; }}
                class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer {block.variant === 'tip' ? 'bg-primary-container text-primary border-primary/30' : 'bg-white text-outline border-mint-subtle hover:bg-surface-container'}">
                <Lightbulb size={14} /> Conseil
              </button>
              <button onclick={() => { block.variant = 'warning'; blocks = blocks; }}
                class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer {block.variant === 'warning' ? 'bg-primary-container text-primary border-primary/30' : 'bg-white text-outline border-mint-subtle hover:bg-surface-container'}">
                <AlertTriangle size={14} /> Attention
              </button>
            </div>
            <textarea bind:value={block.text}
              oninput={() => blocks = blocks}
              rows="3"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"
              placeholder="Texte de l'encart…"></textarea>
            <div class="flex items-start gap-2 px-3 py-2 rounded-lg text-sm {block.variant === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : block.variant === 'tip' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
              <span class="shrink-0 mt-0.5">
                {#if block.variant === 'warning'}
                  <AlertTriangle size={16} />
                {:else if block.variant === 'tip'}
                  <Lightbulb size={16} />
                {:else}
                  <Info size={16} />
                {/if}
              </span>
              <div>
                <span class="font-semibold">{block.variant === 'warning' ? 'Attention' : block.variant === 'tip' ? 'Conseil' : 'Point clé'}</span>
                <p class="mt-0.5">{block.text || 'Aperçu…'}</p>
              </div>
            </div>
          </div>

        {:else if block.type === 'list'}
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-xs font-semibold text-outline">
              <input type="checkbox" checked={block.ordered}
                onchange={(e) => { block.ordered = e.currentTarget.checked; blocks = blocks; }}
                class="w-4 h-4 rounded border-mint-subtle text-primary focus:ring-primary" />
              Liste numérotée
            </label>
            <textarea
              value={(block.items ?? []).join('\n')}
              oninput={(e) => { block.items = e.currentTarget.value.split('\n').filter(Boolean); blocks = blocks; }}
              rows="4"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical font-mono"
              placeholder="Un élément par ligne…"></textarea>
            {#if (block.items ?? []).length > 0}
              <div class="px-3 py-2 rounded-lg bg-surface-container/50 text-sm">
                {#each (block.items ?? []) as item, ii}
                  <div class="flex gap-2 py-0.5">
                    <span class="text-outline shrink-0">{block.ordered ? `${ii + 1}.` : '•'}</span>
                    <span>{item}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

        {:else if block.type === 'image'}
          <div class="flex flex-col gap-2">
            <input bind:value={block.url}
              oninput={() => blocks = blocks}
              placeholder="URL de l'image…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            <div class="flex gap-2">
              <input bind:value={block.alt}
                oninput={() => blocks = blocks}
                placeholder="Texte alternatif…"
                class="flex-1 px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
              <input bind:value={block.caption}
                oninput={() => blocks = blocks}
                placeholder="Légende…"
                class="flex-1 px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            </div>
            {#if block.url}
              <div class="border border-mint-subtle rounded-lg overflow-hidden bg-surface-container/50 p-2">
                <img src={block.url} alt={block.alt} class="max-h-[200px] rounded-lg object-contain mx-auto" />
              </div>
            {/if}
          </div>

        {:else if block.type === 'divider'}
          <div class="flex items-center gap-3 text-outline/40">
            <hr class="flex-1 border-mint-subtle" />
            <span class="text-[10px] font-semibold uppercase tracking-wider">Séparateur</span>
            <hr class="flex-1 border-mint-subtle" />
          </div>

        {:else if block.type === 'miniQuiz'}
          <div class="flex flex-col gap-2">
            <input bind:value={block.question}
              oninput={() => blocks = blocks}
              placeholder="Question du mini-quiz…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all font-semibold" />
            {#each (block.choices ?? []) as choice, ci}
              <div class="flex items-center gap-2">
                <button onclick={() => { block.correctIndex = ci; blocks = blocks; }}
                  class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer {block.correctIndex === ci ? 'border-primary bg-primary' : 'border-mint-subtle bg-white'}"
                  title={block.correctIndex === ci ? 'Bonne réponse' : 'Marquer comme bonne réponse'}>
                  {#if block.correctIndex === ci}
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                  {/if}
                </button>
                <input bind:value={block.choices![ci]}
                  oninput={() => blocks = blocks}
                  placeholder={`Choix ${ci + 1}…`}
                  class="flex-1 px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                {#if (block.choices ?? []).length > 2}
                  <button onclick={() => {
                    block.choices = block.choices!.filter((_, j) => j !== ci);
                    if ((block.correctIndex ?? 0) >= ci) block.correctIndex = Math.max(0, (block.correctIndex ?? 0) - 1);
                    blocks = blocks;
                  }}
                    class="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-outline shrink-0">
                    <Trash2 size={12} />
                  </button>
                {/if}
              </div>
            {/each}
            <button onclick={() => { block.choices = [...(block.choices ?? []), '']; blocks = blocks; }}
              class="self-start text-xs font-semibold text-primary hover:text-[#2d5200] transition-all cursor-pointer bg-transparent border-none px-3 py-1">
              + Ajouter un choix
            </button>
            <textarea bind:value={block.explanation}
              oninput={() => blocks = blocks}
              rows="2"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"
              placeholder="Explication de la réponse…"></textarea>
          </div>
        {/if}
      </div>
    </div>
  {/each}

  {#if blocks.length === 0}
    <div class="border-2 border-dashed border-mint-subtle rounded-xl p-8 text-center">
      <p class="text-sm text-outline mb-3">Aucun bloc de contenu</p>
      <div class="flex gap-2 justify-center flex-wrap">
        {#each Object.entries(BLOCK_LABELS) as [type, label]}
          <button onclick={() => addBlock(type as ContentBlockType, -1)}
            class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-mint-subtle bg-white text-outline hover:bg-surface-container hover:border-primary/30 transition-all cursor-pointer">
            <Plus size={12} /> {label}
          </button>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex gap-2 justify-center pt-1">
      <div class="relative group/add-bottom">
        <button class="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold border border-mint-subtle bg-white text-outline hover:bg-surface-container hover:border-primary/30 transition-all cursor-pointer">
          <Plus size={14} /> Ajouter un bloc
        </button>
        <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 hidden group-hover/add-bottom:flex flex-col bg-white border border-mint-subtle rounded-xl shadow-lg py-1 min-w-[150px]">
          {#each Object.entries(BLOCK_LABELS) as [type, label]}
            <button onclick={() => addBlock(type as ContentBlockType, blocks.length - 1)}
              class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left whitespace-nowrap">{label}</button>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
