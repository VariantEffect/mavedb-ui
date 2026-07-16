/**
 * The functional sublayer of the calibration layer: how an assay's verdict on a variant is named and
 * shown. Its clinical counterpart (ClinVar significance, ACMG evidence) will live alongside as a separate
 * module; the heavier editor/draft calibration model stays in `calibration-types.ts`.
 */

export type FunctionalClassification = 'abnormal' | 'normal' | 'not_specified'

/**
 * Single source of truth for the functional-classification vocabulary: the full label, the compact
 * label, the color class, and the Key-drawer gloss. The classification tag and the drawer's consequence
 * section both derive from this, so the vocabulary can never drift across surfaces. `not_specified`
 * carries no gloss — it isn't surfaced in the drawer. Insertion order is display order.
 */
export const FUNCTIONAL_CLASSIFICATIONS: Record<
  FunctionalClassification,
  {label: string; shortLabel: string; class: string; definition?: string}
> = {
  abnormal: {
    label: 'Functionally Abnormal',
    shortLabel: 'Abnormal',
    class: 'mave-classification-abnormal',
    definition: 'The assay scored the variant as altering function.'
  },
  normal: {
    label: 'Functionally Normal',
    shortLabel: 'Normal',
    class: 'mave-classification-normal',
    definition: 'The assay scored the variant as retaining function.'
  },
  not_specified: {
    label: 'Not Specified',
    shortLabel: 'Not Specified',
    class: 'mave-classification-not_specified'
  }
}
