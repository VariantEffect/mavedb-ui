import type {KeySection} from '@/composables/use-key-drawer'

// Single source for the "Your variant" concept — the page's own subject allele — wherever it's badged:
// the allele ledger's page-role entry (MvAlleleLedger) and a measurement's direct-relationship badge
// (MvMeasurementCard) are the same fact from two objects, so they share this one definition rather than
// each carrying their own. Leads GLOSSARY_SECTIONS (glossary.ts): establishing the subject first lets
// "Relationship to your variant" read naturally right after it — how other results relate to the thing
// this section just defined.
export const THIS_VARIANT_KEY_SECTION: KeySection = {
  id: 'your-variant',
  title: 'Your variant',
  terms: [
    {
      label: 'Your variant',
      definition: 'The allele this page is about.',
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
