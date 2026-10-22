---
paths:
  - src/components/**
  - src/assets/**
  - src/main.js
---

# Styling

- Style with Tailwind utilities and PrimeVue props first. A `<style scoped>` block is for what neither can express.
- Buttons are PrimeVue `<Button>` with a `severity`. No custom button classes.
- Cards use `.mave-card`, the one card frame used site-wide.
- Colors come from the tokens in the `@theme` block of `src/assets/app.css`. The brand palettes are also defined in `main.js` for PrimeVue; change both together (the sync table is in `app.css`).
- `--color-sage` fails WCAG AA as text. Use `--color-sage-strong` for sage text and links.
- Raleway's package index ships only weight 400. Import each weight explicitly in `MvLayout.vue`, or the browser synthesizes it.
