<template>
  <ToggleButton
    v-model="checked"
    class="!rounded-[14px] !p-0 !text-xs !font-semibold whitespace-nowrap"
    :style="tokenOverrides"
  >
    <template #default>
      <!-- A check when on, a dot when off, so the chip reads as something to include or exclude. -->
      <i v-if="modelValue" class="pi pi-check !text-[9px]" :style="{color: color || undefined}" />
      <span v-else class="size-1.5 shrink-0 rounded-full" :style="dotStyle" />
      {{ label }}
      <span v-if="count != null" class="text-xs font-bold opacity-60">{{ count }}</span>
    </template>
  </ToggleButton>
</template>

<script lang="ts">
import ToggleButton from 'primevue/togglebutton'
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'MvBadgeToggle',

  components: {ToggleButton},

  props: {
    modelValue: {type: Boolean, default: false},
    label: {type: String, required: true},
    count: {type: Number, default: undefined},
    /** CSS color for the dot (always visible) and active text */
    color: {type: String, default: undefined},
    /** CSS color for the active background tint */
    activeBackground: {type: String, default: undefined},
    /** CSS color for the active border */
    activeBorder: {type: String, default: undefined}
  },

  emits: ['update:modelValue'],

  computed: {
    checked: {
      get(): boolean {
        return this.modelValue
      },
      set(val: boolean) {
        this.$emit('update:modelValue', val)
      }
    },
    dotStyle(): Record<string, string> {
      return {background: this.color || 'var(--color-text-muted)'}
    },
    tokenOverrides(): Record<string, string> {
      if (!this.color) return {}
      const bg = this.activeBackground || this.color
      const border = this.activeBorder || this.color
      // Override PrimeVue theme tokens.
      return {
        '--p-togglebutton-checked-background': bg,
        '--p-togglebutton-checked-border-color': border,
        '--p-togglebutton-checked-color': this.color,
        '--p-togglebutton-content-checked-background': bg,
        '--p-togglebutton-content-checked-shadow': 'none'
      }
    }
  }
})
</script>
