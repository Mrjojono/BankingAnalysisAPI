<script lang="ts">
  import Input from '../Input.svelte';
  import Button from '../Button.svelte';

  let {
    quiz = null as any | null,
    saving = false,
    onsave,
    onclose,
  }: {
    quiz?: any | null;
    saving?: boolean;
    onsave: () => void;
    onclose: () => void;
  } = $props();

  const STATUSES = [
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'PUBLISHED', label: 'Publié' },
    { value: 'ARCHIVED', label: 'Archivé' },
  ];
</script>

<div class="flex flex-col gap-4">
  <Input label="Titre" bind:value={quiz!.title} placeholder="Ex: Budget et épargne" />
  <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
    Description
    <textarea bind:value={quiz!.description} rows="3" placeholder="Description du quiz..."
      class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical">
    </textarea>
  </label>
  <div class="grid grid-cols-2 gap-4">
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Statut
      <select bind:value={quiz!.status} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
        {#each STATUSES as s}
          <option value={s.value}>{s.label}</option>
        {/each}
      </select>
    </label>
    <Input label="Score de passage (%)" type="number" bind:value={quiz!.passingScore} min={0} max={100} />
  </div>
  <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
    <Button variant="secondary" onclick={onclose}>Annuler</Button>
    <Button onclick={onsave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
  </div>
</div>
