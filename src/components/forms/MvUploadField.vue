<template>
  <div :class="error ? 'mv-field-error' : 'field'">
    <label v-if="showLabel" class="mb-1 block font-semibold text-xs text-text-secondary" :for="fieldId">{{
      label
    }}</label>
    <FileUpload
      :id="fieldId"
      ref="fileUploadRef"
      :accept="accept"
      :aria-describedby="error ? errorId : undefined"
      :aria-label="label"
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
        <div class="file-drop-prompt" @click="triggerChoose">
          <i class="pi pi-upload file-drop-icon" />
          <p class="file-drop-text">{{ emptyText }}</p>
          <p class="file-drop-browse">or click to browse</p>
        </div>
      </template>
    </FileUpload>
    <MvFieldError :id="errorId" :error="error" />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import FileUpload from 'primevue/fileupload'
import MvFieldError from '@/components/forms/MvFieldError.vue'
import {useFieldId} from '@/composables/scoped-id'

export default defineComponent({
  name: 'MvUploadField',

  components: {FileUpload, MvFieldError},

  inheritAttrs: false,

  props: {
    label: {type: String, required: true},
    accept: {type: String, default: undefined},
    error: {type: String as PropType<string | null>, default: null},
    id: {type: String as PropType<string | null>, default: null},
    emptyText: {type: String, default: 'Drop a file here'},
    showLabel: {type: Boolean, default: true}
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
  cursor: pointer;
  padding: 8px 0;
}

.file-drop-icon {
  font-size: 1.5rem;
  color: #ccc;
  margin-bottom: 6px;
}

.file-drop-text {
  font-size: 13px;
  font-weight: 600;
  color: #999;
}

.file-drop-browse {
  font-size: 12px;
  color: #bbb;
}
</style>
