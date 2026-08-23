<script lang="ts">
  const CATEGORY_COLORS: Record<string, string> = {
    LOGEMENT: 'bg-green-50 text-green-700 ring-green-200',
    ALIMENTATION: 'bg-orange-50 text-orange-700 ring-orange-200',
    TRANSPORT: 'bg-blue-50 text-blue-700 ring-blue-200',
    SANTE: 'bg-red-50 text-red-700 ring-red-200',
    MOBILE_MONEY: 'bg-purple-50 text-purple-700 ring-purple-200',
    CARBURANT: 'bg-amber-50 text-amber-700 ring-amber-200',
    COMMERCE: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    FRAIS_BANCAIRES: 'bg-gray-50 text-gray-700 ring-gray-200',
    VIREMENTS: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    RETRAITS: 'bg-pink-50 text-pink-700 ring-pink-200',
    DEPOTS: 'bg-teal-50 text-teal-700 ring-teal-200',
    INTERETS: 'bg-lime-50 text-lime-700 ring-lime-200',
    CREDIT: 'bg-rose-50 text-rose-700 ring-rose-200',
    SALAIRE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    DIVERS: 'bg-slate-50 text-slate-700 ring-slate-200',
  };

  let {
    category,
    icon,
    class: className = '',
  }: {
    category: string;
    icon?: any;
    class?: string;
  } = $props();
</script>

<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 {CATEGORY_COLORS[category] ?? 'bg-gray-50 text-gray-700 ring-gray-200'} {className}">
  {#if icon}<icon size={12}></icon>{/if}
  {category}
</span>
