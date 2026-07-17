<template>
  <Transition name="key-drawer">
    <!-- Non-modal: this drawer is intentionally non-modal so the page stays fully interactive while the Key is open.
         Closes on ✕ or Esc only (never on outside click) so a reader can keep it open while scanning. -->
    <!-- Sits below the sticky global nav (var(--nav-height), z-100) so its close button isn't obscured and
         the nav stays usable. Mobile: a floating pop-out card under the nav (base classes). Tablet+: a
         full-height side drawer anchored right (tablet: overrides). -->
    <aside
      v-if="drawer.isOpen.value"
      :aria-label="`${title}: what these terms mean`"
      class="fixed inset-x-4 top-[var(--nav-height)] z-40 mt-3 flex max-h-[75vh] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_12px_32px_-8px_rgba(0,0,0,0.3)] tablet:inset-x-auto tablet:bottom-0 tablet:left-auto tablet:right-0 tablet:mt-0 tablet:max-h-none tablet:w-[360px] tablet:max-w-[90vw] tablet:rounded-none tablet:border-y-0 tablet:border-r-0 tablet:shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.25)]"
      role="complementary"
    >
      <!-- Header -->
      <div
        class="mave-gradient-bar relative flex items-center gap-2 overflow-hidden border-b border-border px-5 py-3.5"
      >
        <i class="pi pi-key text-sm text-sage" />
        <span class="text-sm font-bold uppercase tracking-[0.5px] text-text-primary">{{ title }}</span>
        <button
          :aria-label="`Close ${title.toLowerCase()}`"
          class="ml-auto flex cursor-pointer items-center justify-center rounded-full border-none bg-transparent p-1 text-text-muted hover:bg-border-light hover:text-text-primary"
          type="button"
          @click="drawer.close()"
        >
          <i class="pi pi-times text-sm" />
        </button>
      </div>

      <!-- Definitions -->
      <div ref="scroller" class="flex-1 overflow-y-auto px-5 py-4">
        <section
          v-for="section in sections"
          :id="`key-${section.id}`"
          :key="section.id"
          class="scroll-mt-4 border-b border-border-light py-3 first:pt-0 last:border-b-0"
          :class="{'key-flash': highlighted === section.id}"
        >
          <h3 class="mb-1 text-xs-minus font-bold uppercase tracking-[0.5px] text-black">{{ section.title }}</h3>
          <p v-if="section.gloss" class="mb-2 text-xs-plus leading-snug text-text-secondary">{{ section.gloss }}</p>
          <dl class="flex flex-col gap-1.5">
            <div v-for="term in section.terms" :key="term.label" class="flex flex-col gap-0.5">
              <dt>
                <span
                  class="inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
                  :class="term.class ?? 'bg-border-light text-text-muted'"
                  >{{ term.label }}</span
                >
              </dt>
              <dd class="text-xs-plus leading-snug text-text-secondary">{{ term.definition }}</dd>
            </div>
          </dl>
          <a
            v-if="section.docsUrl ?? docsUrl"
            class="mt-2 inline-flex items-center gap-1 cursor-pointer text-xs font-semibold text-link hover:underline"
            :href="section.docsUrl ?? docsUrl"
            rel="noopener noreferrer"
            target="_blank"
            >more <i class="pi pi-arrow-right"
          /></a>
        </section>
      </div>
    </aside>
  </Transition>
</template>

<script lang="ts">
import {defineComponent, nextTick} from 'vue'

import {useKeyDrawer} from '@/composables/use-key-drawer'
import {GLOSSARY_DOCS_URL, GLOSSARY_SECTIONS} from '@/glossary'

/**
 * Vocabulary "Key" drawer — non-modal, right-side (mobile: pop-out card). Mounted once at the app root
 * so it's reachable from any screen. Opened from a trigger or deep-linked from any badge via the shared
 * {@link useKeyDrawer} singleton (or the `v-key-term` directive). On a deep link it scrolls the target
 * section into view and flashes it. Closes only on ✕ or Esc, so it can stay open while the reader scans.
 */
export default defineComponent({
  name: 'MvKeyDrawer',

  props: {
    /** Header label (and the noun in the close button's aria-label). */
    title: {type: String, default: 'Key'}
  },

  setup() {
    return {drawer: useKeyDrawer(), sections: GLOSSARY_SECTIONS, docsUrl: GLOSSARY_DOCS_URL}
  },

  data() {
    return {highlighted: null as string | null, flashTimer: undefined as ReturnType<typeof setTimeout> | undefined}
  },

  watch: {
    'drawer.isOpen.value'(open: boolean) {
      if (open) {
        window.addEventListener('keydown', this.onKeydown)
        void this.scrollToActiveTerm()
      } else {
        window.removeEventListener('keydown', this.onKeydown)
      }
    }
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKeydown)
    if (this.flashTimer) clearTimeout(this.flashTimer)
  },

  methods: {
    onKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') this.drawer.close()
    },
    async scrollToActiveTerm() {
      const term = this.drawer.activeTerm.value
      await nextTick()
      const scroller = this.$refs.scroller as HTMLElement | undefined
      if (!term || !scroller) {
        if (scroller) scroller.scrollTop = 0
        return
      }
      const el = scroller.querySelector<HTMLElement>(`#key-${term}`)
      if (!el) return
      el.scrollIntoView({block: 'start', behavior: 'smooth'})
      this.highlighted = term
      if (this.flashTimer) clearTimeout(this.flashTimer)
      this.flashTimer = setTimeout(() => (this.highlighted = null), 1600)
    }
  }
})
</script>

<style scoped>
/* Mobile: pop-out card (fade + slight rise). */
.key-drawer-enter-active,
.key-drawer-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.key-drawer-enter-from,
.key-drawer-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

/* Tablet+: slide-in drawer from the right (breakpoint matches --breakpoint-tablet). */
@media (min-width: 56rem) {
  .key-drawer-enter-active,
  .key-drawer-leave-active {
    transition: transform 0.2s ease;
  }
  .key-drawer-enter-from,
  .key-drawer-leave-to {
    opacity: 1;
    transform: translateX(100%);
  }
}

/* Transient highlight when a badge deep-links to a section. */
.key-flash {
  animation: key-flash 1.6s ease;
}
@keyframes key-flash {
  0%,
  40% {
    background: var(--color-sage-light, rgba(122, 158, 126, 0.18));
  }
  100% {
    background: transparent;
  }
}
</style>
