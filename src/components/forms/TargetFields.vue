<template>
  <div>
    <!-- Copy from existing target (sequence-based only) -->
    <div v-if="isTargetSequence" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.copyFromExisting.help }}</label>
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFloatField label="Copy from existing target">
          <template #default="{id}">
            <AutoComplete
              :id="id"
              field="name"
              fluid
              :force-selection="true"
              :loading="targetGeneSearchLoading"
              :model-value="autofilledTargetGene"
              option-label="name"
              :suggestions="targetGeneSuggestions"
              @complete="$emit('search-target-genes', $event)"
              @option-select="$emit('autofill-from-existing', $event)"
              @update:model-value="$emit('update:autofilledTargetGene', $event)"
            >
              <template #option="slotProps">
                <div v-if="isEmptySentinel(slotProps.option)" class="text-center text-sm text-text-muted">
                  No matching targets found.
                </div>
                <div v-else>
                  <div>Name: {{ slotProps.option.name }}</div>
                  <div>Category: {{ textForCategory(slotProps.option.category) }}</div>
                  <div v-if="slotProps.option.externalIdentifiers?.length">
                    External Identifiers:
                    <span v-for="(eid, i) in slotProps.option.externalIdentifiers" :key="i">
                      {{ eid.identifier?.dbName }}: {{ eid.identifier?.identifier
                      }}{{ Number(i) < slotProps.option.externalIdentifiers.length - 1 ? ', ' : '' }}
                    </span>
                  </div>
                </div>
              </template>
            </AutoComplete>
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Target name -->
    <div :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.name.help }}</label>
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFloatField
          :error="fieldError('name')"
          label="Target name"
          @update:model-value="$emit('update:name', $event)"
        >
          <template #default="{id, invalid}">
            <PInputText
              :id="id"
              class="w-full"
              :invalid="invalid"
              :model-value="name"
              @update:model-value="$emit('update:name', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Target label (sequence mode: always in flat mode, conditional in wizard mode) -->
    <div v-if="isTargetSequence && (isMultiTarget || !wizardMode)" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.label.help }}</label>
        <p v-if="desc.label.detail" class="wizard-help-detail">{{ desc.label.detail }}</p>
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <MvFloatField
          :error="fieldError('targetSequence.label')"
          label="Target label"
          @update:model-value="$emit('update:label', $event)"
        >
          <template #default="{id, invalid}">
            <PInputText
              :id="id"
              class="w-full"
              :invalid="invalid"
              :model-value="label"
              @update:model-value="$emit('update:label', $event)"
            />
          </template>
        </MvFloatField>
      </div>
    </div>

    <!-- Target category -->
    <div :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.category.help }}</label>
      </div>
      <div :class="wizardMode && 'wizard-field'">
        <div class="field">
          <SelectButton
            aria-label="Target category"
            :model-value="category"
            :option-label="textForCategory"
            :options="targetGeneCategories"
            @update:model-value="$emit('update:category', $event)"
          />
          <MvFieldError :error="fieldError('category')" />
        </div>
      </div>
    </div>

    <!-- External identifiers (UniProt, Ensembl, RefSeq) — sequence-based only; coordinate targets resolve identifiers internally -->
    <template v-if="isTargetSequence">
      <template v-for="(dbName, dbIdx) in editorDatabases" :key="dbName">
        <!-- Toggle (wizard mode only) -->
        <div v-if="wizardMode" class="wizard-row">
          <div class="wizard-help">
            <label>Link this target to a {{ dbName }} accession</label>
            <!-- eslint-disable vue/no-v-html -->
            <p
              v-if="dbIdx === 0 && desc.externalIdentifier.detail"
              class="wizard-help-detail"
              v-html="desc.externalIdentifier.detail"
            />
            <!-- eslint-enable vue/no-v-html -->
          </div>
          <div class="wizard-field flex items-center">
            <ToggleSwitch
              :aria-label="`Link to ${dbName}`"
              :model-value="linkedAccessions[dbName]"
              @update:model-value="$emit('update:linked-accession', dbName, $event)"
            />
            <div class="ml-3 text-sm">
              {{ linkedAccessions[dbName] ? `Yes, link to ${dbName}` : `No, do not link to ${dbName}` }}
            </div>
          </div>
        </div>

        <!-- Identifier + offset fields -->
        <div v-if="!wizardMode || linkedAccessions[dbName]" :class="wizardMode && 'wizard-row'">
          <div v-if="wizardMode" class="wizard-help" />
          <div :class="wizardMode && 'wizard-field'">
            <div class="flex gap-3">
              <div class="flex-1 min-w-0">
                <MvFloatField :error="identifierError(dbName)" :label="`${dbName} identifier`">
                  <template #default="{id, invalid}">
                    <AutoComplete
                      :id="id"
                      field="identifier"
                      fluid
                      :force-selection="false"
                      :invalid="invalid"
                      :loading="identifierSearchLoading[dbName] || false"
                      :model-value="externalIdentifiers[dbName]?.identifier"
                      option-label="identifier"
                      :suggestions="identifierSuggestions[dbName] || []"
                      @blur="$emit('identifier-blur', dbName)"
                      @change="$emit('identifier-changed', dbName, $event)"
                      @complete="$emit('search-identifiers', dbName, $event)"
                      @update:model-value="$emit('update:external-identifier', dbName, 'identifier', $event)"
                    >
                      <template #option="slotProps">
                        <div v-if="isEmptySentinel(slotProps.option)" class="text-center text-sm text-text-muted">
                          No matching identifiers found.
                        </div>
                        <template v-else>{{ slotProps.option.identifier }}</template>
                      </template>
                    </AutoComplete>
                  </template>
                </MvFloatField>
              </div>
              <div class="flex-1 min-w-0">
                <MvFloatField :error="fieldError(`externalIdentifiers.${dbName}.offset`)" :label="`${dbName} offset`">
                  <template #default="{id, invalid}">
                    <InputNumber
                      :id="id"
                      fluid
                      :invalid="invalid"
                      :min="0"
                      :model-value="externalIdentifiers[dbName]?.offset"
                      suffix=" bp"
                      @update:model-value="$emit('update:external-identifier', dbName, 'offset', $event)"
                    />
                  </template>
                </MvFloatField>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- === SEQUENCE-BASED FIELDS === -->
    <template v-if="isTargetSequence">
      <!-- Taxonomy -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.taxonomy.help }}</label>
          <p v-if="desc.taxonomy.detail" class="wizard-help-detail">{{ desc.taxonomy.detail }}</p>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvFloatField :error="fieldError('targetSequence.taxonomy')" label="Taxonomy">
            <template #default="{id, invalid}">
              <AutoComplete
                :id="id"
                fluid
                :force-selection="true"
                :invalid="invalid"
                :loading="taxonomySearchLoading"
                :model-value="taxonomy"
                :option-label="formatTaxonomy"
                :suggestions="taxonomySuggestions"
                @complete="$emit('search-taxonomies', $event)"
                @keyup.escape="$emit('clear-taxonomy-search')"
                @update:model-value="$emit('update:taxonomy', $event)"
              >
                <template #option="slotProps">
                  <div v-if="isEmptySentinel(slotProps.option)" class="text-center text-sm text-text-muted">
                    No matching taxonomies found.
                  </div>
                  <template v-else>{{ formatTaxonomy(slotProps.option) }}</template>
                </template>
              </AutoComplete>
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Sequence type -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.sequenceType.help }}</label>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <div class="field">
            <SelectButton
              aria-label="Sequence type"
              :model-value="sequenceType"
              :options="editorSequenceTypes"
              @update:model-value="$emit('update:sequenceType', $event)"
            />
            <MvFieldError :error="fieldError('targetSequence.sequenceType')" />
          </div>
        </div>
      </div>

      <!-- Target sequence (FASTA upload / textarea display) -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.referenceSequence.help }}</label>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <div class="field">
            <div v-if="sequence" class="mv-sequence-display">
              <pre>{{ sequence }}</pre>
              <div class="mv-sequence-display-footer">
                <i class="pi pi-check" style="color: var(--color-sage-dark)" />
                <span class="mv-sequence-label">Sequence loaded</span>
                <span class="mv-sequence-meta">
                  {{ sequence.length.toLocaleString() }} {{ sequenceType === 'protein' ? 'residues' : 'bases' }}
                </span>
                <PButton label="Clear" severity="danger" size="small" type="button" @click="$emit('file-cleared')" />
              </div>
            </div>
            <MvUploadField
              v-else
              empty-text="Drop a FASTA file here"
              :error="fieldError('targetSequence.sequence')"
              label="Reference sequence"
              :show-label="!wizardMode"
              @remove="$emit('file-cleared')"
              @select="$emit('file-selected', $event)"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- === ACCESSION-BASED FIELDS === -->
    <template v-else>
      <!-- Is relative to chromosome -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.isChromosome.help }}</label>
        </div>
        <div :class="wizardMode ? 'wizard-field flex items-center' : 'flex items-center'">
          <ToggleSwitch
            aria-label="Target represents a chromosome"
            :model-value="isRelativeToChromosome"
            @update:model-value="$emit('update:isRelativeToChromosome', $event)"
          />
          <div class="ml-3 text-sm">
            {{
              isRelativeToChromosome ? 'Yes, this represents a chromosome' : 'No, this does not represent a chromosome'
            }}
          </div>
        </div>
      </div>

      <!-- Assembly (when chromosome) -->
      <div v-if="isRelativeToChromosome" :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.assembly.help }}</label>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvFloatField :error="fieldError('targetAccession.assembly')" label="Assembly">
            <template #default="{id, invalid}">
              <PSelect
                :id="id"
                fluid
                :invalid="invalid"
                :model-value="assembly"
                :options="assemblies"
                @update:model-value="$emit('update:assembly', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Gene name (when not chromosome) -->
      <div v-if="!isRelativeToChromosome" :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.geneName.help }}</label>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvFloatField :error="fieldError('targetAccession.gene')" label="Gene name">
            <template #default="{id, invalid}">
              <PSelect
                :id="id"
                filter
                fluid
                :invalid="invalid"
                :model-value="gene"
                option-label="name"
                :options="geneNames"
                :virtual-scroller-options="{itemSize: 50}"
                @update:model-value="$emit('update:gene', $event)"
              />
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Accession identifier -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.accession.help }}</label>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvFloatField :error="fieldError('targetAccession.accession')" label="Accession/Transcript Identifier">
            <template #default="{id, invalid}">
              <AutoComplete
                :id="id"
                dropdown
                fluid
                :force-selection="true"
                :invalid="invalid"
                :model-value="accession"
                :suggestions="accessionSuggestions"
                @complete="$emit('fetch-accessions', $event)"
                @update:model-value="$emit('update:accession', $event)"
              >
                <template #option="slotProps">
                  <div v-if="!slotProps.option" class="text-center text-sm text-text-muted">
                    No matching accessions found.
                  </div>
                  <template v-else>{{ slotProps.option }}</template>
                </template>
              </AutoComplete>
            </template>
          </MvFloatField>
          <PButton
            v-if="showSwitchToProteinButton"
            class="mt-2"
            label="Switch to Protein Accession"
            severity="success"
            size="small"
            @click="$emit('switch-to-protein-accession')"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'

