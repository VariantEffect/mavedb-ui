/**
 * Static content data for the homepage (HomeScreen).
 *
 * Constants here are stub/placeholder data. Items marked with TODO should be
 * replaced with real API data when available.
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

// TODO: Link to appropriate search filters
export const BROWSE_CATEGORIES = [
  {label: 'Gene', description: '700+ human genes', icon: 'fa-solid fa-dna', route: '/search'},
  {label: 'Organism', description: 'Human, yeast & more', icon: 'fa-solid fa-person', route: '/search'},
  {
    label: 'Calibrated',
    description: 'Clinically calibrated sets',
    icon: 'fa-regular fa-square-check',
    route: '/search'
  },
  {label: 'Browse all', description: 'Open search, no filters', icon: 'fa-solid fa-magnifying-glass', route: '/search'}
]

export const CONTRIBUTE_CATEGORIES = [
  {
    label: 'New Experiment',
    description: 'Group related score sets',
    icon: 'fa-solid fa-folder-plus',
    route: '/create-experiment'
  },
  {label: 'New Score Set', description: 'Upload variant scores', icon: 'fa-solid fa-upload', route: '/create-score-set'}
]

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

// TODO: Replace with real API data when available
export const RECENT_PUBLICATIONS = [
  {
    title:
      'Mechanistic Modelling of Recessive, Dominant Negative, and Haploinsufficiency Effects with Allelic Integration of Variant Effects',
    route: '/search',
    chips: [
      {label: 'BRCA1'},
      {label: 'Homo sapiens'},
      {label: '3 datasets'},
      {label: '4,832 variants'},
      {label: '2 calibrations', calibrated: true}
    ]
  },
  {
    title: 'ADSL Estimated Enzyme Activities (Base Editing)',
    route: '/search',
    chips: [{label: 'ADSL'}, {label: 'Homo sapiens'}, {label: '1 dataset'}, {label: '1,240 variants'}]
  },
  {
    title: 'Saturation mutagenesis of FGFR kinase domains in MCF10A and NCI-H3255 cells',
    route: '/search',
    chips: [
      {label: 'FGFR'},
      {label: 'Homo sapiens'},
      {label: '2 datasets'},
      {label: '3,107 variants'},
      {label: '1 calibration', calibrated: true}
    ]
  },
  {
    title: 'AIRE insulin promoter-GFP reporter assay',
    route: '/search',
    chips: [{label: 'AIRE'}, {label: 'Homo sapiens'}, {label: '1 dataset'}, {label: '892 variants'}]
  },
  {
    title: 'Deep Mutational Scanning in FKRP and LARGE1 with Saturation Mutagenesis-Reinforced Functional Assays',
    route: '/search',
    chips: [
      {label: 'FKRP'},
      {label: 'LARGE1'},
      {label: 'Homo sapiens'},
      {label: '4 datasets'},
      {label: '6,541 variants'},
      {label: '3 calibrations', calibrated: true}
    ]
  }
]
