<script lang="ts">
  let {
    onclick,
    disabled = false,
    variant = 'primary',
    size = 'md',
    class: className = '',
    children,
  }: {
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    children?: import('svelte').Snippet;
  } = $props();

  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all cursor-pointer border-none';

  const variants: Record<string, string> = {
    primary: 'bg-primary text-white hover:bg-[#2d5200] disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-surface-container text-on-surface hover:bg-surface-container-low border border-mint-subtle disabled:opacity-50 disabled:cursor-not-allowed',
    danger: 'bg-error text-white hover:bg-[#a01515] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost: 'text-on-surface-variant hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
</script>

<button {onclick} {disabled} class="{base} {variants[variant]} {sizes[size]} {className}">
  {@render children?.()}
</button>
