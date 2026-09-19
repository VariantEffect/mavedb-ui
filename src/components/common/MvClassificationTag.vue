<template>
  <span
    v-key-term="'functional-impact'"
    class="inline-block max-w-full rounded px-2.5 py-0.5 text-xs font-bold leading-snug tracking-wide"
    :class="tagClass"
  >
    {{ label }}
  </span>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {FUNCTIONAL_CLASSIFICATIONS, type FunctionalClassification} from '@/lib/functional-impact'

export default defineComponent({
  name: 'MvClassificationTag',

  props: {
    classification: {
      type: String as PropType<string>,
      required: true
    },
    compact: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    entry(): (typeof FUNCTIONAL_CLASSIFICATIONS)[FunctionalClassification] | undefined {
      return FUNCTIONAL_CLASSIFICATIONS[this.classification as FunctionalClassification]
    },
    label(): string {
      if (!this.entry) return this.classification
      return this.compact ? this.entry.shortLabel : this.entry.label
    },
    tagClass(): string {
      return this.entry?.class ?? `mave-classification-${this.classification}`
    }
  }
})
</script>
