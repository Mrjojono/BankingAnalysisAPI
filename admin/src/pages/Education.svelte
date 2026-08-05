<script lang="ts">
  import { Plus, Info, BookOpen, GraduationCap, Workflow, Search, HelpCircle, Trash2 } from '@lucide/svelte';
  import { onMount } from 'svelte';
  import { api } from '../lib/api';
  import { toast } from '../lib/stores/toast.svelte';
  import Button from '../lib/components/Button.svelte';
  import Input from '../lib/components/Input.svelte';
  import Drawer from '../lib/components/Drawer.svelte';
  import ConfirmDialog from '../lib/components/ConfirmDialog.svelte';
  import BlockEditor from '../lib/components/education/BlockEditor.svelte';
  import ContentBlockEditor from '../lib/components/education/ContentBlockEditor.svelte';
  import CanvasView from '../lib/components/education/CanvasView.svelte';
  import StatsCards from '../lib/components/education/StatsCards.svelte';
  import PathsTable from '../lib/components/education/PathsTable.svelte';
  import LessonsTable from '../lib/components/education/LessonsTable.svelte';
  import QuizList from '../lib/components/education/QuizList.svelte';
  import QuizDrawer from '../lib/components/education/QuizDrawer.svelte';
  import QuizQuestionEditor from '../lib/components/education/QuizQuestionEditor.svelte';
  import QuizLessonPicker from '../lib/components/education/QuizLessonPicker.svelte';

  let paths = $state<any[]>([]);
  let lessons = $state<any[]>([]);
  let editingPath = $state<any | null>(null);
  let editingLesson = $state<any | null>(null);
  let saving = $state(false);
  let error = $state('');
  let drawerOpen = $state(false);
  let lessonDrawerOpen = $state(false);
  let adviceDrawerOpen = $state(false);
  let editingAdvice = $state<any | null>(null);
  let lessonPreview = $state(false);
  let helpOpen = $state(false);
  let search = $state('');
  let tab = $state<'paths' | 'lessons' | 'canvas' | 'quiz'>('paths');

  const DIFFICULTIES = [
    { value: 'BEGINNER', label: 'Débutant', class: 'bg-green-50 text-green-700 ring-green-200' },
    { value: 'INTERMEDIATE', label: 'Intermédiaire', class: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { value: 'ADVANCED', label: 'Avancé', class: 'bg-red-50 text-red-700 ring-red-200' },
  ];

  const STATUSES = [
    { value: 'DRAFT', label: 'Brouillon', class: 'bg-gray-50 text-gray-700 ring-gray-200' },
    { value: 'PUBLISHED', label: 'Publié', class: 'bg-green-50 text-green-700 ring-green-200' },
    { value: 'ARCHIVED', label: 'Archivé', class: 'bg-red-50 text-red-700 ring-red-200' },
  ];

  const ADVICE_TYPES = [
    'SAVINGS_LOW', 'EXPENSE_HIGH', 'EXPENSE_SPIKE', 'DEBT_HIGH',
    'DEBT_INCREASE', 'OVERDRAFT_FREQUENT', 'INCOME_DROP', 'INCOME_IRREGULAR',
    'MOBILE_MONEY_HIGH', 'FEES_HIGH', 'LOGOUT_CRITICAL', 'LOGOUT_HIGH',
    'CREDIT_HIGH', 'ALIMENTATION_HIGH', 'TRANSPORT_HIGH', 'GOOD_HABIT',
  ];

  let filteredPaths = $derived.by(() => {
    if (!search) return paths;
    const q = search.toLowerCase();
    return paths.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    );
  });

  let filteredLessons = $derived.by(() => {
    if (!search) return lessons;
    const q = search.toLowerCase();
    return lessons.filter(l =>
      l.title?.toLowerCase().includes(q) ||
      l.summary?.toLowerCase().includes(q)
    );
  });

  onMount(async () => {
    try {
      [paths, lessons, quizzes] = await Promise.all([
        api.listEducationPaths(),
        api.listEducationLessons(),
        api.listQuizzes(),
      ]);
    } catch (e: any) {
      error = 'Erreur chargement éducation financière';
      console.error(e.message);
    }
  });

  // ===== Path CRUD =====
  function openPathForm(p?: any) {
    editingPath = p
      ? { ...p }
      : { title: '', description: '', icon: 'BookOpen', difficulty: 'BEGINNER', order: paths.length + 1, isActive: true };
    drawerOpen = true;
  }

  async function savePath() {
    if (!editingPath) return;
    saving = true; error = '';
    const clean = {
      title: editingPath.title,
      description: editingPath.description,
      icon: editingPath.icon,
      difficulty: editingPath.difficulty,
      order: editingPath.order,
      isActive: editingPath.isActive,
    };
    const wasUpdate = !!editingPath.id;
    try {
      if (wasUpdate) {
        const updated = await api.updateEducationPath(editingPath.id, clean);
        paths = paths.map(p => p.id === updated.id ? updated : p);
      } else {
        const created = await api.createEducationPath(clean);
        paths = [...paths, created];
      }
      drawerOpen = false;
      editingPath = null;
      toast.success(wasUpdate ? 'Parcours modifié' : 'Parcours créé');
    } catch (e: any) { toast.error(e.message); }
    finally { saving = false; }
  }

  function removePath(id: string) {
    ask('Désactiver le parcours ?', 'Le parcours sera désactivé et masqué des utilisateurs. Vous pourrez le réactiver à tout moment.', async () => {
      await api.deleteEducationPath(id);
      paths = paths.filter(p => p.id !== id);
      toast.success('Parcours désactivé');
    });
  }

  async function togglePath(p: any, next: boolean) {
    try {
      const updated = await api.updateEducationPath(p.id, { isActive: next });
      paths = paths.map(x => x.id === p.id ? { ...x, ...updated, isActive: next } : x);
      toast.success(next ? 'Parcours activé' : 'Parcours désactivé');
    } catch (e: any) { toast.error(e.message); }
  }

  // ===== Lesson CRUD =====
  function openLessonForm(l?: any) {
    if (l && !l.content) {
      fetchLessonDetail(l.id).then(full => {
        editingLesson = full ? { ...full } : defaultLesson();
        lessonDrawerOpen = true;
      });
      return;
    }
    editingLesson = l ? { ...l } : defaultLesson();
    lessonDrawerOpen = true;
  }

  function defaultLesson() {
    return {
      learningPathId: '',
      title: '', summary: '', content: '',
      contentBlocks: [],
      difficulty: 'BEGINNER', status: 'DRAFT',
      order: lessons.length + 1, estimatedMinutes: 10,
      imageUrl: '', videoUrl: '',
      minScore: null, maxScore: null, relatedProductId: null,
    };
  }

  async function fetchLessonDetail(id: string) {
    try { return await api.getEducationLesson(id); }
    catch { return null; }
  }

  async function saveLesson() {
    if (!editingLesson) return;
    saving = true; error = '';
    const clean: Record<string, any> = {
      learningPathId: editingLesson.learningPathId,
      title: editingLesson.title,
      summary: editingLesson.summary,
      content: editingLesson.content,
      contentBlocks: editingLesson.contentBlocks?.length ? editingLesson.contentBlocks : undefined,
      difficulty: editingLesson.difficulty,
      order: editingLesson.order,
      estimatedMinutes: editingLesson.estimatedMinutes,
      status: editingLesson.status,
      imageUrl: editingLesson.imageUrl ?? undefined,
      videoUrl: editingLesson.videoUrl ?? undefined,
      minScore: editingLesson.minScore ?? undefined,
      maxScore: editingLesson.maxScore ?? undefined,
      relatedProductId: editingLesson.relatedProductId ?? undefined,
    };
    Object.keys(clean).forEach(k => clean[k] === undefined && delete clean[k]);
    const wasUpdate = !!editingLesson.id;
    try {
      if (wasUpdate) {
        const updated = await api.updateEducationLesson(editingLesson.id, clean);
        lessons = lessons.map(l => l.id === updated.id ? updated : l);
      } else {
        const created = await api.createEducationLesson(clean);
        lessons = [...lessons, created];
      }
      lessonDrawerOpen = false;
      editingLesson = null;
      toast.success(wasUpdate ? 'Leçon modifiée' : 'Leçon créée');
    } catch (e: any) { toast.error(e.message); }
    finally { saving = false; }
  }

  function removeLesson(id: string) {
    ask('Archiver la leçon ?', 'La leçon sera archivée et masquée des utilisateurs. Vous pourrez la republier à tout moment.', async () => {
      await api.deleteEducationLesson(id);
      lessons = lessons.filter(l => l.id !== id);
      toast.success('Leçon archivée');
    });
  }

  async function toggleLesson(l: any, next: boolean) {
    const target = next ? 'PUBLISHED' : (l.status === 'PUBLISHED' ? 'ARCHIVED' : l.status);
    try {
      const updated = await api.updateEducationLesson(l.id, { status: target });
      lessons = lessons.map(x => x.id === l.id ? { ...x, ...updated, status: target } : x);
      toast.success(target === 'PUBLISHED' ? 'Leçon publiée' : 'Leçon archivée');
    } catch (e: any) { toast.error(e.message); }
  }

  // ===== Advice Link CRUD =====
  function openAdviceForm(l?: any) {
    editingAdvice = l
      ? { ...l }
      : { lessonId: '', adviceType: '', priority: 0 };
    adviceDrawerOpen = true;
  }

  async function saveAdviceLink() {
    if (!editingAdvice) return;
    saving = true; error = '';
    try {
      const created = await api.createEducationAdviceLink(editingAdvice);
      editingLesson = {
        ...editingLesson,
        adviceLinks: [...(editingLesson?.adviceLinks ?? []), created],
      };
      adviceDrawerOpen = false;
      editingAdvice = null;
      toast.success('Conseil lié à la leçon');
    } catch (e: any) { toast.error(e.message); }
    finally { saving = false; }
  }

  function removeAdviceLink(id: string) {
    ask('Supprimer le lien ?', 'Le conseil ne sera plus associé à cette leçon.', async () => {
      await api.deleteEducationAdviceLink(id);
      if (editingLesson) {
        editingLesson.adviceLinks = (editingLesson.adviceLinks ?? []).filter((a: any) => a.id !== id);
      }
      toast.success('Lien supprimé');
    });
  }

  // ===== Quiz CRUD =====
  let quizzes = $state<any[]>([]);
  let editingQuiz = $state<any | null>(null);
  let quizDrawerOpen = $state(false);
  let quizQuestionDrawerOpen = $state(false);
  let quizLessonDrawerOpen = $state(false);
  let viewingQuiz = $state<any | null>(null);
  let savingQuiz = $state(false);
  let confirm = $state<{ title: string; message: string; action: () => void } | null>(null);

  function ask(title: string, message: string, action: () => void) {
    confirm = { title, message, action };
  }

  function cancelConfirm() {
    confirm = null;
  }

  function execConfirm() {
    confirm?.action();
    confirm = null;
  }

  async function loadQuizzes() {
    try {
      quizzes = await api.listQuizzes();
    } catch (e: any) {
      error = 'Erreur chargement quiz';
      console.error(e.message);
    }
  }

  function openQuizForm(q?: any) {
    editingQuiz = q
      ? { ...q }
      : { title: '', description: '', status: 'DRAFT', passingScore: 70 };
    quizDrawerOpen = true;
  }

  async function saveQuiz() {
    if (!editingQuiz) return;
    savingQuiz = true; error = '';
    const clean = {
      title: editingQuiz.title,
      description: editingQuiz.description || undefined,
      status: editingQuiz.status,
      passingScore: editingQuiz.passingScore,
    };
    const wasUpdate = !!editingQuiz.id;
    try {
      if (wasUpdate) {
        const updated = await api.updateQuiz(editingQuiz.id, clean);
        quizzes = quizzes.map(q => q.id === updated.id ? updated : q);
        if (viewingQuiz?.id === updated.id) {
          viewingQuiz = { ...viewingQuiz, ...updated };
        }
      } else {
        const created = await api.createQuiz(clean);
        quizzes = [...quizzes, { ...created, _count: { questions: 0, lessonLinks: 0 } }];
        viewingQuiz = created;
      }
      quizDrawerOpen = false;
      editingQuiz = null;
      toast.success(wasUpdate ? 'Quiz modifié' : 'Quiz créé');
    } catch (e: any) { toast.error(e.message); }
    finally { savingQuiz = false; }
  }

  function removeQuiz(id: string) {
    ask('Supprimer le quiz ?', 'Toutes les questions, réponses, tentatives et liens seront supprimés définitivement.', async () => {
      try {
        await api.deleteQuiz(id);
        quizzes = quizzes.filter(q => q.id !== id);
        if (viewingQuiz?.id === id) viewingQuiz = null;
        toast.success('Quiz supprimé');
      } catch (e: any) { toast.error(e.message); }
    });
  }

  async function toggleQuiz(q: any, next: boolean) {
    const target = next ? 'PUBLISHED' : (q.status === 'PUBLISHED' ? 'DRAFT' : q.status);
    try {
      const updated = await api.updateQuiz(q.id, { status: target });
      quizzes = quizzes.map(x => x.id === q.id ? { ...x, ...updated, status: target } : x);
      toast.success(target === 'PUBLISHED' ? 'Quiz publié' : 'Quiz en brouillon');
    } catch (e: any) { toast.error(e.message); }
  }

  async function openQuizView(q: any) {
    try {
      viewingQuiz = await api.getQuiz(q.id);
      quizQuestionDrawerOpen = true;
    } catch (e: any) { toast.error(e.message); }
  }

  async function addQuizQuestion(data: any) {
    if (!viewingQuiz) return;
    try {
      const q = await api.addQuestion(viewingQuiz.id, data);
      viewingQuiz = {
        ...viewingQuiz,
        questions: [...(viewingQuiz.questions ?? []), q],
        _count: { ...viewingQuiz._count, questions: (viewingQuiz._count?.questions ?? 0) + 1 },
      };
      quizzes = quizzes.map(qz => qz.id === viewingQuiz!.id
        ? { ...qz, _count: { ...qz._count, questions: (qz._count?.questions ?? 0) + 1 } }
        : qz
      );
      toast.success('Question ajoutée');
    } catch (e: any) { toast.error(e.message); }
  }

  async function updateQuizQuestion(data: any) {
    if (!viewingQuiz) return;
    try {
      if (data._type === 'choice') {
        await api.updateChoice(data.id, { text: data.text, isCorrect: data.isCorrect });
      } else {
        await api.updateQuestion(data.id, { question: data.question, type: data.type, explanation: data.explanation });
      }
      toast.success('Question mise à jour');
    } catch (e: any) { toast.error(e.message); }
  }

  function deleteQuizQuestion(qid: string) {
    ask('Supprimer la question ?', 'Cette action est irréversible.', async () => {
      try {
        await api.deleteQuestion(qid);
        if (viewingQuiz) {
          viewingQuiz = {
            ...viewingQuiz,
            questions: viewingQuiz.questions.filter((q: any) => q.id !== qid),
            _count: { ...viewingQuiz._count, questions: (viewingQuiz._count?.questions ?? 1) - 1 },
          };
        }
        quizzes = quizzes.map(q => q.id === viewingQuiz?.id ? {
          ...q, _count: { ...q._count, questions: (q._count?.questions ?? 1) - 1 },
        } : q);
        toast.success('Question supprimée');
      } catch (e: any) { toast.error(e.message); }
    });
  }

  async function linkQuizLesson(lessonId: string) {
    if (!viewingQuiz) return;
    try {
      await api.linkQuizToLesson(viewingQuiz.id, lessonId);
      viewingQuiz = await api.getQuiz(viewingQuiz.id);
    } catch (e: any) { toast.error(e.message); }
  }

  async function unlinkQuizLesson(lessonId: string) {
    if (!viewingQuiz) return;
    try {
      await api.unlinkQuizFromLesson(viewingQuiz.id, lessonId);
      viewingQuiz = await api.getQuiz(viewingQuiz.id);
    } catch (e: any) { toast.error(e.message); }
  }
