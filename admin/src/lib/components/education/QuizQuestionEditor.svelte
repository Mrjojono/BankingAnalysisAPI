<script lang="ts">
  import { Plus, Trash2, GripVertical, Check } from '@lucide/svelte';
  import Button from '../Button.svelte';
  import Input from '../Input.svelte';

  let {
    questions = [] as any[],
    onadd,
    onupdate,
    ondelete,
    saving = false,
  }: {
    questions?: any[];
    onadd: (q: any) => void;
    onupdate: (q: any) => Promise<void>;
    ondelete: (id: string) => void;
    saving?: boolean;
  } = $props();

  let newQuestion = $state('');
  let newType = $state<'MCQ' | 'TRUE_FALSE'>('MCQ');
  let newChoices = $state<{ text: string; isCorrect: boolean }[]>([]);
  let editingQuestion = $state<string | null>(null);
  let editingChoices = $state<{ id?: string; text: string; isCorrect: boolean }[]>([]);

  function initNewChoices() {
    if (newType === 'TRUE_FALSE') {
      newChoices = [
        { text: 'Vrai', isCorrect: false },
        { text: 'Faux', isCorrect: false },
      ];
    } else {
      newChoices = [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ];
    }
  }

  function addChoiceField() {
    newChoices = [...newChoices, { text: '', isCorrect: false }];
  }

  function removeChoiceField(index: number) {
    newChoices = newChoices.filter((_, i) => i !== index);
    if (newChoices.length < 2) addChoiceField();
  }

  function handleAdd() {
    if (!newQuestion.trim()) return;
    const correctCount = newChoices.filter(c => c.isCorrect).length;
    if (correctCount !== 1) return;
    if (newChoices.some(c => !c.text.trim())) return;
    onadd({
      question: newQuestion,
      type: newType,
      choices: newChoices.map((c, i) => ({ ...c, order: i })),
    });
    newQuestion = '';
    newType = 'MCQ';
    initNewChoices();
  }

  function startEdit(q: any) {
    editingQuestion = q.id;
    editingChoices = q.choices?.map((c: any) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })) ?? [];
  }

  function cancelEdit() {
    editingQuestion = null;
    editingChoices = [];
  }

  async function saveEdit(q: any) {
    await onupdate({
      id: q.id,
      question: q.question,
      type: q.type,
      explanation: q.explanation,
    });
    for (const c of editingChoices) {
      if (c.id) {
        await onupdate({ id: c.id, text: c.text, isCorrect: c.isCorrect, _type: 'choice' });
      }
    }
    editingQuestion = null;
  }

  function addEditChoice() {
    editingChoices = [...editingChoices, { text: '', isCorrect: false }];
  }

  function removeEditChoice(index: number) {
    editingChoices = editingChoices.filter((_, i) => i !== index);
  }

  function setCorrect(index: number, isEditing: boolean) {
    if (isEditing) {
      editingChoices = editingChoices.map((c, i) => ({ ...c, isCorrect: i === index }));
    } else {
      newChoices = newChoices.map((c, i) => ({ ...c, isCorrect: i === index }));
    }
  }

  initNewChoices();
</script>

