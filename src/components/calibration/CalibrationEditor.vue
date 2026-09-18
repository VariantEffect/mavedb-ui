<template>
  <p v-if="showRequiredLegend !== false" class="pb-3 text-sm text-text-muted">
    Fields marked <span class="font-bold text-danger">*</span> are required.
  </p>
  <CalibrationFields
    :allow-class-based="allowClassBased"
    :baseline-score="draft.baselineScore"
    :baseline-score-description="draft.baselineScoreDescription"
    :class-based="classBased"
    :classes-file-name="draftClassesFile?.name || null"
    :criterions="criterions"
    :disease="draft.disease ?? null"
    :editable-score-sets="editableScoreSets"
    :evidence-sources="draft.evidenceSources || []"
    :evidence-strengths="evidenceStrengths"
    :functional-classification-helpers="functionalClassificationHelpers"
    :functional-classifications="draft.functionalClassifications || []"
    :method-sources="draft.methodSources || []"
    :notes="draft.notes"
    :publication-search-loading="publicationSearchLoading"
    :publication-suggestions="publicationIdentifierSuggestionsList"
    :range-classifications="rangeClassifications"
    :research-use-only="draft.researchUseOnly"
    :selected-score-set="selectedScoreSet"
    :show-score-set-selector="showScoreSetSelector ?? !!($props.scoreSetUrn || $props.calibrationUrn)"
    :threshold-sources="draft.thresholdSources || []"
    :title="draft.title"
    :validation-errors="validationErrors"
    @add-classification="addClassification"
    @classes-file-cleared="onClassesFileClear"
    @classes-file-selected="onClassesFileUpload"
    @publication-selected="onPublicationSelected"
    @remove-classification="removeClassification"
    @search-publications="searchPublicationIdentifiers"
    @toggle-acmg="onToggleAcmg"
    @toggle-boundary="onToggleBoundary"
    @toggle-infinity="onToggleInfinity"
    @toggle-oddspaths="onToggleOddspaths"
    @update:baseline-score="((draft.baselineScore = $event), markChanged())"
    @update:baseline-score-description="((draft.baselineScoreDescription = $event), markChanged())"
    @update:class-based="classBased = $event"
    @update:classification-field="onClassificationFieldUpdate"
    @update:evidence-sources="((draft.evidenceSources = $event), markChanged())"
    @update:evidence-strength="onEvidenceStrengthUpdate"
    @update:method-sources="((draft.methodSources = $event), markChanged())"
    @update:notes="((draft.notes = $event), markChanged())"
    @update:range-value="onRangeValueUpdate"
    @update:research-use-only="((draft.researchUseOnly = $event), markChanged())"
    @update:selected-score-set="onScoreSetSelected"
    @update:threshold-sources="((draft.thresholdSources = $event), markChanged())"
    @update:title="((draft.title = $event), markChanged())"
  >
    <template #controls>
      <CalibrationControlsField
        v-if="allowControls"
        :cleared="controlsCleared"
        :controls-file-name="draftControlsFile?.name || null"
        :controls-not-phi="draft.controlsNotPhi ?? null"
        :has-controls="hasControls"
        :loaded-controls="draft.controls || []"
        :phi-error="phiError"
        :preview-errors="controlsPreviewErrors"
        :preview-rows="controlsPreviewRows"
        :reacknowledgment-required="reacknowledgmentRequired"
        :validation-errors="validationErrors"
        @clear-controls="onClearControls"
        @controls-file-cleared="onControlsFileClear"
        @controls-file-selected="onControlsFileUpload"
        @restore-controls="onRestoreControls"
        @update:controls-not-phi="onControlsNotPhiUpdate"
      />
    </template>
  </CalibrationFields>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import {cloneDeep} from 'lodash'

import CalibrationControlsField from '@/components/calibration/CalibrationControlsField.vue'
import CalibrationFields from '@/components/calibration/CalibrationFields.vue'
import {
  useCalibrationEditor,
  type DraftScoreCalibration,
  type DraftFunctionalClassification,
  type DraftAcmgClassification
} from '@/composables/use-calibration-editor'
import {searchEditableScoreSets, getScoreSetByUrn} from '@/api/mavedb'
import {acceptNewPublicationIdentifier} from '@/lib/form-helpers'
import {parseControlsCsv, phiAcknowledgmentError, type ParsedControlRow} from '@/lib/calibration-controls'
import {EVIDENCE_STRENGTH, BENIGN_CRITERION, PATHOGENIC_CRITERION} from '@/lib/calibrations'
import {
  DRAFT_CALIBRATION_COPYABLE_KEYS,
  createDefaultClassification,
  createClassificationHelper
} from '@/lib/calibration-types'
import type {MinimalScoreSet} from '@/lib/calibration-types'
import type {ValidationErrors} from '@/lib/form-validation'

