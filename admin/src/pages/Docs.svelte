<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { marked } from 'marked'
  import { Eye, Pencil, Download, RotateCcw } from '@lucide/svelte'
  import matrixModuleGuide from '../lib/docs/MATRIX_MODULE.md?raw'
  import eligibilityMatrixModule from '../lib/docs/ELIGIBILITY_MATRIX_MODULE.md?raw'
  import technologies from '../lib/docs/TECHNOLOGIES.md?raw'
  import conceptionDocument from '../lib/docs/DESIGN_UML.md?raw'
  import diagrams from '../lib/docs/CLASS_DIAGRAM_REFERENCE.md?raw'
  const docs = [
    { id: 'technologies', label: 'Technologies utilisées', source: technologies },
    { id: 'matrix-module', label: 'Module Matriciel — Guide Complet', source: matrixModuleGuide },
    { id: 'eligibility-matrix', label: "Module d'Éligibilité Matricielle", source: eligibilityMatrixModule },
    { id: 'conception-document', label: 'Conception du projet', source: conceptionDocument },
    { id: 'diagrams', label: 'Diagrammes', source: diagrams },
  ]

  let selectedId = $state(docs[0].id)
  let editMode = $state(false)
  let editSource = $state('')
  let hasEdits = $state(false)

  let selectedDoc = $derived(docs.find(d => d.id === selectedId) ?? docs[0])

  let displaySource = $derived(
    hasEdits && !editMode ? editSource : selectedDoc.source
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

<div class="docs-page">
  <div class="docs-header">
    <div class="flex items-center justify-between">
      <h2 class="text-[22px] font-bold">Documentation technique</h2>
      <div class="flex items-center gap-2">
        {#if hasEdits && !editMode}
          <button onclick={resetDoc}
            class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-mint-subtle text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
            title="Réinitialiser le document original">
            <RotateCcw size={16} />
            Réinitialiser
          </button>
        {/if}
        <button onclick={printDoc}
          class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border border-mint-subtle text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
          title="Télécharger en PDF">
          <Download size={16} />
          PDF
        </button>
        <button onclick={toggleEdit}
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
    <div class="flex gap-2 flex-wrap">
      {#each docs as doc}
        <button onclick={() => selectedId = doc.id}
          class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none
            {selectedId === doc.id ? 'bg-primary text-white' : 'bg-surface border border-mint-subtle text-on-surface-variant hover:bg-surface-container'}">
          {doc.label}
        </button>
      {/each}
    </div>
  </div>

  <div class="docs-content">
    {#if editMode}
      <textarea bind:value={editSource}
        class="w-full min-h-[600px] font-mono text-sm p-4 border border-mint-subtle rounded-xl resize-y focus:border-primary focus:outline-none bg-white"></textarea>
    {:else}
      <div class="markdown bg-surface rounded-2xl border border-mint-subtle p-6">
        <SvelteMarkdown source={displaySource} />
      </div>
    {/if}
  </div>
</div>

<style>
  .docs-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .docs-header {
    position: sticky;
    top: -1rem;
    z-index: 10;
    background: #f8faf6;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
  }
  .docs-content {
    flex: 1;
  }
  .docs-header :global(.markdown h1) {
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 1rem;
    margin-top: 0;
  }
  .docs-header :global(.markdown h2) {
    font-size: 1.35rem;
    font-weight: 700;
    margin-top: 2rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .docs-header :global(.markdown h3) {
    font-size: 1.1rem;
    font-weight: 600;
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
  }
  @media print {
    .docs-header { position: static; background: none; }
  }

  :global(.markdown h1) { font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem; margin-top: 0; }
  :global(.markdown h2) { font-size: 1.35rem; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; padding-bottom: 0.375rem; border-bottom: 1px solid #e5e7eb; }
  :global(.markdown h3) { font-size: 1.1rem; font-weight: 600; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  :global(.markdown h4) { font-size: 1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
  :global(.markdown p) { margin-bottom: 0.75rem; line-height: 1.7; }
  :global(.markdown ul), :global(.markdown ol) { padding-left: 1.5rem; margin-bottom: 0.75rem; }
  :global(.markdown li) { margin-bottom: 0.25rem; }
  :global(.markdown code) { font-size: 0.85em; padding: 0.15em 0.3em; border-radius: 4px; background: #f1f5e9; }
  :global(.markdown pre) { padding: 1rem; border-radius: 12px; overflow-x: auto; margin-bottom: 1rem; border: 1px solid #e5e7eb; background: #f8faf6; }
  :global(.markdown pre code) { background: none; padding: 0; }
  :global(.markdown table) { width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-size: 0.875rem; }
  :global(.markdown th), :global(.markdown td) { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
  :global(.markdown th) { background: #f1f5e9; font-weight: 600; }
  :global(.markdown blockquote) { border-left: 3px solid #3A6A00; padding-left: 1rem; margin-left: 0; color: #6b7280; }
  :global(.markdown hr) { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
  :global(.markdown img) { max-width: 100%; border-radius: 8px; }
  :global(.markdown strong) { font-weight: 700; }
  :global(.markdown a) { color: #3A6A00; text-decoration: underline; }
</style>
