<script lang="ts">
  import { X, Info as InfoIcon, FlaskConical, Layers, Brain, Scale, TrendingUp, Hash, Target, Crosshair, BookOpen, ArrowRight, Network, Cpu, MessageSquare, FileText } from '@lucide/svelte';

  let {
    open,
    onclose,
    section = 'classifier',
  }: {
    open: boolean;
    onclose: () => void;
    section?: string;
  } = $props();

  const sections: Record<string, {
    title: string;
    intro: string;
    pipeline?: string;
    items: { icon: any; label: string; text: string }[];
  }> = {
    classifier: {
      title: 'Classifieur de transactions',
      intro: 'Le classifieur est le module qui détermine automatiquement la catégorie (LOGEMENT, ALIMENTATION, TRANSPORT...) de chaque transaction bancaire à partir de sa description textuelle (ex: "VIREMENT SALAIRE", "PAIEMENT CB CARREFOUR").',
      pipeline: 'Description SMS/transaction → Exact Match → Fuse.js (fuzzy) → Embedding (cosinus) → Bayes → Catégorie finale + Score de confiance',
      items: [
        { icon: Hash, label: 'Exact', text: "Recherche textuelle stricte : si la description contient un mot-clé connu (ex: 'LOYER'), la catégorie est trouvée immédiatement. Score fixe = 10. C'est la méthode prioritaire : si un match exact est trouvé, les autres méthodes ne sont pas consultées." },
        { icon: Scale, label: 'Fuse.js (Fuzzy)', text: 'Correspondance approximative : tolère les fautes de frappe et variations orthographiques. Score sur 10 — plus le score est élevé, meilleure est la correspondance. Un score ≥ 4 est considéré comme fiable.' },
        { icon: Layers, label: 'Embedding (Vecteur)', text: "Similarité cosinus entre le vecteur de la description et les centroïdes de chaque catégorie. Score entre 0 (différent) et 1 (identique). Un score > 0.5 est bon, > 0.7 est excellent. Utilise le fichier fastText cc.fr.300.vec (300 dimensions)." },
        { icon: Brain, label: 'Bayes', text: "Classifieur probabiliste Naïve Bayes entraîné sur les mots-clés. Pas de score numérique — il retourne directement la catégorie la plus probable. Utilisé en dernier recours si les 3 premières méthodes n'ont pas trouvé de résultat." },
        { icon: Crosshair, label: 'Vainqueur', text: "Ordre de priorité : Exact > Fuse.js > Embedding > Bayes > DIVERS. La première méthode qui trouve un résultat fiable gagne. Si aucune méthode ne trouve de résultat, la catégorie par défaut est DIVERS." },
        { icon: FileText, label: "Rôle dans le système", text: "Le classifieur est utilisé en amont de toute l'analyse financière. Sans classification correcte, les moteurs de dépenses, revenus, dettes et épargne ne peuvent pas produire des résultats fiables. Il est aussi utilisé pour filtrer les SMS bancaires entrants." },
      ],
    },
    embedding: {
      title: 'Module Embeddings (NLP)',
      intro: "Les embeddings transforment les descriptions textuelles en vecteurs numériques (300 dimensions) que l'ordinateur peut comparer mathématiquement. Ce module charge le fichier fastText français (cc.fr.300.vec), construit des centroïdes par catégorie, et permet la recherche sémantique.",
      pipeline: 'Fichier .vec (fastText) → Chargement en mémoire (50k mots) → Construction des centroïdes par catégorie → Vectorisation des descriptions → Similarité cosinus → Classification sémantique',
      items: [
        { icon: BookOpen, label: 'Vocabulaire', text: 'Nombre de mots chargés depuis le fichier cc.fr.300.vec (fastText). Limité à 50 000 mots les plus fréquents pour économiser la mémoire (~60 Mo au lieu de 2.4 Go). Chaque mot est représenté par un vecteur de 300 nombres.' },
        { icon: Target, label: 'Centroïdes', text: "Chaque catégorie (LOGEMENT, ALIMENTATION…) a un centroïde = moyenne des vecteurs de tous ses mots-clés. La classification cosinus compare la description à chaque centroïde. Plus la description est proche d'un centroïde, plus la catégorie est probable." },
        { icon: TrendingUp, label: 'Score cosinus', text: "Mesure de similarité entre deux vecteurs : 1 = identique, 0 = orthogonal (aucun rapport), -1 = opposé. Un mot comme 'loyer' aura 0.95 avec LOGEMENT et 0.10 avec SANTÉ. C'est le cœur de la classification sémantique." },
        { icon: Hash, label: 'Mots-clés trouvés / Total', text: "Exemple : 6/24 signifie que 6 mots-clés de la catégorie LOGEMENT sur 24 ont été trouvés dans le fichier .vec. Si le ratio est faible, les embeddings de ces mots ne sont pas disponibles et la classification sémantique sera moins précise pour cette catégorie." },
        { icon: Network, label: 'Rôle dans le système', text: "Les embeddings sont utilisés par le classifieur (méthode Embedding), par le moteur matriciel 2 couches (pour enrichir le vecteur contexte avec 300 dimensions NLP), et par la recherche sémantique de cette page. Sans embeddings, la classification se limite aux mots exacts et au fuzzy matching." },
      ],
    },
    training: {
      title: "Entraînement de la matrice d'intentions",
      intro: "Ce module permet d'ajuster automatiquement les poids de la matrice 21×17 (features × intentions) utilisée par le ScoringEngine pour générer les alertes et conseils financiers. L'entraînement utilise la descente de gradient pour minimiser l'erreur entre les scores calculés et les intentions attendues.",
      pipeline: 'Données d\'entraînement (exemples) → Forward pass (vecteur × matrice) → Calcul de la loss (marge) → Backward pass (ajustement des poids) → Nouvelle matrice → Évaluation (accuracy, matrice de confusion)',
      items: [
        { icon: TrendingUp, label: 'Époques', text: "Nombre de passages complets sur toutes les données d'entraînement. Plus il y a d'époques, plus la matrice apprend, mais risque de surapprentissage au-delà de 500. L'accuracy finale devrait se stabiliser après 100-200 époques." },
        { icon: Scale, label: 'Learning rate (lr)', text: "Vitesse d'apprentissage : 0.01 est une valeur sûre. Trop élevé (≥ 0.1) → la loss oscille et ne converge pas. Trop faible (≤ 0.0001) → apprentissage très lent, risque de rester bloqué dans un minimum local." },
        { icon: Layers, label: 'Couches', text: "1 couche = modèle linéaire simple (21 features → 17 intentions). 2 couches = réseau avec 32 neurones cachés + embeddings NLP 300D (321 features → 32 → 17). Le modèle 2 couches est plus puissant mais nécessite plus de données d'entraînement." },
        { icon: Target, label: 'Loss (perte)', text: "Erreur d'entraînement (margin loss) : doit diminuer au fil des époques et se stabiliser près de 0. Si elle augmente ou oscille, le learning rate est trop élevé. Si elle stagne trop haut, le modèle n'arrive pas à apprendre." },
        { icon: Crosshair, label: 'Accuracy', text: "Précision : pourcentage de bonnes classifications. Accuracy = la bonne intention est en 1ʳᵉ position. Top-3 = la bonne intention est dans les 3 premières. Une accuracy ≥ 90% est considérée comme un bon modèle." },
        { icon: Hash, label: 'Marge (margin)', text: "Paramètre de la loss function : plus la marge est grande, plus le modèle doit être confiant pour considérer une prédiction comme correcte. Valeur par défaut : 0.5. Une marge trop grande (≥ 1) rend l'entraînement difficile, trop petite (≤ 0.1) rend le modèle peu sûr de ses prédictions." },
        { icon: Cpu, label: 'Rôle dans le système', text: "La matrice entraînée est utilisée par le ScoringEngine (MatrixInterpreterEngine) pour générer des alertes et conseils personnalisés (LOGEMENT_CRITICAL, ALIMENTATION_SPIKE, GOOD_HABIT…). Sans entraînement, la matrice utilise des poids par défaut qui fonctionnent mais peuvent être optimisés avec des données réelles." },
      ],
    },
  };

  let current = $derived(sections[section] ?? sections.classifier);
