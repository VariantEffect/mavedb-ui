<template>
  <div :class="wizardMode ? '' : 'mv-field-dividers'">
    <div v-for="kw in visibleKeywords" :key="kw.key" :class="wizardMode ? 'wizard-row' : ''">
      <!-- Wizard help column -->
      <div v-if="wizardMode" class="wizard-help">
        <label>{{ kw.key }}</label>
        <p v-if="firstOptionDescription(kw.key)" class="wizard-help-detail">
          {{ firstOptionDescription(kw.key) }}
        </p>
      </div>

      <!-- Field content -->
      <div :class="wizardMode ? 'wizard-field' : ''">
        <MvFloatField :error="validationErrors[`keywords.${kw.key}`]" :label="kw.key">
          <template #default="{id, invalid}">
            <PSelect
              :id="id"
              :aria-label="kw.key"
              fluid
              :invalid="invalid"
              :model-value="keywordKeys[kw.key]"
              :option-label="formatLabel"
              option-value="label"
              :options="optionsFor(kw.key)"
              show-clear
              @update:model-value="$emit('update:keyword-key', kw.key, $event)"
            />
          </template>
        </MvFloatField>

        <!-- "Add description" toggle with inline info (before textarea is open) -->
        <p
          v-if="
            !wizardMode &&
            !descriptionVisible(kw.key) &&
            (firstOptionDescription(kw.key) || canToggleDescription(kw.key))
          "
          class="mt-1 flex items-baseline justify-between text-xs text-text-muted"
        >
          <span v-if="firstOptionDescription(kw.key)">{{ firstOptionDescription(kw.key) }}</span>
          <span v-else />
          <button
            v-if="canToggleDescription(kw.key)"
            class="text-xs font-medium text-sage-dark hover:underline hover:text-sage cursor-pointer shrink-0 ml-2"
            type="button"
            @click="toggleDescription(kw.key)"
          >
            Add description
          </button>
        </p>

        <!-- Wizard mode: "Add description" toggle (before textarea is open) -->
        <div v-if="wizardMode && canToggleDescription(kw.key) && !descriptionVisible(kw.key)" class="mt-1 text-right">
          <button
            class="text-xs font-medium text-sage-dark hover:underline hover:text-sage cursor-pointer"
            type="button"
            @click="toggleDescription(kw.key)"
          >
            Add description
          </button>
        </div>

        <!-- Keyword description textarea -->
        <div v-if="descriptionVisible(kw.key)" class="mt-2">
          <MvFloatField
            :error="validationErrors[`keywordDescriptions.${kw.key}`]"
            :label="`${kw.descriptionLabel} ${keywordKeys[kw.key] === 'Other' ? '(Required)' : '(Optional)'}`"
          >
            <template #default="{id, invalid}">
              <PTextarea
                :id="id"
                :aria-label="kw.descriptionLabel"
                :class="wizardMode ? '' : 'w-full'"
                fluid
                :invalid="invalid"
                :model-value="keywordDescriptions[kw.key]"
                rows="4"
                @update:model-value="$emit('update:keyword-description', kw.key, $event)"
              />
            </template>
          </MvFloatField>

          <!-- Info + "Hide description" toggle (below textarea) -->
          <p
            v-if="!wizardMode && (firstOptionDescription(kw.key) || canToggleDescription(kw.key))"
            class="mt-1 flex items-baseline justify-between text-xs text-text-muted"
          >
            <span v-if="firstOptionDescription(kw.key)">{{ firstOptionDescription(kw.key) }}</span>
            <span v-else />
            <button
              v-if="canToggleDescription(kw.key)"
              class="text-xs font-medium text-sage-dark hover:underline hover:text-sage cursor-pointer shrink-0 ml-2"
              type="button"
              @click="toggleDescription(kw.key)"
            >
              Hide description
            </button>
          </p>

          <!-- Wizard mode: "Hide description" toggle -->
          <div v-if="wizardMode && canToggleDescription(kw.key)" class="mt-1 text-right">
            <button
              class="text-xs font-medium text-sage-dark hover:underline hover:text-sage cursor-pointer"
              type="button"
              @click="toggleDescription(kw.key)"
            >
              Hide description
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, nextTick, type PropType} from 'vue'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'

import MvFloatField from '@/components/forms/MvFloatField.vue'
import {KEYWORDS, type KeywordDefinition} from '@/data/keywords'
import {type KeywordOptionEntry} from '@/composables/use-keyword-options'
import {formatKeywordOptionLabel} from '@/lib/form-helpers'
import {ValidationErrors} from '@/lib/form-validation'

export default defineComponent({
  name: 'KeywordFields',

  components: {MvFloatField, PSelect: Select, PTextarea: Textarea},

  props: {
    keywordKeys: {type: Object as PropType<Record<string, string | null>>, required: true},
    keywordDescriptions: {type: Object as PropType<Record<string, string | null>>, required: true},
    keywordTextVisible: {type: Object as PropType<Record<string, boolean>>, required: true},
    keywordOptions: {type: Object as PropType<Record<string, KeywordOptionEntry>>, required: true},
    validationErrors: {type: Object as PropType<ValidationErrors>, default: () => ({})},
    wizardMode: {type: Boolean, default: false}
  },

  emits: ['update:keyword-key', 'update:keyword-description', 'toggle-description'],

  computed: {
    visibleKeywords(): KeywordDefinition[] {
      const method = this.keywordKeys['Variant Library Creation Method']
      return KEYWORDS.filter((kw) => {
        if (kw.key === 'Variant Library Creation Method') return true
        if (
          kw.key === 'Endogenous Locus Library Method System' ||
          kw.key === 'Endogenous Locus Library Method Mechanism'
        ) {
          return method === 'Endogenous locus library method'
        }
        if (
          kw.key === 'In Vitro Construct Library Method System' ||
          kw.key === 'In Vitro Construct Library Method Mechanism'
        ) {
          return method === 'In vitro construct library method'
        }
        return true
      })
    }
  },

  methods: {
    descriptionVisible(key: string): boolean {
      return this.keywordTextVisible[key] || this.keywordKeys[key] === 'Other'
    },

    canToggleDescription(key: string): boolean {
      // Show toggle when a keyword is selected and it's not "Other" (Other always shows description)
      return !!this.keywordKeys[key] && this.keywordKeys[key] !== 'Other'
    },

    formatLabel(option: {code?: string; label: string}): string {
      return formatKeywordOptionLabel(option)
    },

    optionsFor(key: string): unknown[] {
      return this.keywordOptions[key]?.items.value || []
    },

    firstOptionDescription(key: string): string | undefined {
      return (this.optionsFor(key) as Array<{description?: string}>)[0]?.description ?? undefined
    },

    toggleDescription(key: string) {
      const willOpen = !this.descriptionVisible(key)
      this.$emit('toggle-description', key)
      if (willOpen) {
        const label = this.visibleKeywords.find((k) => k.key === key)?.descriptionLabel
        if (label) {
          nextTick(() => {
            ;(this.$el.querySelector(`[aria-label="${label}"]`) as HTMLElement)?.focus()
          })
        }
      }
    }
  }
})
</script>

<style scoped>
:deep(.p-select-clear-icon) {
  transition: color 0.15s ease;
}

:deep(.p-select-clear-icon:hover) {
  color: var(--color-danger);
}
</style>