<div class="flex flex-col gap-4">
  <h4 class="text-sm font-bold text-on-surface">Questions</h4>

  {#each questions as q, i (q.id)}
    <div class="border border-mint-subtle rounded-xl p-3 bg-white">
      {#if editingQuestion === q.id}
        <div class="flex flex-col gap-2">
          <Input label="Question" bind:value={q.question} />
          <label class="text-xs text-on-surface-variant" for="quiz-explanation-{i}">Explication (optionnelle)</label>
          <input id="quiz-explanation-{i}" bind:value={q.explanation} placeholder="Explication après réponse..."
            class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:outline-none" />
          <div class="flex flex-col gap-1.5 mt-2">
            <span class="text-[11px] font-semibold text-on-surface-variant uppercase">Choix</span>
            {#each editingChoices as c, ci}
              <div class="flex items-center gap-2">
                <button onclick={() => setCorrect(ci, true)}
                  class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer {c.isCorrect ? 'border-primary bg-primary text-white' : 'border-mint-subtle'}"
                >
                  {#if c.isCorrect}<Check size={12} />{/if}
                </button>
                <input bind:value={c.text} placeholder="Choix {ci + 1}"
                  class="flex-1 px-2.5 py-1.5 border border-mint-subtle rounded-lg text-sm bg-[#fafcfa] focus:border-primary focus:outline-none" />
                <button onclick={() => removeEditChoice(ci)}
                  class="p-1 cursor-pointer text-outline hover:text-error bg-transparent border-none">
                  <Trash2 size={14} />
                </button>
              </div>
            {/each}
            <button onclick={addEditChoice}
              class="text-[12px] font-semibold text-primary bg-transparent border border-primary border-dashed rounded-lg px-3 py-1.5 cursor-pointer hover:bg-[#F0F7E6] mt-1">
              + Ajouter un choix
            </button>
          </div>
          <div class="flex gap-2 justify-end mt-2">
            <button onclick={cancelEdit}
              class="text-[12px] px-3 py-1.5 rounded-md border border-mint-subtle bg-white cursor-pointer text-on-surface-variant">Annuler</button>
            <button onclick={() => saveEdit(q)}
              class="text-[12px] px-3 py-1.5 rounded-md bg-primary text-white border-none cursor-pointer">Enregistrer</button>
          </div>
        </div>
      {:else}
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs text-outline font-mono">#{i + 1}</span>
              <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-50 text-gray-600">{q.type}</span>
              <span class="text-sm font-medium truncate">{q.question}</span>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-1.5">
              {#each q.choices ?? [] as c}
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] {c.isCorrect ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : 'bg-gray-50 text-gray-600'}">
                  {#if c.isCorrect}<Check size={11} />{/if}
                  {c.text}
                </span>
              {/each}
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button onclick={() => startEdit(q)}
              class="p-1.5 rounded-md border border-transparent cursor-pointer text-outline hover:text-primary hover:border-primary transition-all bg-transparent">
              <GripVertical size={14} />
            </button>
            <button onclick={async () => { await ondelete(q.id); }}
              class="p-1.5 rounded-md border border-transparent cursor-pointer text-outline hover:text-error hover:border-error transition-all bg-transparent">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-outline text-center py-4">Aucune question. Ajoutez-en une ci-dessous.</p>
  {/each}

  <!-- Nouvelle question -->
  <div class="border border-dashed border-mint-subtle rounded-xl p-3 bg-[#fafcfa]">
    <h5 class="text-xs font-bold text-on-surface-variant uppercase mb-2">Nouvelle question</h5>
    <div class="flex flex-col gap-2">
      <input bind:value={newQuestion} placeholder="Poser une question..."
        class="w-full px-3 py-2 border border-mint-subtle rounded-lg text-sm bg-white focus:border-primary focus:outline-none" />
      <div class="flex gap-3">
        <label class="flex items-center gap-2 text-sm text-on-surface-variant">
          <input type="radio" bind:group={newType} value="MCQ" /> QCM
        </label>
        <label class="flex items-center gap-2 text-sm text-on-surface-variant">
          <input type="radio" bind:group={newType} value="TRUE_FALSE" /> Vrai/Faux
        </label>
      </div>
      <div class="flex flex-col gap-1.5 mt-1">
        <span class="text-[11px] font-semibold text-on-surface-variant uppercase">Choix</span>
        {#each newChoices as c, ci}
          <div class="flex items-center gap-2">
            <button onclick={() => setCorrect(ci, false)}
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer {c.isCorrect ? 'border-primary bg-primary text-white' : 'border-mint-subtle'}"
            >
              {#if c.isCorrect}<Check size={12} />{/if}
            </button>
            <input bind:value={c.text} placeholder="Choix {ci + 1}"
              class="flex-1 px-2.5 py-1.5 border border-mint-subtle rounded-lg text-sm bg-white focus:border-primary focus:outline-none" />
            <button onclick={() => removeChoiceField(ci)}
              class="p-1 cursor-pointer text-outline hover:text-error bg-transparent border-none">
              <Trash2 size={14} />
            </button>
          </div>
        {/each}
        {#if newType !== 'TRUE_FALSE'}
          <button onclick={addChoiceField}
            class="text-[12px] font-semibold text-primary bg-transparent border border-primary border-dashed rounded-lg px-3 py-1.5 cursor-pointer hover:bg-[#F0F7E6]">
            + Ajouter un choix
          </button>
        {/if}
      </div>
      <div class="flex justify-end mt-2">
        <Button onclick={handleAdd} disabled={saving || !newQuestion.trim()}>Ajouter la question</Button>
      </div>
    </div>
  </div>
</div>
