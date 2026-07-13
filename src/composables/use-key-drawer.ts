import {ref} from 'vue'

/** One defined term shown in the Key drawer. `class` styles the term chip (e.g. to match its badge). */
export interface KeyTerm {
  label: string
  definition: string
  class?: string
}

/**
 * A titled group of related terms. `id` is the deep-link anchor: a badge opens the drawer with
 * `open(id)` and the drawer scrolls to `#key-<id>` and flashes it. `docsUrl` optionally overrides the
 * drawer-level docs link for this section's "more →".
 */
export interface KeySection {
  id: string
  title: string
  gloss?: string
  terms: KeyTerm[]
  docsUrl?: string
}

/**
 * Module-level singleton driving the vocabulary "Key" drawer. Any component can call `open(term)` to
 * surface a definition without threading props/events through the page — the drawer itself is mounted
 * once at the variant-page root and reads this shared state. `activeTerm` is the anchor id the drawer
 * scrolls to and briefly highlights on open; passing nothing opens it at the top.
 *
 * Deliberately global rather than provide/inject: the trigger (control header) and the deep-linking
 * badges (measurement cards, per-level annotations) live in unrelated subtrees, and there is only ever
 * one Key drawer on screen.
 */
const isOpen = ref(false)
const activeTerm = ref<string | null>(null)

export function useKeyDrawer() {
  function open(term?: string) {
    activeTerm.value = term ?? null
    isOpen.value = true
  }
  function close() {
    isOpen.value = false
  }
  return {isOpen, activeTerm, open, close}
}
