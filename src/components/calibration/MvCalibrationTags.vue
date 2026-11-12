<template>
  <span v-if="calibration.primary" v-key-term="keyTerm" class="mave-tag mave-tag-primary" :class="tagClass"
    >Primary</span
  >
  <span v-if="calibration.private" class="mave-tag mave-tag-draft" :class="tagClass">Draft</span>
  <span v-if="calibration.hasPublishedReplacement" class="mave-tag mave-tag-superseded" :class="tagClass"
    >Superseded</span
  >
  <span v-if="calibration.researchUseOnly" v-key-term="keyTerm" class="mave-tag mave-tag-ruo" :class="tagClass"
    >Research use only</span
  >
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import type {ScoreCalibration} from '@/lib/calibrations'

/**
 * A calibration's standing as inline tags: primary, draft, superseded and research use only. Renders only the tags
 * that apply, as siblings, so the parent's flex layout spaces them.
 */
export default defineComponent({
  name: 'MvCalibrationTags',

  props: {
    calibration: {type: Object as PropType<Partial<ScoreCalibration>>, required: true},
    /** A Key term for the primary and research-use-only tags to open, where the Key explains them. */
    keyTerm: {type: String as PropType<string | null>, default: null},
    /** Classes added to every tag. */
    tagClass: {type: String, default: ''}
  }
})
</script>
