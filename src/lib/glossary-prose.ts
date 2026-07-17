import type {KeySection} from '@/composables/use-key-drawer'

export const SELECTED_ALLELE_KEY_SECTION: KeySection = {
  id: 'selected-allele',
  title: 'Selected allele',
  terms: [
    {
      label: 'Selected allele',
      definition: 'The allele this page is anchored on — the ClinGen allele you navigated to.',
      class: 'bg-link/10 text-link'
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
        'The measurement comes from an older version of its score set. A newer version exists but may not contain a corresponding variant.'
    }
  ]
}
