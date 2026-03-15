import {reactive, ref, type Ref} from 'vue'
import _, {cloneDeep} from 'lodash'

import {getScoreCalibration} from '@/api/mavedb'
import config from '@/config'
import {saveCalibration, type CalibrationSaveResult} from '@/lib/calibrations'
import {useValidationErrors, type ValidationErrorState} from '@/composables/use-validation-errors'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import {usePublicationIdentifiers, type UsePublicationIdentifiersReturn} from '@/composables/use-publication-identifiers'
import {components} from '@/schema/openapi'
import type {
  DraftScoreCalibration,
  DraftFunctionalClassification,
  DraftAcmgClassification,
  FunctionalClassificationHelper
} from '@/lib/calibration-types'
import {
  DRAFT_CALIBRATION_COPYABLE_KEYS,
  createClassificationHelper
} from '@/lib/calibration-types'

// Re-export types so consumers can import from here
export type {
  DraftScoreCalibration,
  DraftFunctionalClassification,
  DraftAcmgClassification,
  FunctionalClassificationHelper
}

export interface CalibrationEditorProps {
  calibrationUrn: string | null
  scoreSetUrn: string | null
  allowClassBased: boolean
}

type DraftScoreCalibrationWithOriginal = DraftScoreCalibration & {
  __original: DraftScoreCalibration
}

type PublicationIdentifier = components['schemas']['PublicationIdentifier']

/**
 * Composable for the calibration editor form.
 *
 * Owns the full draft lifecycle: reactive draft state, API loading, dirty
 * tracking, publication search (via `usePublicationIdentifiers`),
 * classification helpers, validation (via `useValidationErrors`), and saving.
 *
 * Parent dialog components use the lighter `useCalibrationDialog` composable
 * for open/close state instead.
 *
 * Used by: CalibrationEditor.vue
 *
 * @example
 * ```ts
 * const editor = useCalibrationEditor({ calibrationUrn: 'urn:...', scoreSetUrn: null, allowClassBased: true })
 * // Bind editor.draft fields to CalibrationFields
 * // On save: const result = await editor.saveCalibrationDraft()
 * ```
 */
/**
 * Return type for {@link useCalibrationEditor}.
 *
 * Owns the full calibration draft lifecycle: reactive draft state, API loading,
 * dirty/valid tracking, publication search (via `usePublicationIdentifiers`),
 * classification helpers, validation (via `useValidationErrors`), and saving.
 */
export interface UseCalibrationEditorReturn {
  /** App configuration object (base URLs, feature flags). */
  config: typeof config
  /** Whether the current user is authenticated. */
  userIsAuthenticated: ReturnType<typeof useAuth>['userIsAuthenticated']
  /** True when creating a new calibration (no existing URN). */
  inCreateMode: boolean
  /** Generate a scoped ID string for DOM elements. */
  scopedId: (id?: string) => string

  // ─── Validation (from useValidationErrors) ──────────────────────────────
  /** Merged view of server + client validation errors. */
  validationErrors: ValidationErrorState['validationErrors']
  /** Total number of validation errors. */
  totalValidationErrors: ValidationErrorState['totalValidationErrors']
  /** True when there are any validation errors. */
  hasValidationErrors: ValidationErrorState['hasValidationErrors']
  /** Set server-side errors (from API response) and re-merge. */
  setServerErrors: ValidationErrorState['setServerErrors']
  /** Clear server-side errors and re-merge. */
  clearServerErrors: ValidationErrorState['clearServerErrors']
  /** Set a single client-side error and re-merge. */
  setClientError: ValidationErrorState['setClientError']
  /** Remove a single client-side error and re-merge. */
  clearClientError: ValidationErrorState['clearClientError']
  /** Clear all client-side errors and re-merge. */
  clearClientErrors: ValidationErrorState['clearClientErrors']
  /** Reset all error state to empty. */
  clearValidationState: ValidationErrorState['clearValidationState']

