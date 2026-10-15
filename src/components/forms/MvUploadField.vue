<template>
  <div :class="error ? 'mv-field-error' : 'field'">
    <label v-if="showLabel" class="mb-1 block font-semibold text-xs text-text-secondary" :for="fieldId">
      {{ label }}
      <MvRequiredMarker v-if="required" />
    </label>
    <FileUpload
      :id="fieldId"
      ref="fileUploadRef"
      :accept="accept"
      :aria-describedby="error ? errorId : undefined"
      :aria-label="label"
      :aria-required="required || undefined"
      :auto="false"
      :custom-upload="true"
      :file-limit="1"
      :show-cancel-button="false"
      :show-upload-button="false"
      v-bind="$attrs"
      @remove="$emit('remove')"
      @select="$emit('select', $event)"
    >
      <template #header="{chooseCallback}">
        <span class="hidden" :data-cb="storeChoose(chooseCallback)" />
      </template>
      <template #empty>
        <button :aria-label="`Choose file: ${label}`" class="file-drop-prompt" type="button" @click="triggerChoose">
          <i aria-hidden="true" class="pi pi-upload file-drop-icon" />
          <span class="file-drop-text">{{ emptyText }}</span>
          <span class="file-drop-browse">or click to browse</span>
        </button>
      </template>
    </FileUpload>
    <MvFieldError :id="errorId" :error="error" />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import FileUpload from 'primevue/fileupload'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import MvRequiredMarker from '@/components/forms/MvRequiredMarker.vue'
import {useFieldId} from '@/composables/scoped-id'

export default defineComponent({
  name: 'MvUploadField',

  components: {FileUpload, MvFieldError, MvRequiredMarker},

  inheritAttrs: false,

  props: {
    label: {type: String, required: true},
    accept: {type: String, default: undefined},
    error: {type: String as PropType<string | null>, default: null},
    id: {type: String as PropType<string | null>, default: null},
    emptyText: {type: String, default: 'Drop a file here'},
    showLabel: {type: Boolean, default: true},
    required: {type: Boolean, default: false}
  },

  emits: ['select', 'remove'],

  setup(props) {
    return useFieldId(
      () => props.label,
      () => props.id
    )
  },

  data() {
    return {
      chooseFn: null as (() => void) | null
    }
  },

  computed: {
    /** Proxy to inner FileUpload's files array so parents can access via $refs */
    files(): File[] {
      return this.getUpload()?.files ?? []
    }
  },

  methods: {
    /** Type-safe access to the inner FileUpload instance */
    getUpload(): {files: File[]} | null {
      const ref = this.$refs.fileUploadRef as InstanceType<typeof FileUpload> | null
      return ref && 'files' in ref ? (ref as unknown as {files: File[]}) : null
    },
    storeChoose(cb: () => void): string {
      this.chooseFn = cb
      return ''
    },
    triggerChoose(): void {
      if (this.chooseFn) this.chooseFn()
    },
    /** Clear the inner FileUpload's file list */
    clear(): void {
      const u = this.getUpload()
      if (u) u.files = []
    }
  }
})
</script>

<style scoped>
:deep(.p-fileupload) {
  border: none;
  background: none;
  padding: 0;
}

:deep(.p-fileupload-header) {
  display: none;
}

:deep(.p-fileupload-content) {
  border: 2px dashed var(--color-border);
  border-radius: 6px;
  padding: 28px 20px;
  text-align: center;
  color: #aaa;
  font-size: 13px;
  background: var(--color-bg);
  transition:
    border-color 0.15s,
    background 0.15s;
}

:deep(.p-fileupload-content:hover) {
  border-color: var(--color-mint);
  background: var(--color-mint-light);
}

:deep(.p-fileupload-content.p-fileupload-highlight) {
  border-color: var(--color-sage);
  background: var(--color-mint-light);
}

:deep(.p-fileupload-file-list) {
  padding: 0;
}

:deep(.p-fileupload-file) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--color-mint-light);
  border: 1px solid #c8e4c6;
  border-radius: 6px;
  font-size: 13px;
}

:deep(.p-fileupload-file-thumbnail) {
  display: none;
}

:deep(.p-fileupload-file-name) {
  font-weight: 600;
  color: var(--color-text-primary);
}

:deep(.p-fileupload-file-size) {
  font-size: 12px;
  color: var(--color-text-muted);
}

:deep(.p-fileupload-file-remove-button) {
  color: var(--color-danger);
  border-color: var(--color-danger-border);
}

.file-drop-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 8px 0;
  border: none;
  border-radius: 6px;
  background: none;
  font: inherit;
  cursor: pointer;
}

.file-drop-prompt:focus-visible {
  outline: 2px solid var(--color-sage-strong);
  outline-offset: 2px;
}

.file-drop-icon {
  font-size: 1.5rem;
  color: var(--color-text-muted);
  margin-bottom: 6px;
}

.file-drop-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.file-drop-browse {
  font-size: 12px;
  color: var(--color-text-muted);
}
</style>