import ToggleSwitch from 'primevue/toggleswitch'

import MvFieldError from '@/components/forms/MvFieldError.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import MvUploadField from '@/components/forms/MvUploadField.vue'
import type {GeneNameOption} from '@/composables/use-target-gene'
import {targetDescriptions} from '@/data/field-descriptions'
import {isEmptySentinel} from '@/lib/form-helpers'
import type {ValidationErrors} from '@/lib/form-validation'
import {
  TARGET_GENE_CATEGORIES,
  EXTERNAL_GENE_DATABASES,
  SEQUENCE_TYPES,
  textForTargetGeneCategory,
  type EditableIdentifierOffset,
  type TargetGeneCategory
} from '@/lib/target-genes'
import type {components} from '@/schema/openapi'

type ExternalGeneIdentifier = components['schemas']['ExternalGeneIdentifier']
type Taxonomy = components['schemas']['Taxonomy']
type TargetGeneWithScoreSetUrn = components['schemas']['TargetGeneWithScoreSetUrn']

export default defineComponent({
  name: 'TargetFields',

  components: {
    AutoComplete,
    PButton: Button,
    InputNumber,
    MvFieldError,
    MvFloatField,
    MvUploadField,
    PInputText: InputText,
    PSelect: Select,
    SelectButton,
    ToggleSwitch
  },

  props: {
    name: {type: String as PropType<string | null>, default: null},
    category: {type: String as PropType<TargetGeneCategory | null>, default: null},
    label: {type: String as PropType<string | null>, default: null},
    sequenceType: {type: String as PropType<string | null>, default: null},
    sequence: {type: String as PropType<string | null>, default: null},
    taxonomy: {type: Object as PropType<Taxonomy | null>, default: null},
    accession: {type: String as PropType<string | null>, default: null},
    assembly: {type: String as PropType<string | null>, default: null},
    gene: {type: Object as PropType<GeneNameOption | null>, default: null},
    isRelativeToChromosome: {type: Boolean, default: false},
    externalIdentifiers: {
      type: Object as PropType<Record<string, EditableIdentifierOffset>>,
      default: () => ({})
    },
    linkedAccessions: {
      type: Object as PropType<Record<string, boolean>>,
      default: () => ({})
    },
    autofilledTargetGene: {type: Object as PropType<TargetGeneWithScoreSetUrn | null>, default: null},
    isTargetSequence: {type: Boolean, default: true},
    isMultiTarget: {type: Boolean, default: false},
    targetGeneSuggestions: {type: Array as PropType<TargetGeneWithScoreSetUrn[]>, default: () => []},
    taxonomySuggestions: {type: Array as PropType<Taxonomy[]>, default: () => []},
    assemblies: {type: Array as PropType<string[]>, default: () => []},
    geneNames: {type: Array as PropType<GeneNameOption[]>, default: () => []},
    accessionSuggestions: {type: Array as PropType<string[]>, default: () => []},
    identifierSuggestions: {
      type: Object as PropType<Record<string, ExternalGeneIdentifier[]>>,
      default: () => ({})
    },
    targetGeneSearchLoading: {type: Boolean, default: false},
    taxonomySearchLoading: {type: Boolean, default: false},
    identifierSearchLoading: {type: Object as PropType<Record<string, boolean>>, default: () => ({})},
    showSwitchToProteinButton: {type: Boolean, default: false},
    errorPrefix: {type: String, default: ''},
    wizardMode: {type: Boolean, default: false},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})}
  },

  emits: [
    'update:name',
    'update:category',
    'update:label',
    'update:sequenceType',
    'update:taxonomy',
    'update:accession',
    'update:assembly',
    'update:gene',
    'update:isRelativeToChromosome',
    'update:autofilledTargetGene',
    'update:external-identifier',
    'update:linked-accession',
    'search-target-genes',
    'autofill-from-existing',
    'search-taxonomies',
    'clear-taxonomy-search',
    'search-identifiers',
    'identifier-blur',
    'identifier-changed',
    'fetch-accessions',
    'switch-to-protein-accession',
    'file-selected',
    'file-cleared'
  ],

  setup() {
    return {isEmptySentinel}
  },

  data() {
    return {
      targetGeneCategories: TARGET_GENE_CATEGORIES,
      editorDatabases: [...EXTERNAL_GENE_DATABASES],
      editorSequenceTypes: [...SEQUENCE_TYPES]
    }
  },

  computed: {
    desc() {
      return targetDescriptions()
    }
  },

  methods: {
    textForCategory(cat: TargetGeneCategory): string {
      return textForTargetGeneCategory(cat) || ''
    },

    fieldError(field: string): string | undefined {
      const key = this.errorPrefix ? `${this.errorPrefix}.${field}` : field
      return this.validationErrors[key] ?? undefined
    },

    formatTaxonomy(option: {code?: string; organismName?: string; commonName?: string}): string {
      if (!option) return ''
      let text = option.code ? `${option.code}: ${option.organismName}` : option.organismName || ''
      if (option.commonName && option.commonName !== 'NULL') text += ` (${option.commonName})`
      return text
    },

    identifierError(dbName: string): string | undefined {
      return (
        this.fieldError(`externalIdentifiers.${dbName}.identifier.identifier`) ||
        this.fieldError(`externalIdentifiers.${dbName}.identifier`) ||
        this.fieldError(`externalIdentifiers.${dbName}`)
      )
    }
  }
})
</script>

<style scoped>
.mv-sequence-display {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
  min-width: 0;
}

.mv-sequence-display pre {
  margin: 0;
  padding: 14px 16px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-primary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 160px;
  overflow: auto;
}

.mv-sequence-display-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-top: 1px solid var(--color-mint);
  background: var(--color-mint-light);
  font-size: 13px;
}

.mv-sequence-label {
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.mv-sequence-meta {
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
