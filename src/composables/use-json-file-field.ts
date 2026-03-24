import {ref, type Ref} from 'vue'
import type {FileUploadSelectEvent} from 'primevue/fileupload'
import {validateJsonObject} from '@/lib/form-validation'

/** Union of JSON file input names used by score set Creator/Editor file routing. */
export type JsonFileInputName = 'extraMetadataFile' | 'scoreColumnsMetadataFile' | 'countColumnsMetadataFile'

export interface JsonFileField {
  /** The parsed JSON data, or null if no file is loaded / parse failed. */
  data: Ref<Record<string, unknown> | null>
  /** Validation error message, or null if valid. */
  error: Ref<string | null>
  /** Handle a PrimeVue FileUpload select event: parse and validate the file. */
  onSelect: (event: FileUploadSelectEvent) => Promise<void>
  /** Clear the loaded data and any validation error. */
  onClear: () => void
}

/**
 * Composable for managing a JSON file upload field with validation.
 *
 * Handles the read → parse → validate cycle for uploaded JSON files and exposes
 * reactive `data` and `error` refs that the consuming component can integrate
 * into its validation-error aggregation.
 *
 * Used by: ScoreSetCreator.vue, ScoreSetEditor.vue (one instance per JSON field)
 *
 * @param fieldName - The field name used in validation error messages (e.g. "extraMetadata")
 *
 * @example
 * ```ts
 * const extraMetadata = useJsonFileField('extraMetadata')
 * // Template: @select="extraMetadata.onSelect" :error="extraMetadata.error.value"
 * // On save: payload.extraMetadata = extraMetadata.data.value
 * ```
 */
export function useJsonFileField(fieldName: string): JsonFileField {
  const data = ref<Record<string, unknown> | null>(null)
  const error = ref<string | null>(null)

  async function onSelect(event: FileUploadSelectEvent) {
    const file = event.files[0]
    if (!file) return
    const text = await file.text()
    try {
      data.value = JSON.parse(text)
      error.value = validateJsonObject(data.value, fieldName) ?? null
    } catch {
      data.value = null
      error.value = 'The file did not contain valid JSON text.'
    }
  }

  function onClear() {
    data.value = null
    error.value = null
  }

  return {data, error, onSelect, onClear}
}
