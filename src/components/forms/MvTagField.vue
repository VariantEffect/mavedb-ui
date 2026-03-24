<template>
  <div :class="error ? 'mv-field-error' : 'field'">
    <FloatLabel variant="on">
      <AutoComplete
        :id="fieldId"
        ref="autoCompleteRef"
        :aria-describedby="error ? errorId : undefined"
        :aria-label="label"
        class="w-full"
        :invalid="!!error"
        :model-value="modelValue"
        :multiple="true"
        :option-label="resolvedOptionLabel"
        :suggestions="suggestions"
        :typeahead="typeahead"
        v-bind="$attrs"
        @blur="onBlur"
        @complete="$emit('complete', $event)"
        @keydown.space="onSpace"
        @keyup.escape="$emit('escape', $event)"
        @option-select="onOptionSelect"
        @update:model-value="$emit('update:modelValue', $event)"
      >
        <template #chip="{value}">
          <span class="mv-chip">
            <span class="mv-chip-label">{{ chipLabel(value) }}</span>
            <span aria-hidden="true" class="mv-chip-remove" @click.stop="removeChip(value)">&times;</span>
          </span>
        </template>
        <template #option="slotProps">
          <template v-if="isEmptySentinel(slotProps.option)">
            <div class="text-center text-sm text-text-muted">No results found.</div>
          </template>
          <slot v-else name="option" v-bind="slotProps">
            {{ defaultOptionLabel(slotProps.option) }}
          </slot>
        </template>
      </AutoComplete>
      <label :for="fieldId">{{ label }}</label>
    </FloatLabel>
    <p v-if="hint && !error" class="mt-1 text-xs text-text-muted">{{ hint }}</p>
    <MvFieldError :id="errorId" :error="error" />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import AutoComplete from 'primevue/autocomplete'
import FloatLabel from 'primevue/floatlabel'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import {useFieldId} from '@/composables/scoped-id'
import {isEmptySentinel} from '@/lib/form-helpers'

export default defineComponent({
  name: 'MvTagField',

  components: {AutoComplete, FloatLabel, MvFieldError},

  inheritAttrs: false,

  props: {
    modelValue: {type: Array as PropType<unknown[]>, default: () => []},
    label: {type: String, required: true},
    error: {type: String as PropType<string | null>, default: null},
    id: {type: String as PropType<string | null>, default: null},
    optionLabel: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: [String, Function] as PropType<string | ((item: any) => string)>,
      default: 'identifier'
    },
    suggestions: {type: Array as PropType<unknown[]>, default: () => []},
    typeahead: {type: Boolean, default: false},
    hint: {type: String, default: null}
  },

  emits: ['update:modelValue', 'blur', 'complete', 'escape', 'option-select'],

  setup(props) {
    return {...useFieldId(() => props.label, () => props.id)}
  },

  data() {
    return {
      autoCompleteRef: null as InstanceType<typeof AutoComplete> | null
    }
  },

  computed: {
    // PrimeVue's resolveFieldData only supports string property paths, not functions.
    resolvedOptionLabel(): string | undefined {
      return typeof this.optionLabel === 'function' ? undefined : this.optionLabel
    }
  },

  methods: {
    isEmptySentinel,
    defaultOptionLabel(option: unknown): string {
      return this.chipLabel(option)
    },

    chipLabel(item: unknown): string {
      if (item == null) return ''
      if (typeof item === 'string') return item
      if (typeof this.optionLabel === 'function') return this.optionLabel(item)
      const obj = item as Record<string, unknown>
      if (typeof this.optionLabel === 'string' && this.optionLabel in obj) return String(obj[this.optionLabel])
      return String(item)
    },

    removeChip(item: unknown) {
      const updated = this.modelValue.filter((v) => v !== item)
      this.$emit('update:modelValue', updated)
    },

    hideOverlay() {
      const ac = this.autoCompleteRef as Record<string, unknown> | null
      if (ac && typeof ac.hide === 'function') (ac.hide as () => void)()
    },

    /** On space, treat the current input as a submitted value (these fields never contain spaces). */
    onSpace(event: KeyboardEvent) {
      // Typeahead fields require selection from the dropdown — don't inject raw text.
      if (this.typeahead) return

      event.preventDefault()
      const target = event.target as HTMLInputElement | null
      const text = target?.value?.trim()
      if (!text) return
      if (target) target.value = ''
      this.$emit('update:modelValue', [...this.modelValue, text])
    },

    onBlur(event: Event) {
      this.hideOverlay()
      this.$emit('blur', event)
    },

    onOptionSelect(event: {originalEvent: Event; value: unknown}) {
      this.hideOverlay()
      this.$emit('option-select', event)
    }
  }
})
</script>

<style scoped>
.mv-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--color-light-green);
  color: var(--color-sage-dark);
  border: 1px solid var(--color-mint);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.mv-chip-remove {
  color: #767676;
  font-size: 14px;
  cursor: pointer;
  line-height: 1;
  margin-left: 2px;
}

.mv-chip-remove:hover {
  color: var(--color-danger);
}
</style>
