import type {Directive, DirectiveBinding} from 'vue'

import {useKeyDrawer} from '@/composables/use-key-drawer'

const TITLE = 'What does this mean? — opens the Key'

interface KeyTermEl extends HTMLElement {
  __keyTerm?: {onClick: (e: Event) => void; onKeydown: (e: KeyboardEvent) => void}
}

/**
 * `v-key-term="'assay-level'"` — turns any badge/tag into a deep link into the vocabulary Key drawer.
 * Adds the click + keyboard handlers, ARIA/affordance attributes, and the `.key-term` hover style, so
 * the deep-link behaviour lives in one place rather than being copy-pasted onto every badge. Applies to
 * the root element (works on plain elements and single-root components like MvEvidenceTag).
 *
 * `stopPropagation` keeps a badge click from also triggering an enclosing clickable card.
 */
function bind(el: KeyTermEl, binding: DirectiveBinding<string>) {
  const {open} = useKeyDrawer()
  const term = binding.value

  const onClick = (e: Event) => {
    e.stopPropagation()
    open(term)
  }
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      open(term)
    }
  }

  el.addEventListener('click', onClick)
  el.addEventListener('keydown', onKeydown)
  el.classList.add('key-term')
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  if (!el.getAttribute('title')) el.setAttribute('title', TITLE)
  el.__keyTerm = {onClick, onKeydown}
}

function unbind(el: KeyTermEl) {
  if (!el.__keyTerm) return
  el.removeEventListener('click', el.__keyTerm.onClick)
  el.removeEventListener('keydown', el.__keyTerm.onKeydown)
  delete el.__keyTerm
}

export const vKeyTerm: Directive<KeyTermEl, string> = {
  mounted: bind,
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      unbind(el)
      bind(el, binding)
    }
  },
  unmounted: unbind
}
