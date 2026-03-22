<template>
  <div :class="wizardMode ? '' : 'mv-field-dividers'">
    <!-- Fixed experiment (from prop or loaded item) -->
    <div v-if="fixedExperimentUrn && fixedExperimentTitle" :class="wizardMode && 'wizard-row'">
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ desc.fixedExperiment.help }}: {{ fixedExperimentUrn }}</label>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-if="desc.fixedExperiment.detail" class="wizard-help-detail" v-html="desc.fixedExperiment.detail" />
      </div>
      <div :class="wizardMode && 'wizard-field'">
        Experiment:
        <router-link class="text-link" :to="{name: 'experiment', params: {urn: fixedExperimentUrn}}">
          {{ fixedExperimentTitle }}
        </router-link>
      </div>
    </div>

    <!-- Configurable context (no fixed experiment) -->
    <template v-else>
      <!-- Superseding toggle -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.superseding.help }}</label>
        </div>
        <div :class="wizardMode ? 'wizard-field flex items-center' : 'flex items-center'">
          <ToggleSwitch :model-value="isSuperseding" @update:model-value="$emit('update:isSuperseding', $event)" />
          <div class="ml-3 text-sm">
            {{
              isSuperseding ? 'Yes, this supersedes another score set' : 'No, this does not supersede another score set'
            }}
          </div>
        </div>
      </div>

      <!-- Superseded score set selector -->
      <div v-if="isSuperseding" :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          {{ desc.supersededScoreSet.help }}
          <p v-if="desc.supersededScoreSet.detail" class="wizard-help-detail">{{ desc.supersededScoreSet.detail }}</p>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvFloatField :error="validationErrors.supersededScoreSetUrn" label="Supersedes">
            <template #default="{id, invalid}">
              <AutoComplete
                :id="id"
                field="title"
                fluid
                :force-selection="true"
                :invalid="invalid"
                :loading="supersededLoading"
                :model-value="supersededScoreSet"
                option-label="title"
                :suggestions="supersededSuggestions"
                @complete="$emit('search-superseded', $event)"
                @option-select="$emit('superseded-selected', $event)"
                @update:model-value="$emit('update:supersededScoreSet', $event)"
              >
                <template #option="slotProps">
                  <div v-if="isEmptySentinel(slotProps.option)" class="text-center text-sm text-text-muted">
                    No matching score sets found.
                  </div>
                  <div v-else-if="slotProps.option.urn && slotProps.option.title">
                    {{ slotProps.option.urn }}: {{ slotProps.option.title }}
                  </div>
                </template>
              </AutoComplete>
            </template>
          </MvFloatField>
        </div>
      </div>

      <!-- Meta-analysis toggle -->
      <div :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          <label>{{ desc.metaAnalysis.help }}</label>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.metaAnalysis.detail" class="wizard-help-detail" v-html="desc.metaAnalysis.detail" />
        </div>
        <div :class="wizardMode ? 'wizard-field flex items-center' : 'flex items-center'">
          <ToggleSwitch :model-value="isMetaAnalysis" @update:model-value="$emit('update:isMetaAnalysis', $event)" />
          <div class="ml-3 text-sm">
            {{ isMetaAnalysis ? 'Yes, this is a meta-analysis' : 'No, this is not a meta-analysis' }}
          </div>
        </div>
      </div>

      <!-- Meta-analysis score set selector -->
      <div v-if="isMetaAnalysis" :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          {{ desc.metaAnalyzesScoreSets.help }}
          <p v-if="desc.metaAnalyzesScoreSets.detail" class="wizard-help-detail">
            {{ desc.metaAnalyzesScoreSets.detail }}
          </p>
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvTagField
            :error="validationErrors.metaAnalyzesScoreSetUrns"
            label="Meta-analysis for"
            :loading="metaAnalyzesLoading"
            :model-value="metaAnalyzesScoreSets"
            option-label="title"
            :suggestions="metaAnalyzesSuggestions"
            :typeahead="true"
            @complete="$emit('search-meta-analyzes', $event)"
            @update:model-value="$emit('update:metaAnalyzesScoreSets', $event)"
          >
            <template #option="slotProps">
              <div v-if="slotProps.option.urn && slotProps.option.title">
                {{ slotProps.option.urn }}: {{ slotProps.option.title }}
              </div>
            </template>
          </MvTagField>
        </div>
      </div>

      <!-- Experiment selector (when not superseding and not meta-analysis) -->
      <div v-if="!isSuperseding && !isMetaAnalysis" :class="wizardMode && 'wizard-row'">
        <div v-if="wizardMode" class="wizard-help">
          {{ desc.experiment.help }}
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="desc.experiment.detail" class="wizard-help-detail" v-html="desc.experiment.detail" />
        </div>
        <div :class="wizardMode && 'wizard-field'">
          <MvFloatField :error="validationErrors.experiment" label="Experiment">
            <template #default="{id, invalid}">
              <PSelect
                :id="id"
                filter
                fluid
                :invalid="invalid"
                :model-value="experiment"
                option-label="title"
                :options="editableExperiments"
                :virtual-scroller-options="{itemSize: 50}"
                @update:model-value="$emit('update:experiment', $event)"
              >
                <template #option="slotProps"> {{ slotProps.option.urn }}: {{ slotProps.option.title }} </template>
                <template #empty>
                  <div class="p-2.5 text-center">No experiments found.</div>
                </template>
              </PSelect>
            </template>
          </MvFloatField>
        </div>
      </div>
    </template>

    <!-- Read-only context display (editor mode - supersedes/meta-analysis info) -->
    <div v-if="!wizardMode && supersedesUrn">
      Supersedes:
      <MvEntityLink entity-type="scoreSet" :urn="supersedesUrn" :use-cache="true" />
    </div>
    <div v-if="!wizardMode && metaAnalyzesUrns && metaAnalyzesUrns.length > 0">
      Meta-analysis for:<br />
      <div v-for="urn of metaAnalyzesUrns" :key="urn">
        <MvEntityLink entity-type="scoreSet" :urn="urn" :use-cache="true" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Select from 'primevue/select'
