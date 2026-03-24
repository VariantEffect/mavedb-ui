<template>
  <span
    class="inline-block max-w-full rounded px-2.5 py-0.5 text-xs font-bold leading-snug tracking-wide"
    :class="`mave-classification-${classification}`"
  >
    {{ label }}
  </span>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

const LABELS: Record<string, string> = {
  abnormal: 'Functionally Abnormal',
  normal: 'Functionally Normal',
  not_specified: 'Not Specified'
}

const SHORT_LABELS: Record<string, string> = {
  abnormal: 'Abnormal',
  normal: 'Normal',
  not_specified: 'Not Specified'
}

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
    label(): string {
      const lookup = this.compact ? SHORT_LABELS : LABELS
      return lookup[this.classification] ?? this.classification
    }
  }
})
</script>
