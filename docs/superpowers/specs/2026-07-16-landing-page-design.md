# Landing Page Design — Orabank

## Stack
- Svelte 5 (runes) + Tailwind CSS v4
- Mêmes tokens que l'admin : `--color-primary: #3a6a00`, `--color-background: #f6fbef`, etc.
- Animations : Intersection Observer (count-up, reveal) + CSS transitions

## Architecture
- Landing décomposée en composants dans `admin/src/lib/components/landing/`
- App.svelte : nouvel état `showLogin` — si `!auth.user && !showLogin` → Landing ; si `showLogin` → Login
- Organic shapes : SVG blobs décoratifs entre les sections
- Glassmorphism : `backdrop-blur-xl bg-white/10` sur la nav et certaines cards
- Couleurs : palette admin + touches `#9fe35d` (primary-container) et accents chauds (`#d4a373` ou `#e6b87d`)

## Sections

### 1. Hero — "The Scoreboard"
- Fond `#3a6a00`, padding vertical massif (py-32+)
- Organic blob déco en fond (SVG vert clair, flou, position absolute)
- Nav fixe glass (backdrop-blur-xl bg-primary/80) qui devient opaque au scroll
- Logo "ORABANK" à gauche, bouton "Se connecter" à droite (glass outline)
- Grand compteur animé : 0 → 742 (requestAnimationFrame)
- Tagline h1 : "Votre santé financière en temps réel"
- Sous-titre : "Score crédit, éligibilité, conseils IA — tout en un."
- Chevron animé en bas

### 2. Problème → Solution
- Fond blanc, split colonnes
- Gauche : texte editorial, phrase choc
- Droite : stat clé en gros chiffre animé
- Organic divider wave entre hero et cette section

### 3. Fonctionnalités — Dashboard Live
- Fond `#f6fbef`, glass cards avec bordure subtile
- 3 cards : Score (jauge SVG), Éligibilité (barre), Conseils IA (timeline)
- Hover : lift + shadow augmentée

### 4. App Preview — Cinématique
- Fond `#ebf0e4`, mockup téléphone avec glass effect
- Carousel screenshots, parallax léger
- Organic blob en arrière-plan

### 5. Pourquoi Orabank
- Fond blanc / `#f0f5e9` alterné, glass cards
- 3 valeurs avec stagger scroll reveal

### 6. CTA Final
- Fond `#3a6a00`, organic blobs, bouton glass blanc
- Phrase impactante

## Animations
- Counter, count-up, jauge SVG, parallax, scroll reveal, stagger, chevron bounce

## Fichiers
- `admin/src/pages/Landing.svelte`
- `admin/src/lib/components/landing/Hero.svelte`
- `admin/src/lib/components/landing/Features.svelte`
- `admin/src/lib/components/landing/AppPreview.svelte`
- `admin/src/lib/components/landing/WhySection.svelte`
- `admin/src/lib/components/landing/CTASection.svelte`
- `admin/src/lib/components/landing/ScrollReveal.svelte`
- `admin/src/App.svelte` (modifié)
