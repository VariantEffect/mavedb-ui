<template>
  <div class="wizard-form">
    <div class="wizard-form-content-bg"></div>

    <!-- Target type: sequence vs coordinates (only shown when parent doesn't control mode) -->
    <div v-if="targetSequenceMode === null" class="wizard-row">
      <div class="wizard-help">
        <label>How will you define this target?</label>
        <p class="wizard-help-detail">
          Choose "Sequence" to upload a FASTA reference sequence, or "Coordinates" to reference a genomic accession.
        </p>
      </div>
      <div class="wizard-field">
        <SelectButton v-model="targetType" :allow-empty="false" aria-label="Target type" :options="targetTypeOptions" />
      </div>
    </div>
    <div v-else class="wizard-row">
      <div class="wizard-help">
        <label>Target type</label>
        <p class="wizard-help-detail">
          This score set already has {{ targetSequenceMode === 'sequence' ? 'sequence-based' : 'accession-based' }}
          targets. New targets must use the same type.
        </p>
      </div>
      <div class="wizard-field flex items-center text-sm text-text-muted">
        {{ targetSequenceMode === 'sequence' ? 'Sequence' : 'Coordinates' }}
      </div>
    </div>

    <TargetFields
      :accession="targetGene.targetAccession.accession"
      :accession-suggestions="accessionSuggestionsList"
      :assemblies="targetAssemblies"
      :assembly="assembly"
      :autofilled-target-gene="existingTargetGene"
      :category="targetGene.category"
      :error-prefix="errorPrefix"
      :external-identifiers="targetGene.externalIdentifiers"
      :gene="geneName"
      :gene-names="targetGeneNames"
      :identifier-search-loading="identifierSearchLoadingMap"
      :identifier-suggestions="targetIdentifierSuggestions"
      :is-multi-target="isMultiTarget"
      :is-relative-to-chromosome="isRelativeToChromosome"
      :is-target-sequence="isSequenceMode"
      :label="targetGene.targetSequence.label"
      :linked-accessions="linkedAccessions"
      :name="targetGene.name"
      :sequence="targetGene.targetSequence.sequence"
      :sequence-type="targetGene.targetSequence.sequenceType"
      :show-switch-to-protein-button="showSwitchToProteinButton"
      :target-gene-search-loading="targetGeneSearchLoading"
      :target-gene-suggestions="targetGeneSuggestions"
      :taxonomy="taxonomy"
      :taxonomy-search-loading="targetTaxonomySearchLoading"
      :taxonomy-suggestions="targetTaxonomySuggestions"
      :validation-errors="validationErrors"
      wizard-mode
      @autofill-from-existing="onAutofillFromExisting($event)"
      @clear-taxonomy-search="clearTaxonomySearch"
      @fetch-accessions="fetchTargetAccessions($event)"
      @file-cleared="fileClear"
      @file-selected="fileSelect($event)"
      @identifier-blur="onIdentifierBlur($event)"
      @identifier-changed="onIdentifierChanged"
      @search-identifiers="(dbName, event) => searchIdentifiers(dbName, event)"
      @search-target-genes="searchTargetGenes($event)"
      @search-taxonomies="searchTaxonomies($event)"
      @switch-to-protein-accession="onSwapAccessions"
      @update:accession="targetGene.targetAccession.accession = $event"
      @update:assembly="assembly = $event"
      @update:autofilled-target-gene="existingTargetGene = $event"
      @update:category="targetGene.category = $event"
      @update:external-identifier="onExternalIdentifierUpdate"
      @update:gene="onGeneUpdate($event)"
      @update:is-relative-to-chromosome="isRelativeToChromosome = $event"
      @update:label="targetGene.targetSequence.label = $event"
      @update:linked-accession="(dbName, val) => (linkedAccessions[dbName] = val)"
      @update:name="targetGene.name = $event"
      @update:sequence-type="targetGene.targetSequence.sequenceType = $event"
      @update:taxonomy="taxonomy = $event"
    />
  </div>
</template>

<script lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import Fasta from 'fasta-js'
import {computed, defineComponent, type PropType, watch} from 'vue'
import SelectButton from 'primevue/selectbutton'

import TargetFields from '@/components/forms/TargetFields.vue'
import {useTargetGeneEditor} from '@/composables/use-target-gene'
import {type ValidationErrors} from '@/lib/form-validation'

export default defineComponent({
  name: 'TargetEditor',

  components: {SelectButton, TargetFields},

  props: {
    /**
     * When set, overrides the internal target type toggle and hides the SelectButton.
     * `'sequence'` forces sequence mode, `'coordinates'` forces coordinates mode.
     * When not provided (default `null`), the user picks via the SelectButton.
     */
    targetSequenceMode: {
      type: String,
      default: null
    },
    /** Whether this target is part of a multi-target score set. */
    isMultiTarget: {
      type: Boolean,
      default: false
    },
    /** Server-side validation errors from parent. */
    validationErrors: {
      type: Object as PropType<ValidationErrors>,
      default: () => ({})
    },
    /** Error key prefix for TargetFields. */
    errorPrefix: {
      type: String,
      default: ''
    }
  },

  emits: ['save', 'update:valid'],

  setup(props, {emit}) {
    const editor = useTargetGeneEditor(props)

    const identifierSearchLoadingMap = computed(() =>
      Object.fromEntries(
        Object.entries(editor.targetIdentifierSearches).map(([dbName, search]) => [dbName, search.loading.value])
      )
    )

    watch(editor.isValid, (val) => {
      emit('update:valid', val)
    }, {immediate: true})

    return {...editor, identifierSearchLoadingMap}
  },

  methods: {
    // ─── Methods that need $toast (component-specific) ──────────────────────

    async onSwapAccessions() {
      const result = await this.swapNucleotideProteinAccessions()
      if (result.info) {
        this.$toast.add({severity: 'info', summary: result.info, life: 3000})
      }
      if (result.error) {
        this.$toast.add({severity: 'error', summary: result.error, life: 3000})
      }
    },

    async fileSelect(event: any) {
      const file = event.files[0]
      if (!file) return
      const text = await file.text()
      try {
        const fastaParser = new Fasta()
        const fastaData = fastaParser.parse(text)
        if (fastaData.length === 0) {
          this.targetGene.targetSequence.sequence = null
          this.$toast.add({severity: 'error', summary: 'The FASTA file contains no sequences.', life: 3000})
        } else if (fastaData.length > 1) {
          this.targetGene.targetSequence.sequence = null
          this.$toast.add({severity: 'error', summary: 'The FASTA file contains more than one sequence.', life: 3000})
        } else {
          this.targetGene.targetSequence.sequence = fastaData[0].sequence
        }
      } catch {
        this.targetGene.targetSequence.sequence = null
        this.$toast.add({severity: 'error', summary: 'The file was not a valid FASTA file.', life: 3000})
      }
    },

    /** Validate, transform, and emit the completed target (dialog mode). */
    save(): boolean {
      if (this.isSequenceMode) {
        if (!this.taxonomy) {
          this.$toast.add({severity: 'error', summary: 'A taxonomy is required for sequence-based targets.'})
          return false
        }
      } else {
        if (!this.assembly && !this.geneName) {
          this.$toast.add({
            severity: 'error',
            summary: 'An assembly or gene name is required for coordinate targets.'
          })
          return false
        }
      }

      const target = this.getPayload()
      if (!target) return false

      this.$emit('save', target)
      this.$toast.add({
        severity: 'success',
        summary: `Target ${target.name} was added successfully.`,
        life: 3000
      })
      this.reset()
      return true
    }
  }
})
</script>
