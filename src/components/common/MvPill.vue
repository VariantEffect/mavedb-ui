<template>
  <span
    class="inline-block whitespace-nowrap rounded-xl border px-2.5 py-px text-xs-minus font-semibold"
    :class="variantClasses"
    :title="title"
  >
    <slot>{{ label }}</slot>
  </span>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

type PillVariant = 'default' | 'sage' | 'orange' | 'calibrated' | 'collection' | 'nucleotide' | 'protein' | 'blue'

const VARIANT_CLASSES: Record<PillVariant, string> = {
  default: 'border-gray-300 bg-gray-100 text-gray-600',
  sage: 'border-mint bg-sage-light text-sage-dark',
  blue: 'border-info-border bg-info-light text-info',
  orange: 'border-orange-border bg-orange-light text-orange-cta-dark italic',
  calibrated: 'border-calibrated-border bg-calibrated-light text-calibrated',
  collection: 'border-sage bg-sage-dark text-white',
  nucleotide: 'border-nucleotide-border bg-nucleotide-light text-nucleotide',
  protein: 'border-protein-border bg-protein-light text-protein'
}

export default defineComponent({
  name: 'MvPill',

  props: {
    label: {type: String, default: undefined},
    title: {type: String, default: undefined},
    variant: {type: String as PropType<PillVariant>, default: 'default'}
  },

  computed: {
    variantClasses(): string {
      return VARIANT_CLASSES[this.variant] || VARIANT_CLASSES.default
    }
  }
})
</script>
