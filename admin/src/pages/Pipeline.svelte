<script lang="ts">
  import { Settings, Zap, RefreshCw, BarChart2 } from '@lucide/svelte';
</script>

<div class="space-y-6">
  <header class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-on-surface">Pipeline d'analyse</h1>
      <p class="text-on-surface-variant mt-1">Configuration et monitoring du pipeline SMS (Regex + CamemBERT)</p>
    </div>
  </header>

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    <article class="bg-surface border border-mint-subtle rounded-2xl p-6 hover:border-primary/50 transition-colors">
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Settings size={24} class="text-primary" />
      </div>
      <h3 class="text-lg font-semibold text-on-surface mb-1">Configuration</h3>
      <p class="text-on-surface-variant text-sm">Activer/désactiver Regex, CamemBERT, seuil de confiance</p>
    </article>

    <article class="bg-surface border border-mint-subtle rounded-2xl p-6 hover:border-primary/50 transition-colors">
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Zap size={24} class="text-primary" />
      </div>
      <h3 class="text-lg font-semibold text-on-surface mb-1">Statistiques temps réel</h3>
      <p class="text-on-surface-variant text-sm">Volume, latence, taux d'erreur, distribution des classes</p>
    </article>

    <article class="bg-surface border border-mint-subtle rounded-2xl p-6 hover:border-primary/50 transition-colors">
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <RefreshCw size={24} class="text-primary" />
      </div>
      <h3 class="text-lg font-semibold text-on-surface mb-1">Réentraînement</h3>
      <p class="text-on-surface-variant text-sm">Lancer un entraînement, suivre les logs, déployer le modèle</p>
    </article>

    <article class="bg-surface border border-mint-subtle rounded-2xl p-6 hover:border-primary/50 transition-colors md:col-span-2 lg:col-span-3">
      <div class="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <BarChart2 size={24} class="text-primary" />
      </div>
      <h3 class="text-lg font-semibold text-on-surface mb-1">Analyse & Monitoring</h3>
      <p class="text-on-surface-variant text-sm">Drift, matrice de confusion, exemples mal classés, données d'entraînement</p>
    </article>
  </div>

  <div class="bg-surface-container-low border border-mint-subtle rounded-2xl p-6">
    <p class="text-on-surface-variant text-center">
      <em>Page en construction — Task 8 implémentera l'interface complète</em>
    </p>
  </div>
</div>