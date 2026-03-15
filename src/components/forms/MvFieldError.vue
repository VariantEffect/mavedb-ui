<template>
  <span v-if="error" :id="id || undefined" :class="['mv-field-error-msg', {warn: severity === 'warn'}]" :role="severity === 'error' ? 'alert' : undefined">
    <i :class="severity === 'warn' ? 'pi pi-exclamation-triangle' : 'pi pi-exclamation-circle'" />
    {{ error }}
  </span>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

export default defineComponent({
  name: 'MvFieldError',
  props: {
    error: {type: String as PropType<string | null>, default: null},
    id: {type: String as PropType<string | null>, default: null},
    severity: {type: String as PropType<'error' | 'warn'>, default: 'error'}
  }
})
</script>