</script>

<div class="h-full pl-5 flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between mb-6 shrink-0">
    <h2 class="text-[22px] font-bold">Éducation financière</h2>
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="md" onclick={() => helpOpen = true}>
        <Info size={18} />
        Aide
      </Button>
      <Button variant="primary" size="md" onclick={() => tab === 'paths' ? openPathForm() : tab === 'lessons' ? openLessonForm() : tab === 'quiz' ? openQuizForm() : openPathForm()}>
        <Plus size={18} />
        {tab === 'paths' ? 'Nouveau parcours' : tab === 'lessons' ? 'Nouvelle leçon' : tab === 'quiz' ? 'Nouveau quiz' : 'Nouveau parcours'}
      </Button>
    </div>
  </div>

  <Drawer open={helpOpen} title="Aide — Éducation financière" onclose={() => helpOpen = false}>
    <div class="flex flex-col gap-4 text-sm leading-relaxed text-on-surface">
      <p>Gérez les parcours pédagogiques et les leçons d'éducation financière.</p>
      <h4 class="font-bold text-base mt-2">Parcours</h4>
      <p>Un parcours regroupe plusieurs leçons autour d'un thème (ex: "Bien gérer son budget"). Les parcours ont un niveau de difficulté et un ordre d'affichage.</p>
      <h4 class="font-bold text-base mt-2">Leçons</h4>
      <p>Contenu éducatif au format Markdown. Chaque leçon peut être liée à un type de conseil financier (adviceType) pour la recommandation automatique via la matrice éducative.</p>
      <h4 class="font-bold text-base mt-2">Lien conseil → leçon</h4>
      <p>Associe un type de conseil (ex: SAVINGS_LOW) à une leçon. Quand la matrice détecte un besoin pour ce conseil, la leçon est recommandée à l'utilisateur.</p>
      <h4 class="font-bold text-base mt-2">Score</h4>
      <p>Les champs <strong>Score min/max</strong> permettent de filtrer les leçons par score financier global de l'utilisateur (0-100).</p>
    </div>
  </Drawer>

  {#if error}
    <div class="bg-red-50 text-error px-4 py-3 rounded-xl text-sm font-medium mb-4 shrink-0">{error}</div>
  {/if}

  {#if confirm}
    <ConfirmDialog
      open={true}
      title={confirm.title}
      message={confirm.message}
      onconfirm={execConfirm}
      oncancel={cancelConfirm}
    />
  {/if}

  <!-- Tabs -->
  <div class="flex gap-1 mb-4 bg-surface-container rounded-xl p-1 w-fit shrink-0">
    <button onclick={() => tab = 'paths'}
      class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'paths' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">
      <div class="flex items-center gap-2">
        <BookOpen size={16} />
        Parcours
      </div>
    </button>
    <button onclick={() => tab = 'lessons'}
      class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'lessons' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">
      <div class="flex items-center gap-2">
        <GraduationCap size={16} />
        Leçons
      </div>
    </button>
    <button onclick={() => tab = 'canvas'}
      class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'canvas' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">
      <div class="flex items-center gap-2">
        <Workflow size={16} />
        Canvas
      </div>
    </button>
    <button onclick={() => { tab = 'quiz'; if (!quizzes.length) loadQuizzes(); }}
      class="px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none {tab === 'quiz' ? 'bg-white text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}">
      <div class="flex items-center gap-2">
        <HelpCircle size={16} />
        Quiz
      </div>
    </button>
  </div>

  {#if tab === 'canvas'}
    <div class="-mx-6 -mb-6 overflow-hidden" style="height: calc(100vh - 160px);">
      <CanvasView
        {paths}
        {lessons}
        onEditLesson={(id) => {
          const lesson = lessons.find(l => l.id === id);
          if (lesson) openLessonForm(lesson);
        }}
        onNewPath={() => openPathForm()}
        onNewLesson={(pathId) => {
          openLessonForm({ learningPathId: pathId ?? '' });
        }}
      />
    </div>
  {:else if tab === 'quiz'}
    <QuizList
      quizzes={quizzes}
      onView={openQuizView}
      onEdit={openQuizForm}
      onToggle={toggleQuiz}
    />
  {:else}
    <!-- Stats + Search -->
    <StatsCards
      totalPaths={paths.length}
      totalLessons={lessons.length}
      publishedLessons={lessons.filter(l => l.status === 'PUBLISHED').length}
      draftLessons={lessons.filter(l => l.status === 'DRAFT').length}
    />

    <div class="relative mb-4">
      <Search size={18} class="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
      <input bind:value={search} placeholder={tab === 'paths' ? 'Rechercher un parcours…' : 'Rechercher une leçon…'}
        class="w-full pl-10 pr-4 py-2.5 border border-mint-subtle rounded-xl text-sm bg-white focus:border-primary focus:outline-none transition-all" />
    </div>

    <!-- Paths -->
    {#if tab === 'paths'}
      <PathsTable paths={filteredPaths} onEdit={openPathForm} onToggle={togglePath} />
    {:else if tab === 'lessons'}
      <LessonsTable lessons={filteredLessons} {paths} onEdit={openLessonForm} onToggle={toggleLesson} />
    {/if}
  {/if}
</div>

<!-- ===== Drawer: Path Form ===== -->
<Drawer open={drawerOpen} title={editingPath?.id ? 'Modifier le parcours' : 'Nouveau parcours'} onclose={() => { drawerOpen = false; editingPath = null; }} widthClass="max-w-lg">
  <div class="flex flex-col gap-4">
    <Input label="Titre" bind:value={editingPath!.title} />
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Description
      <textarea bind:value={editingPath!.description} rows="3" class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all resize-vertical"></textarea>
    </label>
    <Input label="Icône (nom Lucide)" bind:value={editingPath!.icon} placeholder="BookOpen" />
    <div class="grid grid-cols-2 gap-4">
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Difficulté
        <select bind:value={editingPath!.difficulty} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          {#each DIFFICULTIES as d}
            <option value={d.value}>{d.label}</option>
          {/each}
        </select>
      </label>
      <Input label="Ordre" type="number" bind:value={editingPath!.order} />
    </div>
    <label class="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
      <input type="checkbox" bind:checked={editingPath!.isActive} class="w-4 h-4 rounded border-mint-subtle text-primary focus:ring-primary" />
      Actif
    </label>
    {#if editingPath?.id}
      <div class="mt-4 pt-4 border-t border-red-200">
        <h4 class="text-sm font-bold text-error mb-1">Zone dangereuse</h4>
        <p class="text-xs text-on-surface-variant mb-3">Désactiver le parcours le masquera des utilisateurs. Il pourra être réactivé à tout moment.</p>
        <Button variant="danger" size="sm" onclick={() => { drawerOpen = false; removePath(editingPath.id); }}>
          <Trash2 size={14} /> Désactiver le parcours
        </Button>
      </div>
    {/if}
    <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
      <Button variant="secondary" onclick={() => { drawerOpen = false; editingPath = null; }}>Annuler</Button>
      <Button onclick={savePath} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
    </div>
  </div>
</Drawer>

<!-- ===== Drawer: Lesson Form ===== -->
<Drawer open={lessonDrawerOpen} title={editingLesson?.id ? 'Modifier la leçon' : 'Nouvelle leçon'} onclose={() => { lessonDrawerOpen = false; editingLesson = null; }} widthClass="max-w-3xl">
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-2 gap-4">
      <Input label="Titre" bind:value={editingLesson!.title} />
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Parcours
        <select bind:value={editingLesson!.learningPathId} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          <option value="">— Sélectionner —</option>
          {#each paths as p}
            <option value={p.id}>{p.title}</option>
          {/each}
        </select>
      </label>
    </div>
    <Input label="Résumé" bind:value={editingLesson!.summary} />
    <!-- Content Tabs -->
    <div>
      <div class="flex gap-1 mb-3 bg-surface-container rounded-lg p-0.5 w-fit">
        <button onclick={() => lessonPreview = false}
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-none {!lessonPreview ? 'bg-white text-on-surface shadow-sm' : 'text-outline hover:text-on-surface'}">
          Blocs structurés
        </button>
        <button onclick={() => lessonPreview = true}
          class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border-none {lessonPreview ? 'bg-white text-on-surface shadow-sm' : 'text-outline hover:text-on-surface'}">
          Markdown
        </button>
      </div>

      {#if lessonPreview}
        <BlockEditor
          content={editingLesson!.content ?? ''}
          onchange={(c) => { editingLesson!.content = c; }}
        />
      {:else}
        <ContentBlockEditor bind:blocks={editingLesson!.contentBlocks} />
      {/if}
    </div>
    <div class="grid grid-cols-2 gap-4">
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Difficulté
        <select bind:value={editingLesson!.difficulty} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          {#each DIFFICULTIES as d}
            <option value={d.value}>{d.label}</option>
          {/each}
        </select>
      </label>
      <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
        Statut
        <select bind:value={editingLesson!.status} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
          {#each STATUSES as s}
            <option value={s.value}>{s.label}</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="grid grid-cols-3 gap-4">
      <Input label="Ordre" type="number" bind:value={editingLesson!.order} />
      <Input label="Durée (min)" type="number" bind:value={editingLesson!.estimatedMinutes} />
      <Input label="Image URL" bind:value={editingLesson!.imageUrl} />
    </div>
    <div class="grid grid-cols-2 gap-4">
      <Input label="Score min" type="number" bind:value={editingLesson!.minScore} />
      <Input label="Score max" type="number" bind:value={editingLesson!.maxScore} />
    </div>
    <Input label="Vidéo URL (optionnel)" bind:value={editingLesson!.videoUrl} />

    <!-- Advice Links -->
    {#if editingLesson?.id}
      <div class="border-t border-mint-subtle pt-4 mt-2">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-bold">Liens conseils (adviceType)</h4>
          <Button variant="primary" size="sm" onclick={() => { editingAdvice = { lessonId: editingLesson!.id, adviceType: '', priority: 0 }; adviceDrawerOpen = true; }}>
            <Plus size={14} /> Ajouter
          </Button>
        </div>
        {#if (editingLesson!.adviceLinks ?? []).length === 0}
          <p class="text-sm text-outline">Aucun lien conseil</p>
        {:else}
          <div class="flex flex-wrap gap-2">
            {#each editingLesson!.adviceLinks as link}
              <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-primary-container text-primary">
                {link.adviceType}
                <button onclick={() => removeAdviceLink(link.id)} class="bg-transparent border-none p-0 cursor-pointer text-primary hover:text-error transition-colors">
                  <Trash2 size={12} />
                </button>
              </span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#if editingLesson?.id}
      <div class="mt-4 pt-4 border-t border-red-200">
        <h4 class="text-sm font-bold text-error mb-1">Zone dangereuse</h4>
        <p class="text-xs text-on-surface-variant mb-3">Archiver la leçon la masquera des utilisateurs. Elle pourra être republiée à tout moment.</p>
        <Button variant="danger" size="sm" onclick={() => { lessonDrawerOpen = false; removeLesson(editingLesson.id); }}>
          <Trash2 size={14} /> Archiver la leçon
        </Button>
      </div>
    {/if}

    <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
      <Button variant="secondary" onclick={() => { lessonDrawerOpen = false; editingLesson = null; }}>Annuler</Button>
      <Button onclick={saveLesson} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
    </div>
  </div>
</Drawer>

<!-- ===== Drawer: Advice Link Form ===== -->
<Drawer open={adviceDrawerOpen} title="Ajouter un lien conseil" onclose={() => { adviceDrawerOpen = false; editingAdvice = null; }} widthClass="max-w-md">
  <div class="flex flex-col gap-4">
    <label class="flex flex-col gap-1 text-sm font-semibold text-on-surface-variant">
      Type de conseil
      <select bind:value={editingAdvice!.adviceType} class="w-full px-3 py-2.5 border border-mint-subtle rounded-xl text-sm bg-[#fafcfa] focus:border-primary focus:bg-white focus:outline-none transition-all">
        <option value="">— Sélectionner —</option>
        {#each ADVICE_TYPES as at}
          <option value={at}>{at}</option>
        {/each}
      </select>
    </label>
    <Input label="Priorité" type="number" bind:value={editingAdvice!.priority} />
    <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-mint-subtle">
      <Button variant="secondary" onclick={() => { adviceDrawerOpen = false; editingAdvice = null; }}>Annuler</Button>
      <Button onclick={saveAdviceLink} disabled={saving}>{saving ? 'Ajout...' : 'Ajouter'}</Button>
    </div>
  </div>
</Drawer>

<!-- ===== Drawer: Quiz Form ===== -->
<Drawer open={quizDrawerOpen} title={editingQuiz?.id ? 'Modifier le quiz' : 'Nouveau quiz'} onclose={() => { quizDrawerOpen = false; editingQuiz = null; }} widthClass="max-w-lg">
  {#if editingQuiz}
    <QuizDrawer quiz={editingQuiz} saving={savingQuiz} onsave={saveQuiz} onclose={() => { quizDrawerOpen = false; editingQuiz = null; }} ondelete={() => { quizDrawerOpen = false; removeQuiz(editingQuiz!.id); }} />
  {/if}
</Drawer>

<!-- ===== Drawer: Quiz Questions & Lessons ===== -->
<Drawer open={quizQuestionDrawerOpen} title={viewingQuiz?.title ?? 'Détail du quiz'} onclose={() => { quizQuestionDrawerOpen = false; viewingQuiz = null; }} widthClass="max-w-3xl">
  {#if viewingQuiz}
    <div class="flex flex-col gap-6">
      <QuizQuestionEditor
        questions={viewingQuiz.questions ?? []}
        onadd={addQuizQuestion}
        onupdate={updateQuizQuestion}
        ondelete={deleteQuizQuestion}
      />
      <div class="border-t border-mint-subtle pt-4">
        <h4 class="text-sm font-bold text-on-surface mb-3 flex items-center gap-2">
          <BookOpen size={16} /> Leçons liées
        </h4>
        <QuizLessonPicker
          {lessons}
          linkedLessonIds={viewingQuiz.lessonLinks?.map((l: any) => l.lessonId ?? l.lesson?.id).filter(Boolean) ?? []}
          onlink={linkQuizLesson}
          onunlink={unlinkQuizLesson}
        />
      </div>
    </div>
  {/if}
</Drawer>

<style>
  :global(.markdown h1) { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; margin-top: 0; }
  :global(.markdown h2) { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #e5e7eb; }
  :global(.markdown h3) { font-size: 1.1rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; }
  :global(.markdown p) { margin-bottom: 0.5rem; line-height: 1.7; }
  :global(.markdown ul), :global(.markdown ol) { padding-left: 1.5rem; margin-bottom: 0.5rem; }
  :global(.markdown li) { margin-bottom: 0.25rem; }
  :global(.markdown code) { font-size: 0.85em; padding: 0.15em 0.3em; border-radius: 4px; background: #f1f5e9; }
  :global(.markdown pre) { padding: 0.75rem; border-radius: 8px; overflow-x: auto; margin-bottom: 0.75rem; border: 1px solid #e5e7eb; background: #f8faf6; }
  :global(.markdown pre code) { background: none; padding: 0; }
  :global(.markdown table) { width: 100%; border-collapse: collapse; margin-bottom: 0.75rem; font-size: 0.85rem; }
  :global(.markdown th), :global(.markdown td) { border: 1px solid #e5e7eb; padding: 0.4rem 0.6rem; text-align: left; }
  :global(.markdown th) { background: #f1f5e9; font-weight: 600; }
  :global(.markdown blockquote) { border-left: 3px solid #3A6A00; padding-left: 0.75rem; margin-left: 0; color: #6b7280; }
  :global(.markdown hr) { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  :global(.markdown img) { max-width: 100%; border-radius: 6px; }
  :global(.markdown strong) { font-weight: 700; }
  :global(.markdown a) { color: #3A6A00; text-decoration: underline; }
</style>
