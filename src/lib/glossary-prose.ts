import type {KeySection} from '@/composables/use-key-drawer'

// Single source for the "Your variant" concept — the page's own subject variant — as badged on the allele
// ledger's page-role entry (MvAlleleLedger). Leads GLOSSARY_SECTIONS (glossary.ts): establishing the subject
// first lets "Direct and indirect measurements" read naturally right after it.
export const THIS_VARIANT_KEY_SECTION: KeySection = {
  id: 'your-variant',
  title: 'Your variant',
  terms: [
    {
      label: 'Your variant',
      definition: 'The variant this page is about.',
      class: 'bg-subject/15 text-subject'
    }
  ]
}

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
