<template>
  <div :class="error ? 'mv-field-error' : 'field'">
    <div class="mb-1 flex items-center justify-between">
      <button
        :aria-label="previewing ? 'Switch to edit mode' : 'Preview markdown'"
        :aria-pressed="previewing"
        class="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors"
        :class="previewing ? 'bg-sage/15 text-sage-dark' : 'text-text-muted hover:text-text-secondary'"
        type="button"
        @click="previewing = !previewing"
      >
        <i class="pi" :class="previewing ? 'pi-pencil' : 'pi-eye'" />
        <span class="hover:underline hover:cursor-pointer">{{ previewing ? 'Edit' : 'Preview' }}</span>
      </button>
    </div>

    <MvFloatField :label="label">
      <template #default>
        <div v-if="previewing" class="markdown-preview p-inputwrapper-filled">
          <!-- eslint-disable vue/no-v-html -->
          <div
            :aria-label="`${label} preview`"
            class="prose max-w-none text-sm"
            role="document"
            v-html="renderedHtml"
          ></div>
          <!-- eslint-enable vue/no-v-html -->
          <p v-if="!modelValue" class="text-sm text-text-muted italic">Nothing to preview</p>
        </div>
        <PTextarea
          v-else
          :id="fieldId"
          :aria-describedby="error ? errorId : undefined"
          class="w-full"
          fluid
          :invalid="!!error"
          :model-value="modelValue"
          :rows="rows"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </template>
    </MvFloatField>
    <p v-if="hint && !error" class="mt-1 text-xs text-text-muted">{{ hint }}</p>
    <MvFieldError :id="errorId" :error="error" />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import Textarea from 'primevue/textarea'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import {markdownToHtml} from '@/lib/form-helpers'
import {useFieldId} from '@/composables/scoped-id'

export default defineComponent({
  name: 'MvMarkdownField',

  components: {MvFieldError, MvFloatField, PTextarea: Textarea},

  props: {
    modelValue: {type: String as PropType<string | null>, default: null},
    label: {type: String, required: true},
    rows: {type: Number, default: 10},
    error: {type: String as PropType<string | null>, default: null},
    id: {type: String as PropType<string | null>, default: null},
    hint: {type: String as PropType<string | null>, default: null}
  },

  emits: ['update:modelValue'],

  setup(props) {
    return useFieldId(
      () => props.label,
      () => props.id
    )
  },

  data() {
    return {
      previewing: false
    }
  },

  computed: {
    renderedHtml(): string {
      return markdownToHtml(this.modelValue)
    }
  }
})
</script>

<style scoped>
.markdown-preview {
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  min-height: 4rem;
  background-color: var(--color-surface);
}
</style>
