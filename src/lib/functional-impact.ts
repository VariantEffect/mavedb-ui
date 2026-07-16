/**
 * The functional sublayer of the calibration layer: how an assay's verdict on a variant is named and
 * shown. Its clinical counterpart (ClinVar significance, ACMG evidence) will live alongside as a separate
 * module; the heavier editor/draft calibration model stays in `calibration-types.ts`.
 */

export type FunctionalClassification = 'abnormal' | 'normal' | 'not_specified'

/**
 * Single source of truth for the functional-classification vocabulary: the full label, the compact
 * label, the chip color class, the histogram range-fill color, and the Key-drawer gloss. The
 * classification tag, the drawer's consequence section, and the calibration histogram all derive from
 * this, so the vocabulary can never drift across surfaces. `class` styles the inline chip (the `--fn-*`
 * palette); `rangeColor` fills the histogram score range (the `--cal-*` palette) — intentionally distinct.
 * `not_specified` carries no gloss — it isn't surfaced in the drawer. Insertion order is display order.
 */
export const FUNCTIONAL_CLASSIFICATIONS: Record<
  FunctionalClassification,
  {label: string; shortLabel: string; class: string; rangeColor: string; definition?: string}
> = {
  abnormal: {
    label: 'Functionally Abnormal',
    shortLabel: 'Abnormal',
    class: 'mave-classification-abnormal',
    rangeColor: 'var(--color-cal-abnormal)',
    definition: 'The assay scored the variant as altering function.'
  },
  normal: {
    label: 'Functionally Normal',
    shortLabel: 'Normal',
    class: 'mave-classification-normal',
    rangeColor: 'var(--color-cal-normal)',
    definition: 'The assay scored the variant as retaining function.'
  },
  not_specified: {
    label: 'Not Specified',
    shortLabel: 'Not Specified',
    class: 'mave-classification-not_specified',
    rangeColor: 'var(--color-cal-unspecified)'
  }
}