</script>

<svelte:body class:overflow-hidden={open} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<button
  aria-label="Fermer"
  class="fixed inset-0 bg-black/30 z-40 transition-opacity cursor-default"
  class:pointer-events-auto={open}
  class:opacity-100={open}
  class:opacity-0={!open}
  class:pointer-events-none={!open}
  onclick={onclose}
></button>

<aside
  class="fixed top-0 right-0 h-full w-full max-w-xl bg-surface z-50 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col"
  class:translate-x-0={open}
  class:translate-x-full={!open}
>
  <header class="flex items-center justify-between px-6 h-16 border-b border-mint-subtle shrink-0">
    <div class="flex items-center gap-2">
      <InfoIcon size={20} class="text-primary" />
      <h2 class="text-lg font-bold text-on-surface">{current.title}</h2>
    </div>
    <button
      onclick={onclose}
      class="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-all cursor-pointer"
    >
      <X size={20} />
    </button>
  </header>

  <div class="flex-1 overflow-y-auto p-6">
    <div class="space-y-5">
      <!-- Section intro : description fonctionnelle du module -->
      <div class="bg-primary-container/30 border border-primary/20 rounded-2xl p-5">
        <p class="text-sm text-on-surface leading-relaxed">{current.intro}</p>
        {#if current.pipeline}
          <div class="mt-4 flex items-start gap-2">
            <ArrowRight size={16} class="text-primary shrink-0 mt-0.5" />
            <div class="text-xs text-on-surface-variant leading-relaxed">
              <span class="font-semibold text-on-surface">Pipeline :</span> {current.pipeline}
            </div>
          </div>
        {/if}
      </div>

      <!-- Items explicatifs -->
      {#each current.items as item}
        <div class="flex gap-4">
          <div class="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 mt-0.5">
            <item.icon size={20} />
          </div>
          <div>
            <h3 class="text-sm font-bold text-on-surface mb-1">{item.label}</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">{item.text}</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</aside>
