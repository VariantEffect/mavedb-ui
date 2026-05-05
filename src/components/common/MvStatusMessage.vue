<template>
  <div class="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed" :class="variantClasses">
    <i class="mt-0.5 shrink-0" :class="iconClass" />
    <div class="min-w-0 flex-1">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

type Severity = 'success' | 'info' | 'warn' | 'error'

const VARIANT_CLASSES: Record<Severity, string> = {
  success: 'border-green-200 bg-green-50 text-green-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
  warn: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  error: 'border-red-200 bg-red-50 text-red-800'
}

const ICON_CLASSES: Record<Severity, string> = {
  success: 'pi pi-check-circle text-green-600',
  info: 'pi pi-info-circle text-blue-600',
  warn: 'pi pi-exclamation-triangle text-yellow-600',
  error: 'pi pi-times-circle text-red-600'
}

export default defineComponent({
  name: 'MvStatusMessage',

  props: {
    severity: {type: String as PropType<Severity>, default: 'info'}
  },

  computed: {
    variantClasses(): string {
      return VARIANT_CLASSES[this.severity]
    },
    iconClass(): string {
      return ICON_CLASSES[this.severity]
    }
  }
})
</script>
