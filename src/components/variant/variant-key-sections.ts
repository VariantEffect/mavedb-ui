import config from '@/config'
import type {KeySection} from '@/composables/use-key-drawer'
import {ALLELE_CONFIDENCE} from '@/lib/allele-grouping'
import {LEVEL_BUCKETS} from '@/lib/measurement-types'

/**
 * Variant-page content for the generic {@link MvKeyDrawer}. These are the tier-2 vocabulary glosses; the
 * section `id`s are the deep-link anchors that badges pass to the Key drawer (via `v-key-term`).
 */

// TODO- Interim target: the general key-concepts page. Repoint to the dedicated mapping/annotation docs
// section once it exists (see the mapping-docs plan).
export const VARIANT_KEY_DOCS_URL = `${config.appBaseUrl}/docs/mavedb/getting-started/key-concepts.html`

export const VARIANT_KEY_SECTIONS: KeySection[] = [
  {
    id: 'relationship',
    title: 'Relationship to your variant',
    gloss: 'How each result relates to the allele you searched.',
    terms: [
      {
        label: 'Your variant',
        definition: 'The result assayed exactly the allele you searched.',
        class: 'bg-sage/15 text-sage'
      },
      {
        label: 'Its protein consequence',
        definition: 'The result assayed the protein change your variant produces.'
      },
      {
        label: 'Encodes the protein consequence',
        definition: 'The result assayed a nucleotide allele that encodes the same protein change as your variant.'
      }
    ]
  },
  {
    id: 'assay-level',
    title: 'Assay level',
    gloss: 'The level at which a result measured the change.',
    // Derived from the shared bucket vocabulary so badges and this gloss can never drift apart.
    terms: Object.values(LEVEL_BUCKETS).map((b) => ({label: b.label, definition: b.definition, class: b.class}))
  },
  {
    id: 'confidence',
    title: 'How a coordinate was established',
    // Assembled from the shared confidence vocabulary so badges and this gloss can never drift apart.
    terms: Object.values(ALLELE_CONFIDENCE).map((c) => ({label: c.label, definition: c.definition, class: c.class}))
  },
  {
    id: 'selected-allele',
    title: 'Selected allele',
    terms: [
      {
        label: 'Selected allele',
        definition: 'The allele this page is anchored on — the ClinGen allele you navigated to.',
        class: 'bg-link/10 text-link'
      }
    ]
  },
  {
    id: 'frame',
    title: 'Coordinate frame',
    terms: [
      {
        label: 'Submitted',
        definition: 'Coordinates exactly as the depositor submitted them, relative to the target sequence.'
      },
      {
        label: 'Reference',
        definition: "Coordinates re-expressed against a standard reference sequence by MaveDB's mapping pipeline."
      }
    ]
  },
  {
    id: 'consequence',
    title: 'Consequence vs impact',
    terms: [
      {
        label: 'Molecular consequence',
        definition: 'The predicted effect on the transcript or protein (e.g. missense), from VEP.'
      },
      {label: 'Functional impact', definition: "The assay's verdict on whether the variant alters function."},
      {
        label: 'Functionally Abnormal',
        definition: 'The assay scored the variant as altering function.',
        class: 'mave-classification-abnormal'
      },
      {
        label: 'Functionally Normal',
        definition: 'The assay scored the variant as retaining function.',
        class: 'mave-classification-normal'
      }
    ]
  },
  {
    id: 'acmg',
    title: 'ACMG functional evidence',
    gloss: 'How the functional result maps onto clinical-classification evidence.',
    terms: [
      {label: 'PS3', definition: 'Functional evidence supporting a pathogenic classification.'},
      {label: 'BS3', definition: 'Functional evidence supporting a benign classification.'},
      {
        label: 'Evidence strength',
        definition: 'How much weight the evidence carries: supporting → moderate → strong → very strong.'
      },
      {label: 'OddsPath', definition: 'The odds of pathogenicity implied by the score; sets the evidence strength.'}
    ]
  },
  {
    id: 'population',
    title: 'Population frequency (gnomAD)',
    gloss: 'How often the allele is seen in reference populations — high frequency argues against pathogenicity.',
    terms: [
      {
        label: 'Allele frequency (AF)',
        definition:
          'The fraction of sampled reference-population chromosomes carrying this allele in gnomAD (allele count ÷ allele number).'
      },
      {
        label: 'AC / AN',
        definition:
          'Allele count and allele number: the observed carriers and the total chromosomes sampled that the frequency is computed from.'
      },
      {
        label: 'FAF95',
        definition:
          "Filtering allele frequency at 95% confidence: a sampling-adjusted, conservative estimate of the population frequency. When it exceeds a disease's maximum credible allele frequency, the variant is too common to be pathogenic (ACMG BA1/BS1)."
      }
    ]
  },
  {
    id: 'clinical',
    title: 'Clinical significance (ClinVar)',
    gloss: 'Germline classifications, shown with their ClinVar review-star rating.',
    terms: [
      {label: 'Pathogenic / Likely pathogenic', definition: 'Classified as disease-causing, or likely to be.'},
      {label: 'Benign / Likely benign', definition: 'Classified as not disease-causing, or likely not to be.'},
      {label: 'VUS', definition: 'Variant of uncertain significance — not enough evidence to classify.'},
      {label: 'Conflicting', definition: 'Submitters disagree on the classification.'}
    ]
  },
  {
    id: 'passthrough',
    title: 'Sibling-allele controls',
    terms: [
      {
        label: 'From a sibling allele',
        definition:
          'A ClinVar call carried over from a sibling allele that shares the protein consequence, shown when the assayed variant itself has no ClinVar record. Marked with *.'
      }
    ]
  },
  {
    id: 'as-of',
    title: 'As of',
    terms: [
      {
        label: 'As of MaveDB …',
        definition: 'MaveDB reconstructs its molecular and annotation layer as of the chosen date; scores never change.'
      },
      {label: 'As of ClinVar …', definition: 'The ClinVar release a clinical call was drawn from.'}
    ]
  },
  {
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
]
