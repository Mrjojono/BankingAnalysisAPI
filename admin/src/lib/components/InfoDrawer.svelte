<script lang="ts">
  import { X, Info as InfoIcon, FlaskConical, Layers, Brain, Scale, TrendingUp, Hash, Target, Crosshair, BookOpen } from '@lucide/svelte';

  let {
    open,
    onclose,
    section = 'classifier',
  }: {
    open: boolean;
    onclose: () => void;
    section?: string;
  } = $props();

  const sections: Record<string, { title: string; items: { icon: any; label: string; text: string }[] }> = {
    classifier: {
      title: 'Comment fonctionne le classifieur',
      items: [
        { icon: Hash, label: 'Exact', text: "Recherche textuelle stricte : si la description contient un mot-clé connu (ex: 'LOYER'), la catégorie est trouvée immédiatement. Score fixe = 10." },
        { icon: Scale, label: 'Fuse.js (Fuzzy)', text: 'Correspondance approximative : tolère les fautes de frappe et variations. Score sur 10 — plus le score est élevé, meilleure est la correspondance. Un score ≥ 4 est considéré comme fiable.' },
        { icon: Layers, label: 'Embedding (Vecteur)', text: "Similarité cosinus entre le vecteur de la description et les centroïds de chaque catégorie. Score entre 0 (différent) et 1 (identique). Un score > 0.5 est bon, > 0.7 est excellent." },
        { icon: Brain, label: 'Bayes', text: "Classifieur probabiliste Naïve Bayes entraîné sur les mots-clés. Pas de score numérique — il retourne directement la catégorie la plus probable." },
        { icon: Crosshair, label: 'Vainqueur', text: "Ordre de priorité : Exact > Fuse.js > Embedding > Bayes > DIVERS. La première méthode qui trouve un résultat gagne." },
      ],
    },
    embedding: {
      title: 'Comment fonctionne le module Embeddings',
      items: [
        { icon: BookOpen, label: 'Vocabulaire', text: 'Nombre de mots chargés depuis le fichier cc.fr.300.vec (fastText). Limité à 50 000 mots les plus fréquents pour économiser la mémoire (~60 Mo au lieu de 2.4 Go).' },
        { icon: Target, label: 'Centroïdes', text: "Chaque catégorie (LOGEMENT, ALIMENTATION…) a un centroïde = moyenne des vecteurs de tous ses mots-clés. La classification cosine compare la description à chaque centroïde." },
        { icon: TrendingUp, label: 'Score cosinus', text: "Mesure de similarité entre deux vecteurs : 1 = identique, 0 = orthogonal (aucun rapport), -1 = opposé. Un mot comme 'loyer' aura 0.95 avec LOGEMENT et 0.10 avec SANTE." },
        { icon: Hash, label: 'Mots-clés trouvés / Total', text: "Exemple : 6/24 signifie que 6 mots-clés de la catégorie LOGEMENT sur 24 ont été trouvés dans le fichier .vec. Si le ratio est faible, les embeddings de ces mots ne sont pas disponibles." },
      ],
    },
    training: {
      title: "Comment fonctionne l'entraînement",
      items: [
        { icon: TrendingUp, label: 'Époques', text: "Nombre de passages complets sur toutes les données d'entraînement. Plus il y a d'époques, plus la matrice apprend, mais risque de surapprentissage au-delà de 500." },
        { icon: Scale, label: 'Learning rate (lr)', text: "Vitesse d'apprentissage : 0.01 est une valeur sûre. Trop élevé (≥ 0.1) → instable. Trop faible (≤ 0.0001) → très lent." },
        { icon: Layers, label: 'Couches', text: "1 couche = modèle linéaire simple (21 features → 17 intentions). 2 couches = réseau avec 32 neurones cachés + embeddings 300D (321 features → 32 → 17). Plus puissant mais nécessite plus de données." },
        { icon: Target, label: 'Loss (perte)', text: "Erreur d'entraînement : doit diminuer au fil des époques. Si elle augmente ou oscille, le learning rate est trop élevé." },
        { icon: Crosshair, label: 'Accuracy', text: "Précision : pourcentage de bonnes classifications. Accuracy = la bonne intention est en 1ère position. Top-3 = la bonne intention est dans les 3 premières." },
        { icon: Hash, label: 'Marge (margin)', text: "Paramètre de la loss function : plus la marge est grande, plus le modèle doit être confiant pour considérer une prédiction comme correcte. Valeur par défaut : 0.5." },
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
