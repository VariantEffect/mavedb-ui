import {components} from '@/schema/openapi'

export type MinimalScoreSet = {
  urn: string
  title: string
  shortDescription: string | null
}

/** ACMGClassification without server-managed fields. */
export type DraftAcmgClassification = Omit<
  components['schemas']['ACMGClassification'],
  'id' | 'creationDate' | 'createdBy' | 'modificationDate' | 'modifiedBy' | 'recordType'
>

/** FunctionalClassification without server-managed fields. */
export interface DraftFunctionalClassification
  extends Omit<
    components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification'],
    'acmgClassification' | 'id' | 'creationDate' | 'createdBy' | 'modificationDate' | 'modifiedBy' | 'recordType'
  > {
  acmgClassification: DraftAcmgClassification | components['schemas']['ACMGClassification'] | null
}

/** ScoreCalibration without server-managed fields. */
export interface DraftScoreCalibration
  extends Omit<
    components['schemas']['ScoreCalibration'],
    | 'urn'
    | 'scoreSetUrn'
    | 'functionalClassifications'
    | 'id'
    | 'scoreSetId'
    | 'creationDate'
    | 'createdBy'
    | 'modificationDate'
    | 'modifiedBy'
    | 'recordType'
  > {
  urn: string | null
  scoreSetUrn: string | null
  functionalClassifications: DraftFunctionalClassification[] | null
}

/** Helper state tracked alongside each functional classification row. */
export interface FunctionalClassificationHelper {
  infiniteLower: boolean
  infiniteUpper: boolean
  isProvidingOddspaths: boolean
  isProvidingClassification: boolean
  lastOddsPathState: number | null
  lastClassificationState: DraftAcmgClassification | null
  lastLowerInclusiveState: boolean | null
  lastUpperInclusiveState: boolean | null
  lastRangeState: (number | null)[] | null
  lastClassState: string | null
}

/**
 * Keys of DraftScoreCalibration that are copied during apply/reset operations.
 * Intentionally excludes `functionalClassifications` (handled separately) and
 * `private`/`primary`/`investigatorProvided` (not user-editable).
 */
export const DRAFT_CALIBRATION_COPYABLE_KEYS: (keyof DraftScoreCalibration)[] = [
  'urn',
  'scoreSetUrn',
  'title',
  'notes',
  'baselineScore',
  'baselineScoreDescription',
  'researchUseOnly',
  'thresholdSources',
  'methodSources',
  'evidenceSources'
]

/** Create a default empty functional classification. */
export function createDefaultClassification(classBased: boolean): DraftFunctionalClassification {
  return {
    label: '',
    description: '',
    range: classBased ? null : [null, null],
    class: null,
    inclusiveLowerBound: classBased ? null : true,
    inclusiveUpperBound: classBased ? null : false,
    functionalClassification: 'not_specified',
    acmgClassification: null,
    oddspathsRatio: null
  }
}

/** Create a default helper for a new or existing functional classification row. */
export function createClassificationHelper(
  fr?: DraftFunctionalClassification,
  classBased = false
): FunctionalClassificationHelper {
  if (!fr) {
    return {
      infiniteLower: false,
      infiniteUpper: false,
      isProvidingOddspaths: false,
      isProvidingClassification: false,
      lastOddsPathState: null,
      lastClassificationState: null,
      lastLowerInclusiveState: true,
      lastUpperInclusiveState: false,
      lastRangeState: classBased ? null : [null, null],
      lastClassState: null
    }
  }

  return {
    infiniteLower: fr.range != null ? fr.range[0] == null : false,
    infiniteUpper: fr.range != null ? fr.range[1] == null : false,
    isProvidingOddspaths: fr.oddspathsRatio != null,
    isProvidingClassification: fr.acmgClassification != null,
    lastOddsPathState: fr.oddspathsRatio ?? null,
    lastClassificationState: fr.acmgClassification != null ? (fr.acmgClassification as DraftAcmgClassification) : null,
    lastLowerInclusiveState: classBased ? null : (fr.inclusiveLowerBound ?? null),
    lastUpperInclusiveState: classBased ? null : (fr.inclusiveUpperBound ?? null),
    lastRangeState: classBased
      ? null
      : fr.range != null
        ? [fr.range[0] ?? null, fr.range[1] ?? null]
        : null,
    lastClassState: classBased ? (fr.class ?? null) : null
  }
}
