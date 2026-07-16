import config from '@/config'
import type {KeySection} from '@/composables/use-key-drawer'
import {COORDINATE_FRAME_KEY_SECTION} from '@/composables/use-variant-coordinates'
import {ACMG_CRITERIA} from '@/lib/acmg'
import {ALLELE_CONFIDENCE} from '@/lib/allele-grouping'
import {CLINICAL_SIGNIFICANCE_KEY_SECTION, SIBLING_CONTROL_KEY_SECTION} from '@/lib/clinvar-controls'
import {FUNCTIONAL_CLASSIFICATIONS} from '@/lib/functional-impact'
import {POPULATION_KEY_SECTION} from '@/lib/gnomad'
import {LEVEL_BUCKETS, RELATIONSHIPS} from '@/lib/measurement-types'

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
    // Derived from the shared relationship vocabulary so cards and this gloss can never drift apart.
    terms: Object.values(RELATIONSHIPS).map((r) => ({label: r.label, definition: r.definition, class: r.class}))
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
  COORDINATE_FRAME_KEY_SECTION,
  {
    id: 'consequence',
    title: 'Molecular consequence',
    terms: [
      {
        label: 'Molecular consequence',
        definition: 'The predicted effect on the transcript or protein (e.g. missense), from VEP.'
      }
    ]
  },
  {
    id: 'functional-impact',
    title: 'Functional impact',
    terms: [
      {label: 'Functional impact', definition: "The assay's verdict on whether the variant alters function."},
      // Derived from the shared classification vocabulary so tag and gloss can't drift.
      ...Object.values(FUNCTIONAL_CLASSIFICATIONS)
        .filter((c) => c.definition)
        .map((c) => ({label: c.label, definition: c.definition!, class: c.class}))
    ]
  },
  {
    id: 'acmg',
    title: 'ACMG functional evidence',
    gloss: 'How the functional result maps onto clinical-classification evidence.',
    terms: [
      // PS3/BS3 derive from the shared ACMG criteria vocabulary so the codes and glosses can't drift.
      ...Object.values(ACMG_CRITERIA),
      {
        label: 'Evidence strength',
        definition: 'How much weight the evidence carries: supporting → moderate → strong → very strong.'
      },
      {label: 'OddsPath', definition: 'The odds of pathogenicity implied by the score; sets the evidence strength.'}
    ]
  },
  POPULATION_KEY_SECTION,
  CLINICAL_SIGNIFICANCE_KEY_SECTION,
  SIBLING_CONTROL_KEY_SECTION,
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
