<template>
  <div v-if="!scoreSet.publishedDate" class="variant-processing-status">
    <div
      v-if="
        scoreSet.processingState == 'success' &&
        scoreSet.mappingState != 'processing' &&
        scoreSet.mappingState != 'pending_variant_processing' &&
        scoreSet.mappingState != 'queued'
      "
    >
      <Message severity="success">
        Scores and/or counts have been successfully processed. This score set is ready to be published.
      </Message>
    </div>
    <div v-else-if="scoreSet.processingState == 'processing'">
      <Message severity="info">
        Scores and/or counts are being processed. Refresh this page in a few minutes to check on their status.
      </Message>
    </div>
    <div
      v-else-if="
        scoreSet.processingState == 'success' &&
        (scoreSet.mappingState == 'pending_variant_processing' ||
          scoreSet.mappingState == 'processing' ||
          scoreSet.mappingState == 'queued')
      "
    >
      <Message severity="info">
        Variants are being mapped to a reference. Refresh this page in a few minutes to check on their status.
      </Message>
    </div>
    <div v-else-if="scoreSet.processingState == 'failed'">
      <Message severity="error">
        Failed to process score and/or count data: {{ scoreSet.processingErrors.exception }}. If there were issues with
        validation of individual variants, they will appear in the `Variants` section of this page.
      </Message>
    </div>
    <div v-else-if="scoreSet.processingState == 'incomplete'">
      <Message severity="warn">
        This score set is currently incomplete and may not be published. Please add any required fields and/or data
        files.
      </Message>
    </div>
  </div>
  <div
    v-if="
      !scoreSet.publishedDate &&
      scoreSet.processingState == 'success' &&
      scoreSet.mappingState != 'pending_variant_processing' &&
      scoreSet.mappingState != 'processing' &&
      scoreSet.mappingState != 'queued'
    "
    class="mapping-status"
  >
    <div v-if="scoreSet.mappingState == 'complete'">
      <Message severity="info"> All variants mapped successfully to reference. </Message>
    </div>
    <div v-else-if="scoreSet.mappingState == 'incomplete'">
      <Message severity="info">
        Variant mapping completed, but some variants did not map successfully. The mapped variants file available on
        this page includes specific error messages for each failed variant mapping. Score set is still publishable.
      </Message>
    </div>
    <div v-else-if="scoreSet.mappingState == 'failed'">
      <Message severity="info">
        Variants could not be mapped to reference: {{ scoreSet.mappingErrors.error_message }}. This score set is still
        publishable.
      </Message>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Message from 'primevue/message'
import {PropType} from 'vue'

import type {components} from '@/schema/openapi'

defineProps({
  scoreSet: {
    type: Object as PropType<components['schemas']['ScoreSet']>,
    required: true
  }
})
</script>
