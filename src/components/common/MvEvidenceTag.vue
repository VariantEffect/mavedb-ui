<template>
  <span
    class="inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-wide"
    :class="`mave-evidence-code-${normalizedCode}`"
  >
    {{ displayCode }}
  </span>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

export default defineComponent({
  name: 'MvEvidenceTag',

  props: {
    /** Pre-formatted code like "PS3_STRONG". Takes precedence over criterion+evidenceStrength. */
    code: {
      type: String as PropType<string | null>,
      default: null
    },
    /** ACMG criterion (e.g. "PS3", "BS3"). Used with evidenceStrength. */
    criterion: {
      type: String as PropType<string | null>,
      default: null
    },
    /** Evidence strength (e.g. "Strong", "Moderate"). Used with criterion. */
    evidenceStrength: {
      type: String as PropType<string | null>,
      default: null
    }
  },

  computed: {
    normalizedCode(): string {
      if (this.code) return this.code.toUpperCase()
      if (this.criterion && this.evidenceStrength) {
        return `${this.criterion}_${this.evidenceStrength}`.toUpperCase()
      }
      return ''
    },
    displayCode(): string {
      // Insert zero-width space after underscores for wrapping
      return this.normalizedCode.replace(/_/g, '_\u200b')
    }
  }
})
</script>
