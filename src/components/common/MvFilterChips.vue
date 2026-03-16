<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <span class="text-xs font-semibold uppercase tracking-wider text-text-muted">Show:</span>
    <template v-for="(group, gi) in chipGroups" :key="gi">
      <div v-if="gi > 0" aria-hidden="true" class="mx-1 h-[18px] w-px bg-border" />
      <button
        v-for="chip in group"
        :key="chip.value"
        :aria-pressed="isActive(chip.value)"
        class="rounded-[14px] border-[1.5px] px-3 py-1 text-xs font-semibold transition-all"
        :class="
          isActive(chip.value)
            ? 'border-sage bg-chip text-sage hover:cursor-pointer hover:bg-white'
            : 'border-border bg-white text-text-secondary hover:border-sage hover:text-sage hover:cursor-pointer'
        "
        type="button"
        @click="toggle(chip)"
      >
        {{ chip.label }}
        <span v-if="chip.count != null" class="ml-0.5 text-xs opacity-70">({{ chip.count }})</span>
      </button>
    </template>
    <button
      v-if="!modelValue.includes('all') || dirty"
      aria-label="Clear all filters"
      class="ml-0.5 flex size-[22px] items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 hover:cursor-pointer"
      title="Clear all filters"
      type="button"
      @click="onClick()"
    >
      <i class="pi pi-times text-xs" />
    </button>
    <slot />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

export interface FilterChip {
  value: string
  label: string
  count?: number
  group: string
}

export default defineComponent({
  name: 'MvFilterChips',

  props: {
    filters: {type: Array as PropType<FilterChip[]>, required: true},
    modelValue: {type: Array as PropType<string[]>, default: () => ['all']},
    dirty: {type: Boolean, default: false}
  },

  emits: ['update:modelValue', 'clear'],

  computed: {
    chipGroups(): FilterChip[][] {
      const groups: FilterChip[][] = []
      let lastGroup: string | null = null
      for (const chip of this.filters) {
        if (chip.group !== lastGroup) {
          groups.push([])
          lastGroup = chip.group
        }
        groups[groups.length - 1].push(chip)
      }
      return groups
    }
  },

  methods: {
    isActive(value: string): boolean {
      return this.modelValue.includes(value)
    },
    onClick() {
      this.$emit('update:modelValue', ['all'])
      this.$emit('clear')
    },
    toggle(chip: FilterChip) {
      if (chip.value === 'all') {
        this.$emit('update:modelValue', ['all'])
        return
      }

      const siblings = new Set(this.filters.filter((f) => f.group === chip.group).map((f) => f.value))
      let current = this.modelValue.filter((v) => v !== 'all')
      const index = current.indexOf(chip.value)

      if (index >= 0) {
        current.splice(index, 1)
      } else {
        current = current.filter((v) => !siblings.has(v))
        current.push(chip.value)
      }

      this.$emit('update:modelValue', current.length === 0 ? ['all'] : current)
    }
  }
})
</script>