import ToggleSwitch from 'primevue/toggleswitch'

import MvEntityLink from '@/components/common/MvEntityLink.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import {components} from '@/schema/openapi'
import MvTagField from '@/components/forms/MvTagField.vue'
import {scoreSetContextDescriptions} from '@/data/field-descriptions'
import {isEmptySentinel} from '@/lib/form-helpers'
import {ValidationErrors} from '@/lib/form-validation'

type Experiment = components['schemas']['Experiment']
type ScoreSet = components['schemas']['ScoreSet']

export default defineComponent({
  name: 'ScoreSetContextFields',

  components: {AutoComplete, MvEntityLink, MvFloatField, MvTagField, PSelect: Select, ToggleSwitch},

  props: {
    // Fixed experiment context (from route prop or loaded item)
    fixedExperimentUrn: {type: String, default: null},
    fixedExperimentTitle: {type: String, default: null},
    // Configurable context (creator mode)
    isSuperseding: {type: Boolean, default: false},
    isMetaAnalysis: {type: Boolean, default: false},
    experiment: {type: Object as PropType<Experiment | null>, default: null},
    editableExperiments: {type: Array as PropType<Experiment[]>, default: () => []},
    supersededScoreSet: {type: Object as PropType<ScoreSet | null>, default: null},
    supersededSuggestions: {type: Array as PropType<ScoreSet[]>, default: () => []},
    supersededLoading: {type: Boolean, default: false},
    metaAnalyzesScoreSets: {type: Array as PropType<ScoreSet[]>, default: () => []},
    metaAnalyzesSuggestions: {type: Array as PropType<ScoreSet[]>, default: () => []},
    metaAnalyzesLoading: {type: Boolean, default: false},
    // Read-only display (editor mode)
    supersedesUrn: {type: String, default: null},
    metaAnalyzesUrns: {type: Array as PropType<string[]>, default: () => []},
    // Common
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})},
    wizardMode: {type: Boolean, default: false}
  },

  emits: [
    'update:isSuperseding',
    'update:isMetaAnalysis',
    'update:experiment',
    'update:supersededScoreSet',
    'update:metaAnalyzesScoreSets',
    'search-superseded',
    'search-meta-analyzes',
    'superseded-selected'
  ],

  setup() {
    return {
      desc: scoreSetContextDescriptions(),
      isEmptySentinel
    }
  }
})
</script>
