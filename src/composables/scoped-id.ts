import {computed, toValue, type ComputedRef, type MaybeRefOrGetter} from 'vue'
import {v4 as uuidv4} from 'uuid'

/**
 * Return type for {@link useScopedId}.
 *
 * Provides a factory function that generates UUID-scoped DOM IDs,
 * useful for ARIA attributes and custom DOM bindings.
 */
export interface UseScopedIdReturn {
  /** Generate a scoped ID string, optionally suffixed with the given label. */
  scopedId: (id?: string) => string
}

/**
 * Return type for {@link useFieldId}.
 *
 * Provides reactive, label-derived IDs for form field components,
 * including a matching error-message ID for ARIA `aria-describedby`.
 */
export interface UseFieldIdReturn {
  /** Reactive ID for the form field element. Uses an explicit id prop when provided, otherwise derives one from the label. */
  fieldId: ComputedRef<string>
  /** Reactive ID for the field's error message element (`{fieldId}-error`). */
  errorId: ComputedRef<string>
}

/**
 * Low-level composable: generates a UUID-scoped ID factory. Use this when you
 * need arbitrary scoped IDs (e.g. for ARIA attributes or custom DOM bindings).
 *
 * ```ts
 * // In setup():
 * const {scopedId} = useScopedId()
 * const panelId = scopedId('details-panel') // "uid-<uuid>-details-panel"
 * ```
 */
export default function useScopedId(): UseScopedIdReturn {
  const uniqueId = uuidv4()
  return {
    scopedId: (id?: string) => `uid-${uniqueId}${id ? '-' + id : ''}`
  }
}

/**
 * Higher-level composable for form field components: derives a reactive
 * `fieldId` and matching `errorId` from a label and optional explicit id.
 * Accepts refs, getters, or plain values for both parameters.
 *
 * Prefer this over `useScopedId()` in form field components — it replaces
 * the repeated `useScopedId()` + `fieldId` + `errorId` computed boilerplate.
 *
 * ```ts
 * // In a defineComponent setup():
 * setup(props) {
 *   return useFieldId(() => props.label, () => props.id)
 * }
 * // Template can then use `fieldId` and `errorId` directly.
 * ```
 */
export function useFieldId(label: MaybeRefOrGetter<string>, id?: MaybeRefOrGetter<string | null>): UseFieldIdReturn {
  const {scopedId} = useScopedId()

  const fieldId = computed(() => {
    const explicit = toValue(id)
    if (explicit) return explicit
    return scopedId(`field-${toValue(label).toLowerCase().replace(/\s+/g, '-')}`)
  })

  const errorId = computed(() => `${fieldId.value}-error`)

  return {fieldId, errorId}
}
