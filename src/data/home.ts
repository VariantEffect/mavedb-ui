/**
 * Static content data for the homepage (HomeScreen).
 *
 * Items marked with TODO should be replaced with real API data when available.
 */

import igvfLogo from '@/assets/igvf-tag.png'
import mavemdLogo from '@/assets/mavemd-logo.png'
import {MAVEMD_COLLECTION_URN} from '@/data/mavemd'
import {IGVF_COLLECTION_URN} from '@/data/igvf'

export const WATERMARK_BARS = [
  {color: 'var(--color-sage)', height: '15%'},
  {color: 'var(--color-mint)', height: '25%'},
  {color: 'var(--color-sage)', height: '38%'},
  {color: 'var(--color-sage-light)', height: '52%'},
  {color: 'var(--color-mint)', height: '65%'},
  {color: 'var(--color-sage)', height: '78%'},
  {color: 'var(--color-yellow-accent)', height: '88%'},
  {color: 'var(--color-sage)', height: '95%'},
  {color: 'var(--color-mint)', height: '85%'},
  {color: 'var(--color-orange-cta)', height: '72%'},
  {color: 'var(--color-sage)', height: '58%'},
  {color: 'var(--color-sage-light)', height: '42%'},
  {color: 'var(--color-mint)', height: '30%'},
  {color: 'var(--color-yellow-accent)', height: '20%'},
  {color: 'var(--color-sage)', height: '12%'}
]

/**
 * "Browse by" facets, most broadly useful first: the full corpus and the
 * human-organism filter.
 */
export const BROWSE_CATEGORIES = [
  {label: 'Browse all', description: 'Open search, no filters', icon: 'fa-solid fa-magnifying-glass', route: '/search'},
  {
    label: 'Human',
    description: 'Human variant data',
    icon: 'fa-solid fa-person',
    route: '/search?target-organism-name=Homo+sapiens'
  }
]

/** Points newcomers from the Explore panel at the searching guide. */
export const SEARCH_GUIDE_HREF = '/docs/mavedb/finding-data/searching.html'

export const CONTRIBUTE_CATEGORIES = [
  {
    label: 'New Experiment',
    description: 'Start uploading a new experiment',
    icon: 'fa-solid fa-folder-plus',
    route: '/create-experiment'
  },
  {
    label: 'New Score Set',
    description: 'Add scores to an existing experiment',
    icon: 'fa-solid fa-upload',
    route: '/create-score-set'
  }
]

/** Points first-time submitters at the submission guide before the ORCID-gated create forms. */
export const SUBMISSION_GUIDE_HREF = '/docs/mavedb/submitting-data/before-you-start.html'

export const FEATURED_COLLECTIONS = [
  {
    title: 'IGVF Produced',
    description:
      "Functional genomics datasets generated as part of the IGVF Consortium's large-scale variant impact studies.",
    logo: igvfLogo,
    route: `/collections/${IGVF_COLLECTION_URN}`
  },
  {
    title: 'MaveMD',
    description:
      'Curated datasets with clinical relevance, linking MAVE functional scores to variant pathogenicity evidence.',
    logo: mavemdLogo,
    route: `/collections/${MAVEMD_COLLECTION_URN}`
  }
]
