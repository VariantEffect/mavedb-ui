/**
 * Static content data for the homepage (HomeScreen).
 *
 * Constants here are stub/placeholder data. Items marked with TODO should be
 * replaced with real API data when available.
 */

import igvfLogo from '@/assets/igvf-tag.png'
import mavemdLogo from '@/assets/mavemd-logo.png'

export const WATERMARK_BARS = [
  {color: '#78b793', height: '15%'},
  {color: '#a1d8c8', height: '25%'},
  {color: '#78b793', height: '38%'},
  {color: '#c8e4c6', height: '52%'},
  {color: '#a1d8c8', height: '65%'},
  {color: '#78b793', height: '78%'},
  {color: '#fbda68', height: '88%'},
  {color: '#78b793', height: '95%'},
  {color: '#a1d8c8', height: '85%'},
  {color: '#f8971d', height: '72%'},
  {color: '#78b793', height: '58%'},
  {color: '#c8e4c6', height: '42%'},
  {color: '#a1d8c8', height: '30%'},
  {color: '#fbda68', height: '20%'},
  {color: '#78b793', height: '12%'}
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
    route: '/collections/urn:mavedb:collection-c5eabe66-76f1-4e74-9589-35324e4f6f8d'
  },
  {
    title: 'MaveMD',
    description:
      'Curated datasets with clinical relevance, linking MAVE functional scores to variant pathogenicity evidence.',
    logo: mavemdLogo,
    route: '/collections/urn:mavedb:collection-603dafbf-4a3f-4d70-ab8c-aafb226fbff4'
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
