# Styling

## CSS Stack

The project uses three complementary styling systems:

1. **Tailwind CSS 4** — Utility-first CSS via the `@tailwindcss/vite` plugin. Imported in `src/assets/app.css`.
2. **PrimeFlex 3** — Grid system and spacing utilities (`grid`, `col-12`, `col-6`, `flex`, `gap-*`, etc.).
3. **PrimeVue Aura theme** — Component-level theming with custom color overrides.

## Theme Configuration

The PrimeVue theme is customized in `src/main.js`:

- **Primary color**: Dark blue (`#3f51b5`) palette applied across all primary shades (50–950).
- **Button severities**:
  - `primary` — Dark blue (default)
  - `secondary` — Pink (`{pink.400}` through `{pink.600}`)
  - `warn` — Yellow (`{yellow.400}` through `{yellow.600}`) with dark text
- **Dark mode selector**: `.dark-mode` (not currently active)
- **CSS layer**: Disabled (`cssLayer: false`)

## Global Stylesheets

Located in `src/assets/`:

- `app.css` — Tailwind import and global PrimeVue overrides
- `forms.css` — Form-specific styling
- `layout.css` — Layout and structural styles

## Font

The project uses the **Raleway** font via `@fontsource/raleway`.

## Layout Patterns

### Page layout

Screen components wrap their content in `<DefaultLayout>` which provides consistent page chrome (toolbar, footer, content area).

### Grid system

Use PrimeFlex grid classes for responsive layouts:

```html
<div class="grid">
  <div class="col-12 md:col-6">Left column</div>
  <div class="col-12 md:col-6">Right column</div>
</div>
```

### Spacing and utilities

Use Tailwind utility classes for margins, padding, typography, and other styling needs. PrimeFlex utilities (`flex`, `align-items-center`, `justify-content-between`, etc.) are also available.

## Icons

Two icon systems are available:

- **PrimeIcons** — Used with PrimeVue components (`icon="pi pi-check"`)
- **FontAwesome** — Used via `@fortawesome/vue-fontawesome` component for solid, regular, and brand icons

## Styling Guidelines

- Prefer Tailwind utilities for one-off styling.
- Use PrimeFlex grid classes for layout structure.
- Use PrimeVue's built-in component props for component-level styling (e.g., `severity`, `size`, `outlined`).
- Avoid writing custom CSS unless Tailwind/PrimeFlex/PrimeVue cannot achieve the desired result.
- Scoped `<style scoped>` blocks are acceptable for component-specific overrides that cannot be expressed with utility classes.
