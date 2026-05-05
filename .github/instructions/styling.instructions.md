# Styling

## CSS Stack

The project uses two complementary styling systems:

1. **Tailwind CSS 4** — Utility-first CSS via the `@tailwindcss/vite` plugin. Imported in `src/assets/app.css`.
2. **PrimeVue Aura theme** — Component-level theming with custom color overrides.

## Design Tokens

Design tokens are defined in `src/assets/app.css` inside a `@theme` block and are available as both CSS custom properties and Tailwind utility classes. The brand color palettes are also generated as PrimeVue palettes in `src/main.js` — see the sync table in `app.css` for the mapping.

Key tokens:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-sage` | `#78b793` | Primary brand color (PrimeVue: `sagePalette`) |
| `--color-sage-dark` | `#5a9375` | Hover state for sage |
| `--color-mint` | `#a1d8c8` | Accent backgrounds |
| `--color-orange-cta` | `#f8971d` | Warn/CTA actions (PrimeVue: `orangePalette`) |
| `--color-danger` | `#D05353` | Destructive actions (PrimeVue: `dangerPalette`) |
| `--color-info` | `#4A80C4` | Informational actions (PrimeVue: `infoPalette`) |
| `--color-help` | `#7E5DAF` | Contextual help (PrimeVue: `helpPalette`) |
| `--color-text-primary` | `#333` | Body text |
| `--color-text-muted` | `#767676` | Secondary/muted text |
| `--color-border` | `#dee2e6` | Default borders |
| `--color-bg` | `#f7f7f7` | Page background |

## Theme Configuration

The PrimeVue theme is customized in `src/main.js` using `definePreset(Aura, ...)`:

- **Primary color**: Sage (`#78b793`) palette applied across all primary shades (50–950).
- **Button severities** (all themed via the preset):
  - `primary` — Sage green (default)
  - `secondary` — Surface grays
  - `success` — Sage green (same as primary, for save/confirm)
  - `info` — Blue (`#4A80C4`)
  - `warn` — Orange (`#f8971d`) with dark text
  - `danger` — Red (`#D05353`)
  - `help` — Purple (`#7E5DAF`)
- **Dark mode selector**: `.dark-mode` (not currently active)
- **CSS layer**: Disabled (`cssLayer: false`)

### Button styling

All buttons must use PrimeVue `<Button>` with the `severity` prop for color. Do not use custom CSS button classes — use PrimeVue's severity system exclusively. Combine with `size="small"`, `text`, `outlined`, or `rounded` props for variants.

## Global Stylesheets

Located in `src/assets/`:

- `app.css` — Tailwind import, design tokens, base styles, and global PrimeVue overrides
- `layout.css` — Legacy layout styles (screen title bars, help tooltips, etc.)

## Fonts

- **Body**: Raleway (`@fontsource/raleway`)
- **Display/Headings**: Exo 2 (`@fontsource/exo-2`, weights 700/800/900)

## Layout Patterns

### Page layout

Screen components wrap their content in `<MvLayout>` which provides consistent page chrome (nav bar, footer, content area with 1200px max-width). The `#header` slot is used for page-level title bars.

### Creator pages (wizard layout)

Creator pages use PrimeVue `Stepper` with a two-column wizard layout:
- **Container**: `.wizard-form` with gray background (`#f7f7f7`) and a white content column overlay (`.wizard-form-content-bg`, 676px wide)
- **Rows**: `.wizard-row` (flex) containing `.wizard-help` (480px, help text) and `.wizard-field` (flex: 1, white background, form inputs)
- Form section components support `wizardMode` prop to render their fields inside this layout
- Step navigation controls appear below the wizard form on a gray background

### Editor pages (card layout)

Editor pages use stacked cards at `max-w-[1000px]`:
- **Page header**: MvLayout `#header` slot with title, URN, and action buttons
- **Cards**: `.editor-card` — white background, rounded border, 22px/24px padding, with a 3px gradient top accent (sage → mint → yellow → orange)
- Form section components render in flat mode (no `wizardMode` prop) inside cards

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
