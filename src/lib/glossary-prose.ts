import type {KeySection} from '@/composables/use-key-drawer'

export const CONSEQUENCE_KEY_SECTION: KeySection = {
  id: 'consequence',
  title: 'Molecular consequence',
  terms: [
    {
      label: 'Molecular consequence',
      definition: 'The predicted effect on the transcript or protein (e.g. missense), from VEP.'
    }
  ]
}

export const CALIBRATION_KEY_SECTION: KeySection = {
  id: 'calibration',
  title: 'Calibration',
  terms: [
    {
      label: 'Calibration',
      definition:
        "A score set's score ranges, each tied to a functional impact and, where available, a strength of clinical evidence. This is how a functional score becomes a functional impact and an ACMG code."
    },
    {
      label: 'Calibration control',
      definition: 'A variant with an established clinical classification, used to derive the calibration.'
    },
    {
      label: 'Primary',
      definition:
        "The score set's main calibration, shown by default and used to interpret its scores. A score set has at most one, and it cannot be research use only.",
      class: 'mave-tag-primary'
    },
    {
      label: 'Research use only',
      definition:
        'Not intended for clinical or diagnostic use, for example because its method is exploratory or not yet validated. Do not rely on it alone to classify a variant.',
      class: 'mave-tag-ruo'
    }
  ]
}

export const NMD_KEY_SECTION: KeySection = {
  id: 'nmd',
  title: 'NMD',
  terms: [
    {
      label: 'NMD',
      definition:
        'Nonsense-mediated decay: a cellular process that destroys transcripts carrying premature stop codons. Assays built on a synthetic cDNA copy of the gene cannot detect variants that act this way.'
    }
  ]
}

export const AS_OF_KEY_SECTION: KeySection = {
  id: 'as-of',
  title: 'As of',
  terms: [
    {
      label: 'As of MaveDB …',
      definition: 'MaveDB reconstructs its molecular and annotation layer as of the chosen date; scores never change.'
    },
    {label: 'As of ClinVar …', definition: 'The ClinVar release a clinical call was drawn from.'}
  ]
}

export const SUPERSEDED_KEY_SECTION: KeySection = {
  id: 'superseded',
  title: 'Superseded',
  terms: [
    {
      label: 'Superseded',
      definition:
        'This measurement is from an older version of its score set and might have outdated scores or classifications. Note that the score set which supersedes the older version may not include your variant.',
      class: 'bg-superseded-light text-superseded'
    }
  ]
}
