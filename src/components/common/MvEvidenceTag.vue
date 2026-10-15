<template>
  <span v-key-term="'acmg'" class="mave-tag whitespace-nowrap" :class="`mave-evidence-code-${normalizedCode}`">
    {{ displayCode }}
  </span>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {formatEvidenceCode} from '@/lib/measurement-types'

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
      return formatEvidenceCode(this.normalizedCode)
    }
  }
})
</script>
