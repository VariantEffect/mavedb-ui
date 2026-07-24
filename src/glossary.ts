import config from '@/config'
import type {KeySection} from '@/composables/use-key-drawer'
import {COORDINATE_FRAME_KEY_SECTION} from '@/composables/use-variant-coordinates'
import {ACMG_KEY_SECTION} from '@/lib/acmg'
import {CONFIDENCE_KEY_SECTION} from '@/lib/allele-grouping'
import {CLINICAL_SIGNIFICANCE_KEY_SECTION, SIBLING_CONTROL_KEY_SECTION} from '@/lib/clinvar-controls'
import {FUNCTIONAL_IMPACT_KEY_SECTION} from '@/lib/functional-impact'
import {AS_OF_KEY_SECTION, CONSEQUENCE_KEY_SECTION, THIS_VARIANT_KEY_SECTION, SUPERSEDED_KEY_SECTION} from '@/lib/glossary-prose'
import {POPULATION_KEY_SECTION} from '@/lib/gnomad'
import {ASSAY_LEVEL_KEY_SECTION, RELATIONSHIP_KEY_SECTION} from '@/lib/measurement-types'

export const GLOSSARY_DOCS_URL = `${config.appBaseUrl}/docs/mavedb/getting-started/key-concepts.html`

export const GLOSSARY_SECTIONS: KeySection[] = [
  THIS_VARIANT_KEY_SECTION,
  RELATIONSHIP_KEY_SECTION,
  ASSAY_LEVEL_KEY_SECTION,
  CONFIDENCE_KEY_SECTION,
  COORDINATE_FRAME_KEY_SECTION,
  CONSEQUENCE_KEY_SECTION,
  FUNCTIONAL_IMPACT_KEY_SECTION,
  ACMG_KEY_SECTION,
  POPULATION_KEY_SECTION,
  CLINICAL_SIGNIFICANCE_KEY_SECTION,
  SIBLING_CONTROL_KEY_SECTION,
  AS_OF_KEY_SECTION,
  SUPERSEDED_KEY_SECTION
]