export type {DraftScoreCalibration, DraftFunctionalClassification, DraftAcmgClassification}

export default defineComponent({
  name: 'CalibrationEditor',

  components: {CalibrationControlsField, CalibrationFields},

  props: {
    calibrationUrn: {type: String, default: null},
    scoreSetUrn: {type: String, default: null},
    // Parent components may wish to disable class-based editing or controls editing, e.g. when the
    // calibration is being created alongside a score set and variants are not yet available.
    allowClassBased: {type: Boolean, default: true},
    allowControls: {type: Boolean, default: true},
    showScoreSetSelector: {type: [Boolean, null] as unknown as PropType<boolean | null>, default: null},
    /** Set false when the host page already explains the required-field marker. */
    showRequiredLegend: {type: Boolean, default: true}
  },

  emits: ['canceled', 'saved', 'update:draft'],

  setup(props) {
    return {...useCalibrationEditor(props)}
  },

  data() {
    return {
      evidenceStrengths: EVIDENCE_STRENGTH.map((es) => ({label: es, value: es})),
      criterions: [PATHOGENIC_CRITERION, BENIGN_CRITERION],
      editableScoreSets: [] as MinimalScoreSet[],
      selectedScoreSet: null as MinimalScoreSet | null,
      adjustedClassificationErrors: null as ValidationErrors | null,
      controlsPreviewRows: [] as ParsedControlRow[],
      controlsPreviewErrors: [] as string[],
      /** PHI affirmation held aside while a controls change is staged, so cancelling can restore it. */
      controlsNotPhiBeforeChange: null as boolean | null,
      controlsChangeStaged: false,
      saving: false
    }
  },

  computed: {
    /** Whether the calibration effectively carries controls, given a pending upload/clear or loaded controls. */
    hasControls(): boolean {
      if (this.draftControlsFile) return this.controlsPreviewRows.length > 0
      if (this.controlsCleared) return false
      return (this.draft.controls?.length ?? this.draft.controlsCount ?? 0) > 0
    },

    /** Whether a staged controls change discarded an affirmation the user had already made. */
    reacknowledgmentRequired(): boolean {
      return this.controlsChangeStaged && this.controlsNotPhiBeforeChange === true
    },

    /** Inline PHI acknowledgment error (#677), shown when a published calibration's controls are unacknowledged. */
    phiError(): string | null {
      return phiAcknowledgmentError({
        hasControls: this.hasControls,
        isPrivate: this.draft.private ?? true,
        controlsNotPhi: this.draft.controlsNotPhi
      })
    },

    activeValidationErrors(): ValidationErrors {
      if (!this.adjustedClassificationErrors) return this.validationErrors
      // Merge: non-classification errors from composable + adjusted classification errors.
      const result: ValidationErrors = {}
      for (const [key, value] of Object.entries(this.validationErrors)) {
        if (!key.startsWith('functionalClassifications.')) {
          result[key] = value
        }
      }
      return {...result, ...this.adjustedClassificationErrors}
    }
  },

  watch: {
    validationErrors() {
      // Fresh errors from a save attempt — indices are accurate again.
      this.adjustedClassificationErrors = null
    },
    calibrationUrn: {
      async handler(newUrn: string | null, oldUrn: string | null) {
        if (newUrn && newUrn !== oldUrn) {
          await this.loadCalibration(newUrn)
          this.recomputeMeta()
        } else if (!newUrn && oldUrn) {
          this.initCreateDraft()
          this.recomputeMeta()
        }
      }
    },
    scoreSetUrn: {
      handler(newVal: string | null) {
        this.draft.scoreSetUrn = newVal
        this.draft.__original.scoreSetUrn = newVal
        this.selectScoreSetByUrn(newVal)
        this.recomputeMeta()
      }
    },
    selectedScoreSet: {
      handler(newValue: MinimalScoreSet | null, oldValue: MinimalScoreSet | null) {
        if (newValue !== oldValue) {
          this.draft.scoreSetUrn = newValue ? newValue.urn : null
          this.recomputeMeta()
        }
      }
    },
    editableScoreSets: {
      handler(newValue: MinimalScoreSet[]) {
        if (newValue && newValue.length > 0 && (this.draft.scoreSetUrn || this.scoreSetUrn)) {
          this.selectScoreSetByUrn(this.draft.scoreSetUrn || this.scoreSetUrn)
          this.recomputeMeta()
        }
      }
    },
    classBased: {
      handler(newValue: boolean) {
        if (!this.draft.functionalClassifications) return

        this.draft.functionalClassifications.forEach((fr, idx) => {
          if (!this.functionalClassificationHelpers[idx]) return

          let currentRangeState: (number | null)[] | null = null
          if (fr.range) {
            currentRangeState = [fr.range[0] != null ? fr.range[0] : null, fr.range[1] != null ? fr.range[1] : null]
          }
          let currentClassState: string | null = null
          if (fr.class) {
            currentClassState = fr.class
          }

          fr.range = newValue
            ? null
            : this.functionalClassificationHelpers[idx].lastRangeState
              ? [
                  this.functionalClassificationHelpers[idx].lastRangeState![0],
                  this.functionalClassificationHelpers[idx].lastRangeState![1]
                ]
              : [null, null]
          fr.class = newValue ? this.functionalClassificationHelpers[idx].lastClassState : null

          this.functionalClassificationHelpers[idx].lastRangeState = currentRangeState
          this.functionalClassificationHelpers[idx].lastClassState = currentClassState
        })
      }
    }
  },

  async mounted() {
    this.$emit('update:draft', this.draft)
    await this.loadEditableScoreSets()
  },

  unmounted() {
    this.$emit('update:draft', null)
  },

  methods: {
    // ─── Score set loading ───────────────────────────────────────────────

    async loadEditableScoreSets() {
      try {
        this.editableScoreSets = await searchEditableScoreSets()
      } catch (error) {
        console.error('Error loading score sets:', error)
        this.editableScoreSets = []
      }
    },

    selectScoreSetByUrn(urn: string | null) {
      if (!urn) {
        this.selectedScoreSet = null
        return
      }
      const scoreSet = this.editableScoreSets.find((ss) => ss.urn === urn)
      if (scoreSet) {
        this.selectedScoreSet = scoreSet
      } else {
        getScoreSetByUrn(urn)
          .then((data) => {
            this.selectedScoreSet = data as unknown as MinimalScoreSet
            this.editableScoreSets.push(data as unknown as MinimalScoreSet)
          })
          .catch((error) => {
            console.error(`Error loading score set with URN ${urn}:`, error)
          })
      }
    },

    onScoreSetSelected(scoreSet: MinimalScoreSet | null) {
      this.selectedScoreSet = scoreSet
    },

    // ─── Classification manipulation ─────────────────────────────────────

    addClassification() {
      if (!this.draft.functionalClassifications) {
        this.draft.functionalClassifications = []
      }
      this.draft.functionalClassifications.push(createDefaultClassification(this.classBased))
      this.functionalClassificationHelpers.push(createClassificationHelper(undefined, this.classBased))
      this.recomputeMeta()
    },

    removeClassification(idx: number) {
      if (!this.draft.functionalClassifications) return
      this.draft.functionalClassifications.splice(idx, 1)
      this.functionalClassificationHelpers.splice(idx, 1)
      this.remapClassificationErrors(idx)
      this.recomputeMeta()
    },

    /**
     * After removing a classification at `removedIdx`, drop its errors and
     * shift higher indices down by one so errors stay with the correct row.
     */
    remapClassificationErrors(removedIdx: number) {
      const source = this.adjustedClassificationErrors ?? this.validationErrors
      const re = /^functionalClassifications\.(\d+)(\..*)?$/
      const remapped: ValidationErrors = {}

      for (const [key, value] of Object.entries(source)) {
        const match = key.match(re)
        if (!match) continue

        const idx = parseInt(match[1], 10)
        if (idx === removedIdx) continue

        const suffix = match[2] ?? ''
        const newIdx = idx > removedIdx ? idx - 1 : idx
        remapped[`functionalClassifications.${newIdx}${suffix}`] = value
      }

      this.adjustedClassificationErrors = remapped
    },

    onClassificationFieldUpdate(idx: number, field: string, value: unknown) {
      if (!this.draft.functionalClassifications?.[idx]) return
      // @ts-expect-error dynamic field assignment
      this.draft.functionalClassifications[idx][field] = value

      if (field === 'functionalClassification') {
        this.updateClassificationValues(idx)
      }
      this.recomputeMeta()
    },

    onRangeValueUpdate(idx: number, boundIdx: number, value: number | null) {
      if (!this.draft.functionalClassifications?.[idx]?.range) return
      this.draft.functionalClassifications[idx].range![boundIdx] = value
      this.recomputeMeta()
    },

    onToggleBoundary(idx: number, boundType: 'lower' | 'upper') {
      if (!this.draft.functionalClassifications) return
      const fc = this.draft.functionalClassifications[idx]
      if (!fc) return
      if (boundType === 'lower') {
        fc.inclusiveLowerBound = !fc.inclusiveLowerBound
      } else {
        fc.inclusiveUpperBound = !fc.inclusiveUpperBound
      }
    },

    onToggleInfinity(idx: number, boundType: 'lower' | 'upper') {
      if (!this.draft.functionalClassifications) return
      const fc = this.draft.functionalClassifications[idx]
      const helper = this.functionalClassificationHelpers[idx]
      if (!fc) return

      if (boundType === 'lower') {
        helper.infiniteLower = !helper.infiniteLower
        if (helper.infiniteLower && fc.range) {
          fc.range[0] = null
          helper.lastLowerInclusiveState = fc.inclusiveLowerBound != null ? fc.inclusiveLowerBound : null
          fc.inclusiveLowerBound = false
        } else {
          fc.inclusiveLowerBound = helper.lastLowerInclusiveState
        }
      } else {
        helper.infiniteUpper = !helper.infiniteUpper
        if (helper.infiniteUpper && fc.range) {
          fc.range[1] = null
          helper.lastUpperInclusiveState = fc.inclusiveUpperBound != null ? fc.inclusiveUpperBound : null
          fc.inclusiveUpperBound = false
        } else {
          fc.inclusiveUpperBound = helper.lastUpperInclusiveState
        }
      }
    },

    onToggleAcmg(idx: number, value: boolean) {
      const helper = this.functionalClassificationHelpers[idx]
      const fc = this.draft.functionalClassifications?.[idx]
      if (!fc || !helper) return

      helper.isProvidingClassification = value
      this.updateClassificationValues(idx)
    },

    onToggleOddspaths(idx: number, value: boolean) {
      const helper = this.functionalClassificationHelpers[idx]
      if (!helper) return
      helper.isProvidingOddspaths = value
    },

    onEvidenceStrengthUpdate(idx: number, value: DraftAcmgClassification['evidenceStrength']) {
      const fc = this.draft.functionalClassifications?.[idx]
      if (!fc?.acmgClassification) return
      fc.acmgClassification.evidenceStrength = value
      this.recomputeMeta()
    },

    updateClassificationValues(idx: number) {
      if (!this.draft.functionalClassifications) return
      const fc = this.draft.functionalClassifications[idx]
      const helper = this.functionalClassificationHelpers[idx]
      if (!fc) return

      if (!fc.functionalClassification || fc.functionalClassification === 'not_specified') {
        helper.isProvidingClassification = false
      }

      if (!helper.isProvidingClassification) {
        helper.lastClassificationState = fc.acmgClassification as DraftAcmgClassification
        fc.acmgClassification = null
        return
      }

      fc.acmgClassification = {
        criterion:
          fc.functionalClassification === 'normal'
            ? BENIGN_CRITERION
            : fc.functionalClassification === 'abnormal'
              ? PATHOGENIC_CRITERION
              : null,
        evidenceStrength: (helper.lastClassificationState as DraftAcmgClassification)?.evidenceStrength ?? null
      }
    },

    // ─── File handling ───────────────────────────────────────────────────

    onClassesFileUpload(event: {files: File[]}) {
      this.draftClassesFile = event.files[0] || null
    },

    onClassesFileClear() {
      this.draftClassesFile = null
    },

    // ─── Controls handling ───────────────────────────────────────────────

    /**
     * Staging a controls change invalidates the PHI affirmation. The API resets `controls_not_phi`
     * whenever controls are replaced, but an explicit value in the request wins
     * (`lib/score_calibrations.py`) and this editor always sends one — so the client has to clear it,
     * or an affirmation made against the old controls rides along with the new ones.
     */
    stageControlsChange() {
      if (!this.controlsChangeStaged) {
        this.controlsNotPhiBeforeChange = this.draft.controlsNotPhi ?? null
        this.controlsChangeStaged = true
      }
      this.draft.controlsNotPhi = null
      this.clearClientError('controlsNotPhi')
    },

    /** Reverting to the saved controls restores the affirmation that was made against them. */
    unstageControlsChange() {
      if (!this.controlsChangeStaged) return
      this.draft.controlsNotPhi = this.controlsNotPhiBeforeChange
      this.controlsChangeStaged = false
    },

    async onControlsFileUpload(event: {files: File[]}) {
      const file = event.files[0] || null
      this.draftControlsFile = file
      this.controlsCleared = false
      if (file) {
        this.stageControlsChange()
        try {
          const preview = parseControlsCsv(await file.text())
          this.controlsPreviewRows = preview.rows
          this.controlsPreviewErrors = preview.errors
        } catch {
          this.controlsPreviewRows = []
          this.controlsPreviewErrors = ['The controls file could not be read.']
        }
      } else {
        this.controlsPreviewRows = []
        this.controlsPreviewErrors = []
        this.unstageControlsChange()
      }
      this.markChanged()
    },

    onControlsFileClear() {
      this.draftControlsFile = null
      this.controlsPreviewRows = []
      this.controlsPreviewErrors = []
      this.unstageControlsChange()
      this.markChanged()
    },

    onClearControls() {
      this.controlsCleared = true
      this.stageControlsChange()
      this.markChanged()
    },

    onRestoreControls() {
      this.controlsCleared = false
      this.unstageControlsChange()
      this.markChanged()
    },

    onControlsNotPhiUpdate(value: boolean) {
      this.draft.controlsNotPhi = value
      this.clearClientError('controlsNotPhi')
      this.markChanged()
    },

    // ─── Publication search ──────────────────────────────────────────────

    onPublicationSelected(sourceField: 'methodSources' | 'thresholdSources' | 'evidenceSources') {
      const list = this.draft[sourceField]
      if (!list) return
      acceptNewPublicationIdentifier(list, this.$toast, 'this calibration')
    },

    // ─── Save / reset ────────────────────────────────────────────────────

    async saveCalibration() {
      if (this.saving) return

      // The backend gates PHI acknowledgment on publish, not on save, so guard it here: a published
      // calibration with controls may not be saved without the acknowledgment. The error also renders
      // inline via the `phiError` computed; returning undefined leaves the editor open without a save.
      if (this.phiError) {
        this.$toast.add({
          severity: 'error',
          summary: 'Confirm the controls contain no PHI before saving.',
          life: 5000
        })
        return
      }

      this.saving = true

      try {
        const result = await this.saveCalibrationDraft()

        if (result.success) {
          // Adopt the resolved controls returned by the server and retire the pending upload/clear.
          this.draft.controls = result.data?.controls ?? this.draft.controls
          this.draft.controlsCount = result.data?.controlsCount ?? this.draft.controlsCount
          this.draftControlsFile = null
          this.controlsCleared = false
          this.controlsPreviewRows = []
          this.controlsPreviewErrors = []
          this.controlsChangeStaged = false
          this.controlsNotPhiBeforeChange = null
          this.draft.__original = cloneDeep(this.draft)
          this.recomputeMeta()
          this.$emit('saved', result.data)
        }

        return result
      } finally {
        this.saving = false
      }
    },

    resetCalibration() {
      if (!this.draft?.__original) return
      const original = this.draft.__original
      DRAFT_CALIBRATION_COPYABLE_KEYS.forEach((k) => {
        // @ts-expect-error index assignment
        this.draft[k] = original[k]
      })
      this.draft.disease = original.disease

      this.draftControlsFile = null
      this.controlsCleared = false
      this.controlsPreviewRows = []
      this.controlsPreviewErrors = []
      this.controlsChangeStaged = false
      this.controlsNotPhiBeforeChange = null

      if (!this.draft.functionalClassifications) {
        this.draft.functionalClassifications = []
      }
      this.draft.functionalClassifications.splice(0, this.draft.functionalClassifications.length)
      this.functionalClassificationHelpers.splice(0, this.functionalClassificationHelpers.length)

      if (original.functionalClassifications) {
        original.functionalClassifications.forEach((fr: DraftFunctionalClassification) => {
          if (!this.draft.functionalClassifications) this.draft.functionalClassifications = []
          this.draft.functionalClassifications.push(fr)
          this.functionalClassificationHelpers.push(createClassificationHelper(fr))
        })
      }
      this.recomputeMeta()
    }
  }
})
</script>
