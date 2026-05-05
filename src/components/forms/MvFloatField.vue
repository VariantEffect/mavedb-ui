<template>
  <div :class="error ? 'mv-field-error' : ''">
    <FloatLabel variant="on">
      <slot :id="fieldId" :error-id="error ? errorId : undefined" :invalid="!!error" />
      <label :for="fieldId">{{ label }}</label>
    </FloatLabel>
    <p v-if="hint && !error" class="mt-1 text-xs text-text-muted">{{ hint }}</p>
    <MvFieldError :id="errorId" :error="error" />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import FloatLabel from 'primevue/floatlabel'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import {useFieldId} from '@/composables/scoped-id'

export default defineComponent({
  name: 'MvFloatField',

  components: {FloatLabel, MvFieldError},

  props: {
    label: {type: String, required: true},
    error: {type: String as PropType<string | null>, default: null},
    id: {type: String as PropType<string | null>, default: null},
    hint: {type: String as PropType<string | null>, default: null}
  },

  setup(props) {
    return useFieldId(() => props.label, () => props.id)
  }
})
</script>
