<template>
  <div v-if="!scoreSet.publishedDate" class="flex flex-col gap-3">
    <!-- Processing status -->
    <MvStatusMessage
      v-if="processingReady"
      severity="success"
    >
      Scores and/or counts have been successfully processed. This score set is ready to be published.
    </MvStatusMessage>

    <MvStatusMessage v-else-if="scoreSet.processingState === 'processing'" severity="info">
      Scores and/or counts are being processed. Refresh this page in a few minutes to check on their status.
    </MvStatusMessage>

    <MvStatusMessage v-else-if="mappingInProgress" severity="info">
      Variants are being mapped to a reference. Refresh this page in a few minutes to check on their status.
    </MvStatusMessage>

    <MvStatusMessage v-else-if="scoreSet.processingState === 'failed'" severity="error">
      Failed to process score and/or count data: {{ scoreSet.processingErrors?.exception }}.
      <button class="ml-1 cursor-pointer font-semibold underline" @click="scrollToVariants">View errors &darr;</button>
    </MvStatusMessage>

    <MvStatusMessage v-else-if="scoreSet.processingState === 'incomplete'" severity="warn">
      This score set is currently incomplete and may not be published. Please add any required fields and/or data files.
    </MvStatusMessage>

    <!-- Mapping status (processing complete, mapping not in progress) -->
    <template v-if="processingReady">
      <MvStatusMessage v-if="scoreSet.mappingState === 'complete'" severity="info">
        All variants mapped successfully to reference.
      </MvStatusMessage>

      <MvStatusMessage v-else-if="scoreSet.mappingState === 'incomplete'" severity="info">
        Variant mapping completed, but some variants did not map successfully. The mapped variants file available on this
        page includes specific error messages for each failed variant mapping. Score set is still publishable.
      </MvStatusMessage>

      <MvStatusMessage v-else-if="scoreSet.mappingState === 'failed'" severity="info">
        Variants could not be mapped to reference: {{ scoreSet.mappingErrors?.error_message }}.
        This score set is still publishable.
      </MvStatusMessage>
    </template>
  </div>
</template>

<script lang="ts" setup>
import {computed, type PropType} from 'vue'

import MvStatusMessage from '@/components/common/MvStatusMessage.vue'
import type {components} from '@/schema/openapi'

const MAPPING_IN_PROGRESS_STATES = ['pending_variant_processing', 'processing', 'queued']

const props = defineProps({
  scoreSet: {
    type: Object as PropType<components['schemas']['ScoreSet']>,
    required: true
  }
})

const mappingInProgress = computed(() =>
  props.scoreSet.processingState === 'success' &&
  MAPPING_IN_PROGRESS_STATES.includes(props.scoreSet.mappingState ?? '')
)

const processingReady = computed(() =>
  props.scoreSet.processingState === 'success' &&
  !MAPPING_IN_PROGRESS_STATES.includes(props.scoreSet.mappingState ?? '')
)

function scrollToVariants() {
  document.getElementById('variants')?.scrollIntoView({behavior: 'smooth'})
}
</script>
