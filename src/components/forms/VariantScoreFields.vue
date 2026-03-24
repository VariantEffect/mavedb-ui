<template>
  <div :class="wizardMode ? '' : 'mv-field-dividers'">
    <!-- Existing variant count (editor mode) -->
    <p v-if="existingVariantCount != null" class="text-xs leading-relaxed text-text-muted">
      <strong class="text-text-primary">{{ existingVariantCount.toLocaleString() }}</strong> variants are included in
      this score set. To replace them, choose a new scores file and optional counts file below. Omitting scores and
      counts files will keep the existing files and variants.
    </p>

    <!-- Scores file -->
    <div :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.scoresFile.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.scoresFile.detail" class="wizard-help-detail" v-html="desc.scoresFile.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFileStatus
          v-if="scoresFile"
          :label="`Scores file: ${scoresFile.name}`"
          :viewable="false"
          @delete="clearFile('scoresFile')"
        />
        <MvUploadField
          v-else
          accept="text/csv"
          empty-text="Drop a scores CSV file here"
          :error="validationErrors.scoresFile"
          label="Scores file"
          :show-label="!wizardMode"
          @remove="clearFile('scoresFile')"
          @select="onFileSelected('scoresFile', $event)"
        />
      </div>
    </div>

    <!-- Score columns metadata file -->
    <div :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.scoreColumnsMetadataFile.help }}</label>
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="desc.scoreColumnsMetadataFile.detail"
          class="wizard-help-detail"
          v-html="desc.scoreColumnsMetadataFile.detail"
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFileStatus
          v-if="scoreColumnsMetadata"
          label="Scores column metadata"
          @delete="$emit('file-cleared', 'scoreColumnsMetadataFile')"
          @view="$emit('view-json', scoreColumnsMetadata)"
        />
        <div v-else>
          <MvUploadField
            accept="application/json"
            empty-text="Drop a JSON metadata file (scores) here"
            :error="validationErrors.scoreColumnsMetadataFile"
            label="Scores column metadata"
            :show-label="!wizardMode"
            @remove="$emit('file-cleared', 'scoreColumnsMetadataFile')"
            @select="$emit('file-selected', 'scoreColumnsMetadataFile', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Counts file -->
    <div :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.countsFile.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.countsFile.detail" class="wizard-help-detail" v-html="desc.countsFile.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFileStatus
          v-if="countsFile"
          :label="`Counts file: ${countsFile.name}`"
          :viewable="false"
          @delete="clearFile('countsFile')"
        />
        <MvUploadField
          v-else
          accept="text/csv"
          empty-text="Drop a counts CSV file here"
          :error="validationErrors.countsFile"
          label="Counts file"
          :show-label="!wizardMode"
          @remove="clearFile('countsFile')"
          @select="onFileSelected('countsFile', $event)"
        />
      </div>
    </div>

    <!-- Count columns metadata file -->
    <div :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.countColumnsMetadataFile.help }}</label>
        <!-- eslint-disable vue/no-v-html -->
        <p
          v-if="desc.countColumnsMetadataFile.detail"
          class="wizard-help-detail"
          v-html="desc.countColumnsMetadataFile.detail"
        />
        <!-- eslint-enable vue/no-v-html -->
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFileStatus
          v-if="countColumnsMetadata"
          label="Counts column metadata"
          @delete="$emit('file-cleared', 'countColumnsMetadataFile')"
          @view="$emit('view-json', countColumnsMetadata)"
        />
        <div v-else>
          <MvUploadField
            accept="application/json"
            empty-text="Drop a JSON metadata file (counts) here"
            :error="validationErrors.countColumnsMetadataFile"
            label="Counts column metadata"
            :show-label="!wizardMode"
            @remove="$emit('file-cleared', 'countColumnsMetadataFile')"
            @select="$emit('file-selected', 'countColumnsMetadataFile', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import MvFileStatus from '@/components/forms/MvFileStatus.vue'
import MvUploadField from '@/components/forms/MvUploadField.vue'

import {variantScoreDescriptions} from '@/data/field-descriptions'
import {ValidationErrors} from '@/lib/form-validation'

/** Public ref interface for parent components accessing VariantScoreFields via $refs. */
export interface VariantScoreFieldsRef {
  scoresFile: File | null
  countsFile: File | null
}

export default defineComponent({
  name: 'VariantScoreFields',

  components: {MvFileStatus, MvUploadField},

  props: {
    scoreColumnsMetadata: {type: Object as PropType<Record<string, unknown> | null>, default: null},
    countColumnsMetadata: {type: Object as PropType<Record<string, unknown> | null>, default: null},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})},
    wizardMode: {type: Boolean, default: false},
    existingVariantCount: {type: Number, default: null}
  },

  emits: ['file-selected', 'file-cleared', 'view-json'],

  data() {
    return {
      desc: variantScoreDescriptions(),
      scoresFile: null as File | null,
      countsFile: null as File | null
    }
  },

  methods: {
    onFileSelected(inputName: string, event: {files: File[]}) {
      const file = event.files?.[0] ?? null
      if (inputName === 'scoresFile') {
        this.scoresFile = file
      } else if (inputName === 'countsFile') {
        this.countsFile = file
      }
      this.$emit('file-selected', inputName, event)
    },

    clearFile(inputName: string) {
      if (inputName === 'scoresFile') {
        this.scoresFile = null
      } else if (inputName === 'countsFile') {
        this.countsFile = null
      }
      this.$emit('file-cleared', inputName)
    }
  }
})
</script>
