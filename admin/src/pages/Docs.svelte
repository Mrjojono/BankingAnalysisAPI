<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { Eye, Pencil } from '@lucide/svelte'
  import matrixModuleGuide from '../lib/docs/MATRIX_MODULE.md?raw'
  import eligibilityMatrixModule from '../lib/docs/ELIGIBILITY_MATRIX_MODULE.md?raw'

  const docs = [
    { id: 'matrix-module', label: 'Module Matriciel — Guide Complet', source: matrixModuleGuide },
    { id: 'eligibility-matrix', label: "Module d'Éligibilité Matricielle", source: eligibilityMatrixModule },
  ]

  let selectedId = $state(docs[0].id)
  let editMode = $state(false)

  let selectedDoc = $derived(docs.find(d => d.id === selectedId) ?? docs[0])
  let editSource = $state('')

  function selectDoc(id: string) {
    selectedId = id
    editSource = ''
    editMode = false
  }

  function toggleEdit() {
    if (!editMode) {
      editSource = selectedDoc.source
    }
    editMode = !editMode
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex items-center justify-between">
    <h2 class="text-[22px] font-bold">Documentation technique</h2>
    <button
      onclick={toggleEdit}
      class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer {editMode ? 'bg-primary text-white border-primary' : 'bg-surface border-mint-subtle text-on-surface-variant hover:bg-surface-container'}"
      title={editMode ? 'Afficher le rendu' : 'Éditer le source'}
    >
      {#if editMode}
        <Eye size={18} />
        Voir le rendu
      {:else}
        <Pencil size={18} />
        Éditer
      {/if}
    </button>
  </div>

  <div class="flex gap-2 flex-wrap">
    {#each docs as doc}
      <button
        onclick={() => selectDoc(doc.id)}
        class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none
          {selectedId === doc.id ? 'bg-primary text-white' : 'bg-surface border border-mint-subtle text-on-surface-variant hover:bg-surface-container'}"
      >
        {doc.label}
      </button>
    {/each}
  </div>

  <div class="bg-surface rounded-2xl border border-mint-subtle p-6 min-h-[400px]">
    {#if editMode}
      <textarea
        bind:value={editSource}
        class="w-full h-[600px] font-mono text-sm p-4 border border-mint-subtle rounded-xl resize-y focus:border-primary focus:outline-none bg-white"
      ></textarea>
    {:else}
      <div class="markdown">
        <SvelteMarkdown source={selectedDoc.source} />
      </div>
    {/if}
  </div>
</div>

<style>
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
