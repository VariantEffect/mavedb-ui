<template>
  <section class="mave-card overflow-hidden">
    <header
      class="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border-light px-4 py-2 tablet:px-5"
    >
      <h3 class="mave-section-title !mb-0">{{ title }}</h3>
      <span v-if="$slots.meta" class="text-xs-minus text-text-muted"><slot name="meta" /></span>
      <div v-if="$slots.actions" class="ml-auto flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <slot name="actions" />
      </div>
    </header>
    <!-- Inset rather than full-bleed, so the card's frame reads as one continuous surface. -->
    <div v-if="$slots.notice" class="px-4 pt-3 tablet:px-5" :class="{'pb-1': !padded}">
      <div class="flex items-start gap-2 rounded-md bg-convergent-light px-3 py-2 text-sm text-text-secondary">
        <i class="pi pi-info-circle mt-0.5 text-xs text-convergent" />
        <div><slot name="notice" /></div>
      </div>
    </div>
    <div :class="padded ? 'px-4 py-3 tablet:px-5' : ''"><slot /></div>
  </section>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

/**
 * A titled page card: a title band, an optional caution band, then the body. The variant and score-set pages build
 * their cards from it so borders, rules, and insets stay identical. Tables pass `padded: false` and inset their own
 * rows.
 */
export default defineComponent({
  name: 'MvPanel',

  props: {
    title: {type: String, required: true},
    padded: {type: Boolean, default: true}
  }
})
</script>
