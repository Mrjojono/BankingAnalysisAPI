<script lang="ts">
  import { Plus, Image, Video, ListChecks, Info, AlertTriangle, Lightbulb, Trash2, ChevronUp, ChevronDown, GripVertical, Check } from '@lucide/svelte';
  import SvelteMarkdown from '@humanspeak/svelte-markdown';

  type Block = {
    id: string;
    type: 'text' | 'image' | 'video' | 'quiz' | 'callout';
    data: Record<string, any>;
  };

  let {
    content = '',
    onchange,
  }: {
    content?: string;
    onchange?: (c: string) => void;
  } = $props();

  let blocks = $state<Block[]>([]);
  let dragIdx = $state<number | null>(null);

  function parseContent() {
    if (!content?.trim()) {
      blocks = [{ id: crypto.randomUUID(), type: 'text', data: { text: '' } }];
      return;
    }
    blocks = [{ id: crypto.randomUUID(), type: 'text', data: { text: content } }];
  }

  $effect(() => { parseContent(); });

  function serialize(): string {
    return blocks.map(b => blockToMarkdown(b)).filter(Boolean).join('\n\n');
  }

  function emit() {
    onchange?.(serialize());
  }

  function blockToMarkdown(b: Block): string {
    switch (b.type) {
      case 'text': return b.data.text ?? '';
      case 'image': return `![${b.data.alt ?? ''}](${b.data.url ?? ''})`;
      case 'video': return `<div class="video-embed">\n  <iframe src="${b.data.url ?? ''}" title="${b.data.title ?? ''}" frameborder="0" allowfullscreen></iframe>\n</div>`;
      case 'quiz': {
        const q = b.data.question ?? '';
        const choices: string[] = b.data.choices ?? [];
        const correct = b.data.correctIndex;
        let md = `> **Quiz : ${q}**\n>\n`;
        choices.forEach((c, i) => {
          md += `> ${correct === i ? '✓' : '-'} ${c}\n`;
        });
        return md;
      }
      case 'callout': {
        const style = b.data.style ?? 'info';
        const label = { info: 'ℹ️ Info', warning: '⚠️ Attention', tip: '💡 Conseil' }[style] ?? 'ℹ️';
        return `> **${label}**\n> ${b.data.text ?? ''}`;
      }
      default: return '';
    }
  }

  function addBlock(type: Block['type'], afterIdx: number) {
    const newBlock: Block = { id: crypto.randomUUID(), type, data: defaultData(type) };
    blocks = [...blocks.slice(0, afterIdx + 1), newBlock, ...blocks.slice(afterIdx + 1)];
  }

  function defaultData(type: Block['type']): Record<string, any> {
    switch (type) {
      case 'text': return { text: '' };
      case 'image': return { url: '', alt: '' };
      case 'video': return { url: '', title: '' };
      case 'quiz': return { question: '', choices: ['', ''], correctIndex: 0 };
      case 'callout': return { style: 'info', text: '' };
    }
  }

  function removeBlock(idx: number) {
    blocks = blocks.filter((_, i) => i !== idx);
    if (blocks.length === 0) {
      blocks = [{ id: crypto.randomUUID(), type: 'text', data: { text: '' } }];
    }
    emit();
  }

  function moveBlock(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const arr = [...blocks];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    blocks = arr;
    emit();
  }

  function updateBlockData(idx: number, data: Record<string, any>) {
    blocks = blocks.map((b, i) => i === idx ? { ...b, data: { ...b.data, ...data } } : b);
    emit();
  }

  function handleDragStart(e: DragEvent, idx: number) {
    dragIdx = idx;
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const arr = [...blocks];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(idx, 0, moved);
    blocks = arr;
    dragIdx = idx;
  }

  function handleDragEnd() { dragIdx = null; }

  const BLOCK_ICONS: Record<string, any> = {
    text: null, image: Image, video: Video, quiz: ListChecks, callout: Info,
  };
</script>