  // ─── Publication search (from usePublicationIdentifiers) ────────────────
  /** Combined publication suggestion list for autocomplete. */
  publicationIdentifierSuggestionsList: UsePublicationIdentifiersReturn['publicationIdentifierSuggestionsList']
  /** Whether a publication search is in-flight. */
  publicationSearchLoading: UsePublicationIdentifiersReturn['publicationSearchLoading']
  /** Trigger publication autocomplete search. */
  searchPublicationIdentifiers: UsePublicationIdentifiersReturn['searchPublicationIdentifiers']

  // ─── Draft state ────────────────────────────────────────────────────────
  /** The reactive calibration draft being edited. */
  draft: DraftScoreCalibration & {__original: DraftScoreCalibration}
  /** File selected for class-based calibration import, or null. */
  draftClassesFile: Ref<File | null>
  /** Whether the draft has unsaved changes relative to the original. */
  isDirty: Ref<boolean>
  /** Whether the draft passes basic validity checks. */
  isValid: Ref<boolean>
  /** Whether this calibration uses class-based (vs. range-based) classifications. */
  classBased: Ref<boolean>
  /** Apply partial calibration data to the draft (e.g. from API load). */
  applyCalibrationData: (data: Partial<DraftScoreCalibration>) => void
  /** Load calibration data from the API by URN. */
  loadCalibration: (urn: string) => Promise<void>
  /** Initialize the draft for create mode with blank defaults. */
  initCreateDraft: () => void
  /** Notify the editor that the draft changed (recomputes dirty/valid). */
  markChanged: () => void
  /** Recompute dirty and valid state from the current draft. */
  recomputeMeta: () => void
  /** Reactive list of classification helper objects for each functional classification row. */
  functionalClassificationHelpers: Ref<FunctionalClassificationHelper[]>
  /** Options for range-based functional classification dropdowns. */
  rangeClassifications: Array<{label: string; value: string}>
  /** Save the current draft to the API, returning the result. */
  saveCalibrationDraft: () => Promise<CalibrationSaveResult>
}

