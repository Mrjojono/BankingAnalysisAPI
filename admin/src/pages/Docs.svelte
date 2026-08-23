<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { marked } from 'marked'
  import { Eye, Pencil, Download, RotateCcw, BookOpen, Cpu, Layers, ShieldCheck, FileText, ListTree } from '@lucide/svelte'
  import technologies from '../lib/docs/TECHNOLOGIES.md?raw'
  import architectureGuide from '../lib/docs/ARCHITECTURE_GUIDE.md?raw'
  import eligibilityMatrixModule from '../lib/docs/ELIGIBILITY_MATRIX_MODULE.md?raw'
  import matrixModuleGuide from '../lib/docs/MATRIX_MODULE.md?raw'
  import conceptionDocument from '../lib/docs/DESIGN_UML.md?raw'
  import diagrams from '../lib/docs/CLASS_DIAGRAM_REFERENCE.md?raw'

  type DocItem = {
    id: string
    label: string
    hint: string
    source: string
    icon: typeof BookOpen
  }

  const sections: { label: string; docs: DocItem[] }[] = [
    {
      label: 'Vue d\'ensemble',
      docs: [
        { id: 'technologies', label: 'Technologies utilisées', hint: 'Stack, versions et rôle de chaque brique', source: technologies, icon: Cpu },
        { id: 'architecture-guide', label: 'Guide d\'architecture', hint: 'Conception globale, modèles et risques', source: architectureGuide, icon: Layers },
        { id: 'conception-document', label: 'Conception du projet', hint: 'Évaluation UML et recommandations', source: conceptionDocument, icon: FileText },
      ],
    },
    {
      label: 'Modules métier',
      docs: [
        { id: 'matrix-module', label: 'Module Matriciel', hint: 'Guide complet du moteur d\'interprétation', source: matrixModuleGuide, icon: Cpu },
        { id: 'eligibility-matrix', label: 'Module d\'éligibilité', hint: 'Scoring continu et moteur matriciel', source: eligibilityMatrixModule, icon: ShieldCheck },
      ],
    },
    {
      label: 'Référence technique',
      docs: [
        { id: 'diagrams', label: 'Diagrammes', hint: 'Classes, endpoints, DTOs et cardinalités', source: diagrams, icon: BookOpen },
      ],
    },
  ]

  const allDocs = sections.flatMap((s) => s.docs)

  let selectedId = $state(allDocs[0].id)
  let editMode = $state(false)
  let editSource = $state('')
  let hasEdits = $state(false)
  let contentEl = $state<HTMLDivElement | null>(null)
  let tocItems = $state<{ id: string; text: string; depth: number }[]>([])
  let activeToc = $state<string | null>(null)

  const selectedDoc = $derived(
    allDocs.find((d) => d.id === selectedId) ?? allDocs[0],
  )

  const displaySource = $derived(
    hasEdits && !editMode ? editSource : selectedDoc.source,
  )

  $effect(() => {
    const id = selectedId
    editMode = false
    const saved = loadSaved(id)
    if (saved !== null) {
      editSource = saved
      hasEdits = true
    } else {
      editSource = ''
      hasEdits = false
    }
    requestAnimationFrame(() => {
      document.querySelector('main')?.scrollTo({ top: 0 })
    })
  })

  $effect(() => {
    const src = displaySource
    const id = selectedId
    if (editMode || !contentEl) {
      tocItems = []
      return
    }
    const headings = Array.from(contentEl.querySelectorAll('h1[id], h2[id], h3[id]'))
    tocItems = headings.map((h) => ({
      id: h.id,
      text: (h.textContent ?? '').trim(),
      depth: Number(h.tagName.slice(1)),
    }))
    activeToc = null
  })

  $effect(() => {
    const items = tocItems
    if (items.length === 0 || !contentEl) return
    const headings = contentEl.querySelectorAll('h1[id], h2[id], h3[id]')
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) activeToc = visible[0].target.id
      },
      { rootMargin: '-96px 0px -65% 0px', threshold: 0 },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  })

  function loadSaved(id: string): string | null {
    try { return localStorage.getItem(`doc-${id}`) } catch { return null }
  }

  function saveToLS(id: string, content: string) {
    try { localStorage.setItem(`doc-${id}`, content) } catch {}
  }

  function removeSaved(id: string) {
    try { localStorage.removeItem(`doc-${id}`) } catch {}
  }

  function toggleEdit() {
    if (!editMode) {
      editSource = hasEdits ? editSource : selectedDoc.source
    } else {
      saveToLS(selectedId, editSource)
      hasEdits = true
    }
    editMode = !editMode
  }

  function resetDoc() {
    removeSaved(selectedId)
    editSource = ''
    hasEdits = false
    editMode = false
  }

  function scrollToHeading(id: string) {
    activeToc = id
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function tocBtnClasses(item: { id: string; depth: number }): string {
    const active = activeToc === item.id
    const depthClass =
      item.depth === 1
        ? 'font-semibold text-on-surface'
        : item.depth === 2
          ? 'text-on-surface-variant pl-5'
          : 'text-on-surface-variant/70 pl-8'
    return `text-left text-xs leading-snug py-1 px-2 rounded-lg transition-all cursor-pointer border-none ${depthClass} ${active ? 'bg-primary-container text-on-primary-container' : 'hover:bg-surface-container'}`
  }

  async function printDoc() {
    const html = await marked(displaySource)
    const title = selectedDoc.label
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.7; color: #1a1a1a; font-size: 14px; }
  h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem; margin-top: 0; }
  h2 { font-size: 1.35rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; padding-bottom: 0.375rem; border-bottom: 1px solid #ccc; }
  h3 { font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  h4 { font-size: 1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
  p { margin-bottom: 0.75rem; }
  ul, ol { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  li { margin-bottom: 0.25rem; }
  code { font-size: 0.85em; padding: 0.15em 0.3em; border-radius: 4px; background: #f1f5e9; font-family: 'SF Mono', 'Fira Code', monospace; }
  pre { padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; border: 1px solid #e5e7eb; background: #f8faf6; }
  pre code { background: none; padding: 0; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.875rem; }
  th, td { border: 1px solid #ccc; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f1f5e9; font-weight: 600; }
  blockquote { border-left: 3px solid #3A6A00; padding-left: 1rem; margin-left: 0; color: #666; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  img { max-width: 100%; border-radius: 8px; }
  strong { font-weight: 700; }
  a { color: #3A6A00; }
  @media print { body { padding: 20px; } }
</style></head><body>${html}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 500)
  }
</script>

<div class="flex flex-col lg:flex-row items-start gap-4">
  <aside class="w-full shrink-0 lg:w-60 lg:sticky lg:top-3">
    <div class="bg-surface border border-mint-subtle rounded-2xl p-3">
      <div class="hidden lg:flex items-center gap-2 px-2 pb-2 mb-2 border-b border-mint-subtle">
        <BookOpen size={17} class="text-primary shrink-0" />
        <p class="text-sm font-bold text-on-surface truncate">Documentation technique</p>
      </div>
      <div class="flex lg:flex-col gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:h-[4px]">
        {#each sections as section}
          <div class="flex lg:flex-col gap-1.5 lg:gap-0.5">
            <p class="hidden lg:block text-[10px] font-bold text-outline uppercase tracking-widest px-2 mt-3 mb-1">
              {section.label}
            </p>
            {#each section.docs as doc}
              <button
                onclick={() => selectedId = doc.id}
                title={doc.hint}
                class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-all cursor-pointer border-none shrink-0 min-w-[180px] lg:min-w-0 lg:shrink
                  {selectedId === doc.id
                    ? 'bg-primary-container text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container'}"
              >
                <doc.icon size={17} class="shrink-0" />
                <span class="min-w-0">
                  <span class="block text-sm font-semibold leading-tight truncate">{doc.label}</span>
                  <span class="hidden lg:block text-[11px] leading-tight text-on-surface-variant/70 truncate">{doc.hint}</span>
                </span>
              </button>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </aside>

  <div class="flex-1 min-w-0 flex flex-col gap-3">
    <div class="sticky top-3 z-10 bg-surface border border-mint-subtle rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <selectedDoc.icon size={16} class="text-primary shrink-0" />
          <h2 class="text-[17px] font-bold text-on-surface truncate">{selectedDoc.label}</h2>
        </div>
        <p class="text-xs text-on-surface-variant truncate mt-0.5">
          {#if tocItems.length > 0}
            {tocItems.length} section{tocItems.length > 1 ? 's' : ''}
          {:else}
            {selectedDoc.hint}
          {/if}
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        {#if hasEdits && !editMode}
          <button
            onclick={resetDoc}
            class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-mint-subtle text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
            title="Réinitialiser le document original">
            <RotateCcw size={16} />
            <span class="hidden sm:inline">Réinitialiser</span>
          </button>
        {/if}
        <button
          onclick={printDoc}
          class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-mint-subtle text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          title="Télécharger en PDF">
          <Download size={16} />
          <span class="hidden sm:inline">PDF</span>
        </button>
        <button
          onclick={toggleEdit}
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer {editMode ? 'bg-primary text-white border-primary' : 'bg-surface border-mint-subtle text-on-surface-variant hover:bg-surface-container'}"
          title={editMode ? 'Afficher le rendu' : 'Éditer le source'}>
          {#if editMode}
            <Eye size={18} />
            Voir le rendu
          {:else}
            <Pencil size={18} />
            Éditer
          {/if}
        </button>
      </div>
    </div>

    {#if editMode}
      <textarea
        bind:value={editSource}
        class="w-full min-h-[600px] font-mono text-sm p-4 border border-mint-subtle rounded-2xl resize-y focus:border-primary focus:outline-none bg-white"
      ></textarea>
    {:else}
      <div bind:this={contentEl} class="markdown bg-surface border border-mint-subtle rounded-2xl px-5 py-6 lg:px-10">
        <SvelteMarkdown source={displaySource} options={{ headerIds: true }} />
      </div>
    {/if}
  </div>

  <aside class="hidden xl:block w-52 shrink-0 xl:sticky xl:top-3">
    {#if !editMode && tocItems.length >= 4}
      <div class="bg-surface border border-mint-subtle rounded-2xl p-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <div class="flex items-center gap-2 px-2 pb-2 mb-2 border-b border-mint-subtle">
          <ListTree size={15} class="text-primary shrink-0" />
          <p class="text-[11px] font-bold text-on-surface uppercase tracking-widest">Sommaire</p>
        </div>
        <nav class="flex flex-col gap-0.5">
          {#each tocItems as item}
            <button
              onclick={() => scrollToHeading(item.id)}
              class={tocBtnClasses(item)}
            >
              {item.text}
            </button>
          {/each}
        </nav>
      </div>
    {/if}
  </aside>
</div>

<style>
  :global(.markdown) {
    font-size: 0.9375rem;
    line-height: 1.75;
    color: var(--color-on-surface);
    word-wrap: break-word;
  }
  :global(.markdown h1) {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.25;
    margin: 0 0 1rem;
    scroll-margin-top: 5rem;
  }
  :global(.markdown h2) {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 2.25rem 0 0.75rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid var(--color-mint-subtle);
    scroll-margin-top: 5rem;
  }
  :global(.markdown h3) {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 1.5rem 0 0.5rem;
    scroll-margin-top: 5rem;
  }
  :global(.markdown h4) {
    font-size: 0.95rem;
    font-weight: 700;
    margin: 1.25rem 0 0.5rem;
    scroll-margin-top: 5rem;
  }
  :global(.markdown p) {
    margin: 0 0 0.875rem;
  }
  :global(.markdown ul), :global(.markdown ol) {
    padding-left: 1.5rem;
    margin: 0 0 0.875rem;
  }
  :global(.markdown li) {
    margin-bottom: 0.3rem;
    line-height: 1.65;
  }
  :global(.markdown a) {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  :global(.markdown code) {
    font-family: var(--font-mono);
    font-size: 0.83em;
    background: var(--color-surface-container-low);
    border: 1px solid var(--color-mint-subtle);
    padding: 0.15em 0.4em;
    border-radius: 6px;
  }
  :global(.markdown pre) {
    background: var(--color-surface-container-low);
    border: 1px solid var(--color-mint-subtle);
    border-radius: 0.875rem;
    padding: 1rem 1.125rem;
    overflow-x: auto;
    margin: 0 0 1rem;
  }
  :global(.markdown pre code) {
    background: none;
    border: none;
    padding: 0;
    font-size: 0.85rem;
    line-height: 1.7;
  }
  :global(.markdown table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 1rem;
    font-size: 0.84rem;
  }
  :global(.markdown th), :global(.markdown td) {
    border: 1px solid var(--color-mint-subtle);
    padding: 0.5rem 0.75rem;
    text-align: left;
    vertical-align: top;
  }
  :global(.markdown th) {
    background: var(--color-surface-container-low);
    font-weight: 700;
  }
  :global(.markdown tbody tr:nth-child(even)) {
    background: #f7fbf1;
  }
  :global(.markdown tbody tr:hover) {
    background: #eef5e2;
  }
  :global(.markdown blockquote) {
    border-left: 3px solid var(--color-primary);
    background: var(--color-surface-container-low);
    padding: 0.75rem 1rem;
    margin: 0 0 1rem;
    border-radius: 0 0.75rem 0.75rem 0;
    color: var(--color-on-surface-variant);
  }
  :global(.markdown blockquote p:last-child) {
    margin-bottom: 0;
  }
  :global(.markdown hr) {
    border: none;
    border-top: 1px solid var(--color-mint-subtle);
    margin: 2rem 0;
  }
  :global(.markdown img) {
    max-width: 100%;
    border-radius: 0.75rem;
  }
  :global(.markdown strong) {
    font-weight: 700;
  }
  :global(.markdown details) {
    margin: 0 0 1rem;
  }
  :global(.markdown summary) {
    cursor: pointer;
    font-weight: 600;
    color: var(--color-primary);
  }
  :global(.markdown del) {
    color: var(--color-outline);
  }
</style>