<div class="flex flex-col gap-3">
  {#each blocks as block, i}
    <div
      class="group relative border border-mint-subtle rounded-xl bg-white transition-all hover:border-primary/40 hover:shadow-sm {dragIdx === i ? 'opacity-60 border-primary' : ''}"
      role="button"
      tabindex="0"
      draggable="true"
      ondragstart={(e) => handleDragStart(e, i)}
      ondragover={(e) => handleDragOver(e, i)}
      ondragend={handleDragEnd}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); } }}
    >
      <!-- Toolbar -->
      <div class="flex items-center gap-0.5 px-2 py-1.5 bg-surface-container/50 border-b border-mint-subtle/50 rounded-t-xl">
        <span class="text-[10px] font-semibold text-outline uppercase tracking-wider flex items-center gap-1">
          <GripVertical size={12} class="cursor-grab text-outline" />
          {block.type === 'text' ? 'Texte' : block.type === 'image' ? 'Image' : block.type === 'video' ? 'Vidéo' : block.type === 'quiz' ? 'Quiz' : 'Info'}
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
          <!-- Add block dropdown -->
          <div class="relative group/add">
            <button class="w-6 h-6 flex items-center justify-center rounded hover:bg-primary-container hover:text-primary transition-all cursor-pointer border-none text-outline">
              <Plus size={14} />
            </button>
            <div class="absolute right-0 top-full mt-1 z-50 hidden group-hover/add:flex flex-col bg-white border border-mint-subtle rounded-xl shadow-lg py-1 min-w-[140px]">
              <button onclick={() => addBlock('text', i)}
                class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left">Texte</button>
              <button onclick={() => addBlock('image', i)}
                class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left">Image</button>
              <button onclick={() => addBlock('video', i)}
                class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left">Vidéo</button>
              <button onclick={() => addBlock('quiz', i)}
                class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left">Quiz</button>
              <button onclick={() => addBlock('callout', i)}
                class="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-surface-container transition-all cursor-pointer border-none bg-transparent text-left">Encart</button>
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
        {#if block.type === 'text'}
          <textarea bind:value={block.data.text}
            oninput={() => emit()}
            rows="6"
            class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical font-mono"
            placeholder="Écrire en Markdown…"></textarea>
        {:else if block.type === 'image'}
          <div class="flex flex-col gap-2">
            <input bind:value={block.data.url}
              oninput={() => emit()}
              placeholder="URL de l'image…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            <input bind:value={block.data.alt}
              oninput={() => emit()}
              placeholder="Texte alternatif…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            {#if block.data.url}
              <div class="border border-mint-subtle rounded-lg overflow-hidden bg-surface-container/50 p-2">
                <img src={block.data.url} alt={block.data.alt} class="max-h-[200px] rounded-lg object-contain mx-auto" />
              </div>
            {/if}
          </div>
        {:else if block.type === 'video'}
          <div class="flex flex-col gap-2">
            <input bind:value={block.data.url}
              oninput={() => emit()}
              placeholder="URL YouTube / Vimeo…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            <input bind:value={block.data.title}
              oninput={() => emit()}
              placeholder="Titre de la vidéo…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
            {#if block.data.url}
              <div class="aspect-video border border-mint-subtle rounded-lg overflow-hidden bg-surface-container/50">
                <iframe src={block.data.url} title={block.data.title} class="w-full h-full" frameborder="0" allowfullscreen></iframe>
              </div>
            {/if}
          </div>
        {:else if block.type === 'quiz'}
          <div class="flex flex-col gap-2">
            <input bind:value={block.data.question}
              oninput={() => emit()}
              placeholder="Question du quiz…"
              class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all font-semibold" />
            {#each (block.data.choices ?? []) as choice, ci}
              <div class="flex items-center gap-2">
                <button onclick={() => { block.data.correctIndex = ci; block.data = { ...block.data }; emit(); }}
                  class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer {block.data.correctIndex === ci ? 'border-primary bg-primary' : 'border-mint-subtle bg-white'}"
                  title={block.data.correctIndex === ci ? 'Bonne réponse' : 'Marquer comme bonne réponse'}>
                  {#if block.data.correctIndex === ci}
                    <span class="w-2 h-2 rounded-full bg-white"></span>
                  {/if}
                </button>
                <input bind:value={block.data.choices[ci]}
                  oninput={() => emit()}
                  placeholder={`Choix ${ci + 1}…`}
                  class="flex-1 px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all" />
                {#if (block.data.choices ?? []).length > 2}
                  <button onclick={() => {
                    block.data.choices = block.data.choices.filter((_: any, j: number) => j !== ci);
                    if (block.data.correctIndex >= ci) block.data.correctIndex = Math.max(0, block.data.correctIndex - 1);
                    block.data = { ...block.data };
                    emit();
                  }}
                    class="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 hover:text-error transition-all cursor-pointer border-none text-outline shrink-0">
                    <Trash2 size={12} />
                  </button>
                {/if}
              </div>
            {/each}
            <button onclick={() => {
              block.data.choices = [...(block.data.choices ?? []), ''];
              block.data = { ...block.data };
            }}
              class="self-start text-xs font-semibold text-primary hover:text-[#2d5200] transition-all cursor-pointer bg-transparent border-none px-3 py-1">
              + Ajouter un choix
            </button>
          </div>
          {:else if block.type === 'callout'}
            <div class="flex flex-col gap-2">
              <div class="flex gap-2">
                <button onclick={() => { block.data.style = 'info'; block.data = { ...block.data }; emit(); }}
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer {block.data.style === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-outline border-mint-subtle hover:bg-surface-container'}">
                  <Info size={14} /> Info
                </button>
                <button onclick={() => { block.data.style = 'warning'; block.data = { ...block.data }; emit(); }}
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer {block.data.style === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-outline border-mint-subtle hover:bg-surface-container'}">
                  <AlertTriangle size={14} /> Attention
                </button>
                <button onclick={() => { block.data.style = 'tip'; block.data = { ...block.data }; emit(); }}
                  class="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer {block.data.style === 'tip' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-outline border-mint-subtle hover:bg-surface-container'}">
                  <Lightbulb size={14} /> Conseil
                </button>
              </div>
              <textarea bind:value={block.data.text}
                oninput={() => emit()}
                rows="3"
                class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"
                placeholder="Texte de l'encart…"></textarea>
              <div class="flex items-start gap-2 px-3 py-2 rounded-lg text-sm {block.data.style === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' : block.data.style === 'tip' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}">
                <span class="shrink-0 mt-0.5">
                  {#if block.data.style === 'warning'}
                    <AlertTriangle size={16} />
                  {:else if block.data.style === 'tip'}
                    <Lightbulb size={16} />
                  {:else}
                    <Info size={16} />
                  {/if}
                </span>
                <div>
                  <span class="font-semibold">{block.data.style === 'warning' ? 'Attention' : block.data.style === 'tip' ? 'Conseil' : 'Info'}</span>
                  <p class="mt-0.5">{block.data.text || 'Aperçu…'}</p>
                </div>
              </div>
            </div>
        {/if}
      </div>
    </div>
  {/each}
</div>