export function useCalibrationEditor(props: CalibrationEditorProps): UseCalibrationEditorReturn {
  const {userIsAuthenticated} = useAuth()
  const validation = useValidationErrors()

  if (props.calibrationUrn && props.scoreSetUrn) {
    console.warn('Both calibrationUrn and scoreSetUrn are provided; only one should be set.')
  }

  const classBased = ref(false)
  const draftClassesFile = ref<File | null>(null)

  const buildBlankDraft = (): DraftScoreCalibration => ({
    urn: props.calibrationUrn || null,
    scoreSetUrn: props.scoreSetUrn || null,
    title: '',
    notes: null,
    baselineScore: null,
    baselineScoreDescription: null,
    researchUseOnly: false,
    private: true,
    primary: false,
    investigatorProvided: true,
    functionalClassifications: [] as DraftFunctionalClassification[],
    thresholdSources: [] as PublicationIdentifier[],
    methodSources: [] as PublicationIdentifier[],
    evidenceSources: [] as PublicationIdentifier[]
  })

  const draftCalibrationBase = buildBlankDraft()
  const draftCalibration = reactive<DraftScoreCalibrationWithOriginal>({
    ...draftCalibrationBase,
    __original: cloneDeep(draftCalibrationBase)
  })

  const functionalClassificationHelpers = ref<FunctionalClassificationHelper[]>([])

  const applyCalibrationData = (data: Partial<DraftScoreCalibration>) => {
    DRAFT_CALIBRATION_COPYABLE_KEYS.forEach((k) => {
      if (data[k] !== undefined) {
        // @ts-expect-error index assignment
        draftCalibration[k] = data[k] as unknown
      }
    })

    if (draftCalibration.functionalClassifications == null) {
      draftCalibration.functionalClassifications = []
      classBased.value = false
    } else {
      classBased.value = data.functionalClassifications?.length
        ? data.functionalClassifications.every((fr) => fr.class != null)
        : false
    }

    if (data.functionalClassifications && draftCalibration.functionalClassifications) {
      draftCalibration.functionalClassifications.splice(0, draftCalibration.functionalClassifications.length)

      data.functionalClassifications.forEach((fr: DraftFunctionalClassification) => {
        const draftfunctionalClassification: DraftFunctionalClassification = {
          label: fr.label || '',
          description: fr.description || null,
          range: classBased.value ? null : fr.range || [null, null],
          class: classBased.value ? fr.class || null : null,
          inclusiveLowerBound: classBased.value ? null : (fr.inclusiveLowerBound ?? true),
          inclusiveUpperBound: classBased.value ? null : (fr.inclusiveUpperBound ?? true),
          functionalClassification: fr.functionalClassification || 'not_specified',
          acmgClassification: fr.acmgClassification || null,
          oddspathsRatio: fr.oddspathsRatio || null
        }

        if (draftCalibration.functionalClassifications == null) {
          draftCalibration.functionalClassifications = []
        }
        draftCalibration.functionalClassifications.push(draftfunctionalClassification)

        functionalClassificationHelpers.value.push(createClassificationHelper(fr, classBased.value))
      })
    }
  }

  const loadCalibration = async (urn: string) => {
    try {
      const data = await getScoreCalibration(urn)
      applyCalibrationData(data as unknown as Partial<DraftScoreCalibration>)
      draftCalibration.__original = cloneDeep(draftCalibration)
    } catch (e) {
      console.error('Failed to load calibration', urn, e)
    }
  }

  const initCreateDraft = () => {
    applyCalibrationData(buildBlankDraft())
    draftCalibration.__original = cloneDeep(draftCalibration)
  }

  // Dirty / valid tracking
  const isDirty = ref(false)
  const isValid = ref(false)
  const recomputeMeta = () => {
    const snapshot = (dc: DraftScoreCalibration) => ({
      urn: dc.urn,
      scoreSetUrn: dc.scoreSetUrn,
      title: dc.title,
      notes: dc.notes,
      baselineScore: dc.baselineScore,
      baselineScoreDescription: dc.baselineScoreDescription,
      researchUseOnly: dc.researchUseOnly,
      functionalClassifications: dc.functionalClassifications,
      thresholdSources: dc.thresholdSources,
      methodSources: dc.methodSources,
      evidenceSources: dc.evidenceSources
    })
    isDirty.value = !_.isEqual(snapshot(draftCalibration), snapshot(draftCalibration.__original))
    isValid.value = !!draftCalibration.title
  }

  const markChanged = () => recomputeMeta()

  // Initialize based on mode
  const inCreateMode = !props.calibrationUrn
  if (props.calibrationUrn) {
    loadCalibration(props.calibrationUrn)
  } else {
    initCreateDraft()
  }

  // Publication search
  const publications = usePublicationIdentifiers()

  const rangeClassifications = [
    {label: 'Normal', value: 'normal'},
    {label: 'Abnormal', value: 'abnormal'},
    {label: 'Not specified', value: 'not_specified'}
  ]

  // Save logic — the editor owns the draft, so it owns the save
  async function saveCalibrationDraft(): Promise<CalibrationSaveResult> {
    const result = await saveCalibration({
      draft: draftCalibration,
      classesFile: draftClassesFile.value,
      existingUrn: props.calibrationUrn || undefined
    })

    if (result.success === false && result.error === 'validation') {
      validation.setServerErrors(result.validationErrors)
    }

    return result
  }

  return {
    config,
    userIsAuthenticated,
    inCreateMode,
    ...useScopedId(),
    ...validation,

    publicationIdentifierSuggestionsList: publications.publicationIdentifierSuggestionsList,
    publicationSearchLoading: publications.publicationSearchLoading,
    searchPublicationIdentifiers: publications.searchPublicationIdentifiers,

    draft: draftCalibration,
    draftClassesFile,
    isDirty,
    isValid,
    classBased,
    applyCalibrationData,
    loadCalibration,
    initCreateDraft,
    markChanged,
    recomputeMeta,
    functionalClassificationHelpers,
    rangeClassifications,
    saveCalibrationDraft
  }
}
