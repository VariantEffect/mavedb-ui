import {computed} from 'vue'
import {useToast} from 'primevue/usetoast'

import {
  addContributor,
  addDoiIdentifier,
  acceptNewPublicationIdentifier,
  clearAutoCompleteInput,
  normalizeDoiArray
} from '@/lib/form-helpers'
import {components} from '@/schema/openapi'

type DoiIdentifierCreate = components['schemas']['DoiIdentifierCreate']
type Contributor = components['schemas']['Contributor']

type PublicationIdentifierLike = components['schemas']['PublicationIdentifierCreate']

interface UseReferenceFieldsOptions {
  doiIdentifiers: () => DoiIdentifierCreate[]
  publicationIdentifiers: () => PublicationIdentifierLike[]
  primaryPublicationIdentifiers: () => PublicationIdentifierLike[]
  contributors: () => Contributor[]
  entityLabel: () => string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit: (event: any, ...args: any[]) => void
}

/**
 * Return type for {@link useReferenceFields}.
 *
 * Contains event handlers that bridge PrimeVue tag-field events to the
 * form-helpers validation layer, plus a toast instance for user feedback.
 */
export interface UseReferenceFieldsReturn {
  /** PrimeVue toast instance for user-facing messages. */
  toast: ReturnType<typeof useToast>
  /** Writable computed for the primary publication identifiers list. */
  localPrimaryPubs: ReturnType<typeof computed<PublicationIdentifierLike[]>>
  /** Handle blur on a DOI input — validates and emits the updated DOI list. */
  onDoiBlur: (event: Event) => void
  /** Handle direct update of DOI chips (e.g. chip removal). */
  onDoiUpdate: (value: (DoiIdentifierCreate | string)[]) => void
  /** Accept a newly-selected publication identifier with toast feedback. */
  onPublicationAccepted: () => void
  /** Handle direct update of contributor chips, including raw-string ORCID lookup. */
  onContributorUpdate: (value: (Contributor | string)[]) => void
  /** Clear an AutoComplete input after selection. */
  onClearInput: (event: Event) => void
}

/**
 * Composable for DOI, publication, and contributor tag-field event handling.
 *
 * Bridges the gap between MvTagField events (blur, update, option-select) and
 * the form-helpers validation/normalization functions, adding toast feedback
 * and prop-based emit calls. Returns ready-to-bind handlers that match the
 * event names used in ExperimentFields and ScoreSetFields templates.
 *
 * This is distinct from `usePublicationIdentifiers`, which manages publication
 * *data state* and search. This composable handles the *UI interaction glue*.
 *
 * Used by: ExperimentFields.vue, ScoreSetFields.vue
 *
 * @example
 * ```ts
 * setup(props, { emit }) {
 *   const { toast, ...fields } = useReferenceFields({
 *     doiIdentifiers: () => props.doiIdentifiers,
 *     publicationIdentifiers: () => props.publicationIdentifiers,
 *     primaryPublicationIdentifiers: () => props.primaryPublicationIdentifiers,
 *     contributors: () => props.contributors,
 *     entityLabel: () => props.entityLabel,
 *     emit,
 *   })
 *   return { ...fields, pubOptionLabel, contributorLabel }
 * }
 * ```
 */
export function useReferenceFields(options: UseReferenceFieldsOptions): UseReferenceFieldsReturn {
  const toast = useToast()

  const localPrimaryPubs = computed({
    get: () => options.primaryPublicationIdentifiers(),
    set: (val: PublicationIdentifierLike[]) => options.emit('update:primaryPublicationIdentifiers', val)
  })

  function onDoiBlur(event: Event) {
    const target = event.target as HTMLInputElement | null
    const input = target?.value ?? ''
    const updated = addDoiIdentifier(input, options.doiIdentifiers(), toast, options.entityLabel())
    if (updated) options.emit('update:doiIdentifiers', updated)
    if (target) target.value = ''
  }

  function onDoiUpdate(value: (DoiIdentifierCreate | string)[]) {
    options.emit('update:doiIdentifiers', normalizeDoiArray(value, toast))
  }

  function onPublicationAccepted() {
    acceptNewPublicationIdentifier(options.publicationIdentifiers(), toast, options.entityLabel())
  }

  // PrimeVue AutoComplete injects raw strings on enter/space/blur. We strip
  // them and run an async ORCID lookup, which causes a brief visual flash
  // (chip appears then disappears until the lookup resolves).
  function onContributorUpdate(value: (Contributor | string)[]) {
    const objects = value.filter((v): v is Contributor => typeof v !== 'string' && !!v.orcidId)
    const strings = value
      .filter((v): v is string => typeof v === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
    options.emit('update:contributors', objects)
    for (const s of strings) {
      addContributor(s, options.contributors(), toast, (updated) => options.emit('update:contributors', updated))
    }
  }

  function onClearInput(event: Event) {
    clearAutoCompleteInput(event)
  }

  return {toast, localPrimaryPubs, onDoiBlur, onDoiUpdate, onPublicationAccepted, onContributorUpdate, onClearInput}
}
