# Styling

## CSS Stack

The project uses two complementary styling systems:

1. **Tailwind CSS 4** — Utility-first CSS via the `@tailwindcss/vite` plugin. Imported in `src/assets/app.css`.
2. **PrimeVue Aura theme** — Component-level theming with custom color overrides.

## Design Tokens

Design tokens are defined in `src/assets/app.css` inside a `@theme` block and are available as both CSS custom properties and Tailwind utility classes:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-sage` | `#78b793` | Primary brand color |
| `--color-sage-dark` | `#5a9375` | Hover state for sage |
| `--color-sage-light` | `#c8e4c6` | Light green backgrounds |
| `--color-mint` | `#a1d8c8` | Accent backgrounds |
| `--color-orange-cta` | `#f8971d` | Call-to-action buttons |
| `--color-text-primary` | `#333` | Body text |
| `--color-text-muted` | `#767676` | Secondary/muted text |
| `--color-border` | `#dee2e6` | Default borders |
| `--color-bg` | `#f7f7f7` | Page background |

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

- `app.css` — Tailwind import, design tokens, base styles, and global PrimeVue overrides
- `forms.css` — Form-specific styling
- `layout.css` — Legacy layout styles (screen title bars, help tooltips, etc.)

## Fonts

- **Body**: Raleway (`@fontsource/raleway`)
- **Display/Headings**: Exo 2 (`@fontsource/exo-2`, weights 700/800/900)

## Layout Patterns

### Page layout

Screen components wrap their content in `<MvLayout>` which provides consistent page chrome (nav bar, footer, content area with 1200px max-width).

### Spacing and utilities

Use Tailwind utility classes for layout, margins, padding, typography, and other styling needs.

## Icons

Two icon systems are available:

- **PrimeIcons** — Used with PrimeVue components (`icon="pi pi-check"`)
- **FontAwesome** — Used via `@fortawesome/vue-fontawesome` component for solid, regular, and brand icons. All icons from `@fortawesome/free-solid-svg-icons`, `@fortawesome/free-regular-svg-icons`, and `@fortawesome/free-brands-svg-icons` are registered globally in `main.js`. Usage: `<FontAwesomeIcon icon="fa-solid fa-gear" />`

## Styling Guidelines

- Prefer Tailwind utilities for one-off styling.
- Use PrimeVue's built-in component props for component-level styling (e.g., `severity`, `size`, `outlined`).
- Avoid writing custom CSS unless Tailwind/PrimeVue cannot achieve the desired result.
- Scoped `<style scoped>` blocks are acceptable for component-specific overrides that cannot be expressed with utility classes.
