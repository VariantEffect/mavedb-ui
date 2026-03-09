<template>
  <div :aria-busy="loading" :aria-label="title || undefined" role="group">
    <InputText
      v-if="options.length > visibleLimit"
      v-model="filterText"
      :aria-label="'Filter ' + (title || 'options')"
      class="mb-1.5 w-full !py-1 !text-xs"
      :placeholder="title || 'Filter...'"
      type="text"
    />

    <div v-if="loading && options.length === 0" class="space-y-1 py-0.5">
      <span class="sr-only">Loading filter options</span>
      <div v-for="i in 5" :key="i" class="flex items-center gap-1.5 px-1">
        <div class="h-3 w-3 shrink-0 animate-pulse rounded-sm bg-gray-200" />
        <div class="h-3 animate-pulse rounded bg-gray-200" :style="{width: `${50 + ((i * 17) % 40)}%`}" />
      </div>
    </div>

    <div v-else-if="options.length === 0" class="px-1 py-1 text-xs italic text-gray-400">No filters available</div>

    <div v-else class="space-y-px transition-opacity duration-150" :class="{'pointer-events-none opacity-50': loading}">
      <label
        v-for="option in visibleOptions"
        :key="option.value"
        class="flex cursor-pointer items-center gap-1.5 rounded px-1 py-[3px] text-xs leading-tight hover:bg-gray-50"
        :class="{'font-semibold text-gray-800': isSelected(option.value), 'text-gray-600': !isSelected(option.value)}"
      >
        <input
          :checked="isSelected(option.value)"
          class="accent-sage h-3 w-3 shrink-0"
          type="checkbox"
          @change="toggleOption(option.value)"
        />
        <span class="min-w-0 truncate" :class="optionClass" :title="displayLabel(option)">{{ displayLabel(option) }}</span>
        <span v-if="option.badge" class="ml-auto shrink-0 text-xs tabular-nums text-gray-400">
          <span class="sr-only">({{ option.badge }} results)</span>
          <span aria-hidden="true">{{ option.badge }}</span>
        </span>
      </label>
    </div>

    <div v-if="filteredOptions.length > visibleLimit && !filterText" class="mt-1 flex gap-2">
      <button
        v-if="visibleOptions.length < filteredOptions.length"
        class="cursor-pointer border-none bg-transparent px-1 text-xs font-semibold text-link"
        @click="showMore"
      >
        See next {{ Math.min(visibleLimit, filteredOptions.length - visibleOptions.length) }}
      </button>
      <button
        v-if="expandedCount > 0"
        class="cursor-pointer border-none bg-transparent px-1 text-xs font-semibold text-link"
        @click="expandedCount = 0"
      >
        See less
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import InputText from 'primevue/inputtext'

interface FilterOption {
  value: string
  badge?: number
  title?: string
}

export default defineComponent({
  name: 'MvSelectList',

  components: {InputText},

  props: {
    modelValue: {
      type: Array as PropType<string[]>,
      default: () => []
    },
    options: {
      type: Array as PropType<FilterOption[]>,
      default: () => []
    },
    optionLabel: {
      type: Function as PropType<(value: string) => string>,
      default: null
    },
    optionClass: {
      type: String,
      default: ''
    },
    title: {
      type: String,
      default: null
    },
    visibleLimit: {
      type: Number,
      default: 10
    },
    loading: {
      type: Boolean,
      default: false
    }
  },

  emits: ['update:modelValue'],

  data() {
    return {
      filterText: '',
      expandedCount: 0
    }
  },

  computed: {
    sortedOptions(): FilterOption[] {
      return [...this.options].sort((a, b) => (b.badge || 0) - (a.badge || 0))
    },
    filteredOptions(): FilterOption[] {
      if (!this.filterText) return this.sortedOptions
      const query = this.filterText.toLowerCase()
      return this.sortedOptions.filter((o) => {
        const label = this.displayLabel(o).toLowerCase()
        return label.includes(query)
      })
    },
    visibleOptions(): FilterOption[] {
      if (this.filterText) return this.filteredOptions
      return this.filteredOptions.slice(0, this.visibleLimit + this.expandedCount)
    }
  },

  watch: {
    // When the available options change (e.g. after an API refresh), remove any
    // selected values that no longer appear in the new option set. This prevents
    // stale filter selections from persisting after the options list narrows.
    options() {
      const optionValues = this.options.map((o) => o.value)
      const filtered = this.modelValue.filter((v) => optionValues.includes(v))
      if (filtered.length !== this.modelValue.length) {
        this.$emit('update:modelValue', filtered)
      }
    }
  },

  methods: {
    isSelected(value: string): boolean {
      return this.modelValue.includes(value)
    },
    toggleOption(value: string) {
      const selected = [...this.modelValue]
      const index = selected.indexOf(value)
      if (index >= 0) {
        selected.splice(index, 1)
      } else {
        selected.push(value)
      }
      this.$emit('update:modelValue', selected)
    },
    showMore() {
      this.expandedCount += this.visibleLimit
    },
    displayLabel(option: FilterOption): string {
      if (this.optionLabel) return this.optionLabel(option.value) || option.value
      return option.title || option.value
    }
  }
})
</script>
