import {computed, nextTick, ref, type ComputedRef, type Ref} from 'vue'
import {type ValidationErrors, mergeValidationErrors, scrollToFirstError} from '@/lib/form-validation'

export interface ValidationErrorState {
  /** Merged view of server + client errors, used by templates. */
  validationErrors: Ref<ValidationErrors>
  /** The total number of validation errors. */
  totalValidationErrors: ComputedRef<number>
  /** True when there are any validation errors. */
  hasValidationErrors: ComputedRef<boolean>
  /** Set server-side errors (from API response) and re-merge. */
  setServerErrors: (errors: ValidationErrors) => void
  /** Clear server-side errors and re-merge. */
  clearServerErrors: () => void
  /** Set a single client-side error and re-merge. */
  setClientError: (key: string, message: string) => void
  /** Remove a single client-side error and re-merge. */
  clearClientError: (key: string) => void
  /** Clear all client-side errors and re-merge. */
  clearClientErrors: () => void
  /** Reset all error state to empty. */
  clearValidationState: () => void
}

/**
 * Composable for managing form validation errors with server/client separation.
 *
 * Maintains separate server-side (from API responses) and client-side (from
 * local validation) error maps, merging them into a single `validationErrors`
 * ref that templates bind to. All mutations automatically re-merge. Server
 * errors scroll to the first error field; client errors do not (to avoid
 * repeated scrolls when setting multiple errors in sequence).
 *
 * Used by: ExperimentCreator.vue, ExperimentEditor.vue, ScoreSetCreator.vue,
 *          ScoreSetEditor.vue, useCalibrationEditor
 *
 * @example
 * ```ts
 * const validation = useValidationErrors()
 * // Pass validation.validationErrors to field components
 * // On API error: validation.setServerErrors(response.errors)
 * // On local check: validation.setClientError('title', 'Title is required')
 * ```
 */
export function useValidationErrors(): ValidationErrorState {
  const serverErrors = ref<ValidationErrors>({})
  const clientErrors = ref<ValidationErrors>({})
  const validationErrors = ref<ValidationErrors>({})
  const totalValidationErrors = computed(() => Object.keys(validationErrors.value).length)
  const hasValidationErrors = computed(() => totalValidationErrors.value > 0)

  let scrollPending = false
  function refresh(scroll = false) {
    validationErrors.value = mergeValidationErrors(serverErrors.value, clientErrors.value)
    if (scroll && Object.values(validationErrors.value).some(Boolean) && !scrollPending) {
      scrollPending = true
      nextTick(() => {
        scrollPending = false
        scrollToFirstError()
      })
    }
  }

  function setServerErrors(errors: ValidationErrors) {
    serverErrors.value = errors
    refresh(true)
  }

  function clearServerErrors() {
    serverErrors.value = {}
    refresh()
  }

  function setClientError(key: string, message: string) {
    clientErrors.value[key] = message
    refresh()
  }

  function clearClientError(key: string) {
    delete clientErrors.value[key]
    refresh()
  }

  function clearClientErrors() {
    clientErrors.value = {}
    refresh()
  }

  function clearValidationState() {
    serverErrors.value = {}
    clientErrors.value = {}
    validationErrors.value = {}
  }

  return {
    validationErrors,
    totalValidationErrors,
    hasValidationErrors,
    setServerErrors,
    clearServerErrors,
    setClientError,
    clearClientError,
    clearClientErrors,
    clearValidationState
  }
}
