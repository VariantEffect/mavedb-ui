<template>
  <div class="relative">
    <AutoComplete
      :id="id"
      v-model="localSelection"
      :delay="300"
      fluid
      :input-style="hasSelection ? {paddingRight: '2.25rem'} : undefined"
      :invalid="invalid"
      :loading="loading"
      :option-label="formatDisease"
      :suggestions="suggestions"
      @complete="onSearch"
    >
      <template #option="{option}">
        <div class="flex min-w-0 items-baseline gap-2">
          <span class="truncate">{{ option.label }}</span>
          <span class="shrink-0 font-mono text-xs text-text-muted">{{ option.code }}</span>
        </div>
      </template>
      <template #empty>
        <div class="p-2.5 text-center text-sm text-text-muted">
          {{ searchQuery ? 'No matching disease terms.' : 'Type to search MONDO disease terms.' }}
        </div>
      </template>
    </AutoComplete>
    <button
      v-if="hasSelection"
      aria-label="Reset to generic disease"
      class="absolute right-3 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-red-50 hover:text-red-600"
      type="button"
      @click="resetToGeneric"
    >
      <i class="pi pi-times text-[10px]" />
    </button>
  </div>
</template>

<script lang="ts">
import AutoComplete from 'primevue/autocomplete'
import {defineComponent, markRaw, type PropType} from 'vue'

import {searchDiseases} from '@/api/mavedb'
import {GENERIC_DISEASE, MONDO_GENERIC_CODE, type DraftDisease} from '@/lib/diseases'

/**
 * A MONDO disease typeahead. Searches `/diseases/search` (debounced) and surfaces the chosen term as a
 * `{code, label}` via v-model. The selected value renders through a function `optionLabel`
 * (`formatDisease`), which PrimeVue's `resolveFieldData` supports; dropdown rows use the `#option` slot.
 * Reset returns the field to the generic "disease or disorder" term (the explicit default).
 */
export default defineComponent({
  name: 'DiseaseAutocomplete',

  components: {AutoComplete},

  props: {
    modelValue: {type: Object as PropType<DraftDisease | null>, default: null},
    id: {type: String, default: undefined},
    invalid: {type: Boolean, default: false}
  },

  emits: ['update:modelValue'],

  data() {
    return {
      // The AutoComplete's own model: the selected DraftDisease, or the transient typed string.
      localSelection: this.modelValue as DraftDisease | string | null,
      suggestions: [] as DraftDisease[],
      searchQuery: '',
      loading: false,
      // Aborts the previous search when a new one starts. markRaw keeps it out of the reactive proxy so
      // calling .abort() doesn't hit an "Illegal invocation" on a wrapped controller.
      searchController: null as AbortController | null
    }
  },

  computed: {
    hasSelection(): boolean {
      // A specific disease is clearable back to the generic; the generic itself needs no reset control.
      return (
        typeof this.localSelection === 'object' &&
        this.localSelection !== null &&
        this.localSelection.code !== MONDO_GENERIC_CODE
      )
    }
  },

  watch: {
    // Mirror parent-driven changes into the local model, without clobbering an in-progress typed query.
    modelValue(value: DraftDisease | null) {
      if (typeof this.localSelection !== 'string' && value !== this.localSelection) {
        this.localSelection = value
      }
    },
    // Surface a real selection (an object) or a clear; ignore the transient typed string.
    localSelection(value: DraftDisease | string | null) {
      if (typeof value === 'string') return
      const next = value ?? null
      if (JSON.stringify(next) !== JSON.stringify(this.modelValue)) {
        this.$emit('update:modelValue', next)
      }
    }
  },

  beforeUnmount() {
    this.searchController?.abort()
  },

  methods: {
    // "Label (MONDO:xxxx)" for both the dropdown options and the selected input, so the code is always
    // visible for verification. PrimeVue's resolveFieldData supports a function optionLabel.
    formatDisease(item: DraftDisease | string): string {
      return typeof item === 'string' ? item : `${item.label} (${item.code})`
    },

    async onSearch(event: {query: string}) {
      const query = event.query.trim()
      this.searchQuery = query
      if (!query) {
        this.searchController?.abort()
        this.suggestions = []
        return
      }

      // Cancel the prior search so a slower earlier response can't clobber this one's results.
      this.searchController?.abort()
      const controller = markRaw(new AbortController())
      this.searchController = controller

      this.loading = true
      try {
        const concepts = await searchDiseases(query, controller.signal)
        this.suggestions = concepts
          .map((concept) => ({
            code: concept.primaryCoding?.code ?? '',
            label: concept.name || concept.primaryCoding?.code || ''
          }))
          .filter((term) => term.code)
      } catch (error) {
        if (controller.signal.aborted) return // Superseded by a newer query; leave its results alone.
        console.error('Error searching disease terms:', error)
        this.suggestions = []
      } finally {
        // Only the latest request owns the loading flag; an aborted, superseded one must not clear it.
        if (this.searchController === controller) {
          this.loading = false
        }
      }
    },

    resetToGeneric() {
      this.localSelection = {...GENERIC_DISEASE}
    }
  }
})
</script>
