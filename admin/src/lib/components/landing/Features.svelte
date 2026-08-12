<script lang="ts">
  import { Gauge, ShieldCheck, Lightbulb, GraduationCap, PiggyBank, Smartphone } from '@lucide/svelte';

  const features = [
    {
      icon: Gauge,
      title: 'Score financier 360°',
      desc: 'Une évaluation objective de votre situation, calculée à partir de vos revenus, dépenses, dettes et épargne.',
    },
    {
      icon: ShieldCheck,
      title: 'Éligibilité instantanée',
      desc: 'Découvrez en un clic les produits bancaires auxquels vous pouvez prétendre, et ce qu\'il faut améliorer.',
    },
    {
      icon: Lightbulb,
      title: 'Conseils personnalisés',
      desc: 'Des recommandations concrètes pour épargner, réduire vos dépenses et progresser en toute autonomie.',
    },
    {
      icon: GraduationCap,
      title: 'Éducation financière',
      desc: 'Des leçons courtes et des quiz pour maîtriser les fondamentaux : épargne, crédit, budget, dettes.',
    },
    {
      icon: PiggyBank,
      title: 'Objectifs d\'épargne',
      desc: 'Fixez un objectif, suivez votre progression mois par mois et restez motivé avec des rappels.',
    },
    {
      icon: Smartphone,
      title: 'Analyse SMS & Mobile Money',
      desc: 'Vos transactions T-Money et Flooz sont analysées automatiquement pour un profil complet, même sans relevé.',
    },
  ];
</script>

<section id="fonctionnalites" class="py-24 bg-surface-container-low scroll-mt-20">
  <div class="max-w-6xl mx-auto px-6">
    <div class="text-center mb-16 max-w-2xl mx-auto">
      <p class="text-xs font-semibold text-primary uppercase tracking-[0.3em] mb-4">Fonctionnalités</p>
      <h2 class="text-3xl md:text-4xl font-medium text-on-surface tracking-tight" style="font-family: 'Playfair Display', serif">
        Tout ce qu'il faut pour comprendre<br />et améliorer votre crédit
      </h2>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each features as feature}
        <div class="bg-white rounded-2xl border border-mint-subtle p-8 transition-all duration-300 hover:shadow-[0_20px_45px_-25px_rgba(58,106,0,0.35)] hover:-translate-y-0.5">
          <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
            <feature.icon size={22} class="text-primary" />
          </div>
          <h3 class="text-lg font-bold text-on-surface mb-2">{feature.title}</h3>
          <p class="text-sm text-on-surface-variant leading-relaxed">{feature.desc}</p>
        </div>
      {/each}
    </div>
  </div>
</section>
