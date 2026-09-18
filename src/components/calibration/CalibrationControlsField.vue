<template>
  <div>
    <!-- Section header -->
    <div class="wizard-row wizard-classifications-header">
      <div class="wizard-help">
        <span class="wizard-classifications-title">Calibration Controls</span>
      </div>
      <div class="wizard-field" />
    </div>

    <!-- Controls CSV -->
    <div class="wizard-row">
      <div class="wizard-help">
        <label>{{ desc.controlsFile.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.controlsFile.detail" class="wizard-help-detail" v-html="desc.controlsFile.detail" />
      </div>
      <div class="wizard-field flex flex-col gap-2">
        <!--
          The attached controls keep their own panel across every state — clearing or replacing them
          restyles this panel rather than swapping it out, so the set the user is acting on stays on
          screen (and keeps its expanded/collapsed state) while the pending change is described.
        -->
        <CalibrationControlsPanel
          v-if="loadedControls.length > 0"
          context-label="attached"
          :controls="loadedRows"
          :start-expanded="true"
          :status-label="mode === 'loaded' ? '' : 'Removing'"
          :tone="mode === 'loaded' ? 'neutral' : 'removing'"
        >
          <template v-if="mode !== 'new-file'" #actions>
            <PButton
              v-if="mode === 'loaded'"
              label="Remove all"
              severity="danger"
              size="small"
              text
              @click="$emit('clear-controls')"
            />
            <PButton v-else label="Undo" severity="secondary" size="small" text @click="$emit('restore-controls')" />
          </template>
        </CalibrationControlsPanel>

        <!-- A staged CSV, shown alongside the set it supersedes. Removing it cancels the whole change. -->
        <template v-if="mode === 'new-file'">
          <CalibrationControlsPanel
            :context-label="`from ${controlsFileName}`"
            :controls="previewTableRows"
            :start-expanded="true"
            :status-label="previewRows.length > 0 ? 'Adding' : 'Unusable'"
            :tone="previewRows.length > 0 ? 'adding' : 'warning'"
          >
            <template #actions>
              <PButton label="Cancel" severity="danger" size="small" text @click="$emit('controls-file-cleared')" />
            </template>
          </CalibrationControlsPanel>
          <PMessage v-for="(err, i) in previewErrors" :key="i" :closable="false" severity="warn" size="small">
            {{ err }}
          </PMessage>
          <MvFieldError :error="validationErrors['controls']" />
        </template>

        <!-- Hidden while a CSV is staged: the staged panel's own action is the way back out. -->
        <MvUploadField
          v-else
          accept="text/csv"
          :empty-text="dropzoneText"
          :error="validationErrors['controls']"
          :label="mode === 'loaded' ? 'Replace controls' : 'Controls file'"
          :show-label="false"
          @select="$emit('controls-file-selected', $event)"
        />

        <!-- Stated once for the section rather than repeated in every panel's header. -->
        <p v-if="pendingChange" class="text-xs text-text-muted">Control changes take effect when you save.</p>
      </div>
    </div>

    <!-- PHI acknowledgment — only meaningful once controls are present. -->
    <div v-if="hasControls" class="wizard-row">
      <div class="wizard-help">
        <label>{{ desc.controlsPhi.help }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="desc.controlsPhi.detail" class="wizard-help-detail" v-html="desc.controlsPhi.detail" />
      </div>
      <div class="wizard-field">
        <div class="flex items-start gap-2.5">
          <Checkbox
            binary
            :input-id="scopedId('controls-not-phi')"
            :model-value="controlsNotPhi === true"
            @update:model-value="$emit('update:controlsNotPhi', $event)"
          />
          <label class="cursor-pointer text-sm text-text-primary" :for="scopedId('controls-not-phi')">
            I confirm that the control variant data provided does not contain protected health information (PHI).
          </label>
        </div>
        <!-- The help text already states the publishing requirement; this covers only the case it can't:
             an affirmation silently invalidated by a staged controls change. -->
        <p v-if="reacknowledgmentRequired" class="mt-1.5 text-xs text-orange-cta-dark">
          Changing the controls cleared your earlier confirmation — confirm again for the new set.
        </p>
        <MvFieldError :error="phiError || validationErrors['controlsNotPhi']" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Message from 'primevue/message'

import CalibrationControlsPanel, {type ControlRow} from '@/components/calibration/CalibrationControlsPanel.vue'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import MvUploadField from '@/components/forms/MvUploadField.vue'
import useScopedId from '@/composables/scoped-id'
import {calibrationDescriptions} from '@/data/field-descriptions'
import {type ParsedControlRow, type SavedCalibrationControl} from '@/lib/calibration-controls'
import type {ValidationErrors} from '@/lib/form-validation'

/** Which controls-editing state the section is in — drives what's rendered. */
type ControlsMode = 'new-file' | 'loaded' | 'cleared' | 'empty'

export default defineComponent({
  name: 'CalibrationControlsField',

  components: {
    CalibrationControlsPanel,
    Checkbox,
    MvFieldError,
    MvUploadField,
    PButton: Button,
    PMessage: Message
  },

  props: {
    /** Name of a newly selected controls CSV, or null when none is selected. */
    controlsFileName: {type: String as PropType<string | null>, default: null},
    /** Client-parsed preview of the selected CSV. */
    previewRows: {type: Array as PropType<ParsedControlRow[]>, default: () => []},
    /** Structural/row problems found while previewing the selected CSV. */
    previewErrors: {type: Array as PropType<string[]>, default: () => []},
    /** Controls already attached to the calibration being edited. */
    loadedControls: {type: Array as PropType<SavedCalibrationControl[]>, default: () => []},
    /** Whether the user has cleared all controls (pending save). */
    cleared: {type: Boolean, default: false},
    controlsNotPhi: {type: Boolean as PropType<boolean | null>, default: null},
    /** Whether any controls are effectively present — drives PHI checkbox visibility. */
    hasControls: {type: Boolean, default: false},
    /** Whether a staged controls change discarded an affirmation the user had already made. */
    reacknowledgmentRequired: {type: Boolean, default: false},
    /** Client-side PHI acknowledgment error, shown inline. */
    phiError: {type: String as PropType<string | null>, default: null},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})}
  },

  emits: [
    'controls-file-selected',
    'controls-file-cleared',
    'clear-controls',
    'restore-controls',
    'update:controlsNotPhi'
  ],

  setup() {
    return {...useScopedId(), desc: calibrationDescriptions()}
  },

  computed: {
    mode(): ControlsMode {
      if (this.controlsFileName) return 'new-file'
      if (this.cleared) return 'cleared'
      if (this.loadedControls.length > 0) return 'loaded'
      return 'empty'
    },

    loadedRows(): ControlRow[] {
      return this.loadedControls.map((c) => ({variant: c.variantUrn, clinicalStatus: c.clinicalStatus}))
    },

    previewTableRows(): ControlRow[] {
      return this.previewRows.map((r) => ({variant: r.variant, clinicalStatus: r.clinicalStatus}))
    },

    /** Whether a control change is staged but unsaved, which the section-level note explains. */
    pendingChange(): boolean {
      return this.mode === 'cleared' || this.mode === 'new-file'
    },

    dropzoneText(): string {
      return this.mode === 'loaded' ? 'Drop a CSV here to replace these controls' : 'Drop a controls CSV here'
    }
  }
})
</script>
