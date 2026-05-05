/**
 * Centralized field descriptions used for wizard help labels and editor tooltip hints.
 *
 * - `hint`:   Short tooltip text shown via info icon in editor mode.
 * - `help`:   Label text for the wizard help panel.
 * - `detail`: Extended HTML help text shown below the label in wizard mode.
 *             Rendered with `v-html` — safe because all content is static.
 */

import config from '@/config'

export interface FieldDescription {
  /** Short tooltip text for editor mode */
  hint: string
  /** Fuller description for wizard mode help label */
  help: string
  /** Extended wizard help detail (HTML). Rendered with v-html. */
  detail?: string
}

interface SharedDescriptions {
  title: FieldDescription
  shortDescription: FieldDescription
  abstractText: FieldDescription
  methodText: FieldDescription
  doiIdentifiers: FieldDescription
  publicationIdentifiers: FieldDescription
  primaryPublication: FieldDescription
  contributors: FieldDescription
  extraMetadata: FieldDescription
}

function sharedDescriptions(entity: string): SharedDescriptions {
  return {
    title: {
      hint: `A short title displayed at the top of the ${entity} page.`,
      help: `A short title for ${entity}, to be displayed at the top of its page.`
    },
    shortDescription: {
      hint: 'One or two sentences displayed in search results.',
      help: `A high-level description of ${entity} in one or two sentences, to be displayed in search results.`
    },
    abstractText: {
      hint: `The motivation for and approach of ${entity}. Supports Markdown.`,
      help: `The motivation for and approach of ${entity}.`
    },
    methodText: {
      hint: 'Data analysis methods from raw sequence data. Supports Markdown.',
      help: 'A condensed description of the data analysis, starting from raw sequence data, suitable for a specialist audience of MAVE researchers.'
    },
    doiIdentifiers: {
      hint: 'DOIs of associated digital resources. Use Publication identifiers for papers.',
      help: `The DOIs of any digital resources associated with ${entity}.`,
      detail: `Please note: If you would like to associate publications with ${entity} via their DOI, please do not do so here. Instead, use the publication identifiers field below.`
    },
    publicationIdentifiers: {
      hint: 'Search by DOI, PubMed ID, bioRxiv ID, or medRxiv ID.',
      help: `Any publications associated with ${entity}. You can search for publications to add by DOI, PubMed ID, bioRxiv ID, or medRxiv ID.`,
      detail:
        'Example searches: https://doi.org/10.1038/s41467-023-43041-4 (DOI as link), 10.1038/s41467-023-43041-4 (DOI), 38057330 (a Pubmed ID), 2022.06.10.22276179 (a bioRxiv or medRxiv ID)'
    },
    primaryPublication: {
      hint: 'The primary publication that describes the dataset.',
      help: 'Of the above publications, the primary publication that describes the dataset.'
    },
    contributors: {
      hint: "Enter each contributor's ORCID ID (e.g. 1111-1111-1111-1111).",
      help: `Contributors who may edit ${entity}. Enter each contributor's <a href="https://orcid.org" target="_blank">ORCID</a> ID and confirm their name.`,
      detail: 'Examples: 1111-1111-1111-1111'
    },
    extraMetadata: {
      hint: `Additional metadata about ${entity}, as a JSON file.`,
      help: `Any additional metadata about ${entity}, as a JSON file.`
    }
  }
}

export function experimentDescriptions(
  entity = 'this experiment'
): SharedDescriptions & {rawReadIdentifiers: FieldDescription} {
  return {
    ...sharedDescriptions(entity),
    title: {
      ...sharedDescriptions(entity).title,
      detail:
        'Examples: UBE2I yeast complementation, BRCA1 Y2H, PTEN VAMP-seq, Massively parallel functional dissection of ECR11 enhancer'
    },
    shortDescription: {
      ...sharedDescriptions(entity).shortDescription,
      detail:
        'Example: A machine-learning imputed and refined Deep Mutational Scan of the human SUMO1 using functional complementation in yeast.'
    },
    abstractText: {
      ...sharedDescriptions(entity).abstractText,
      detail:
        'May be formatted using <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. The focus should be on the MAVE data, rather than the full research contribution, so use your judgement when deciding what details are relevant.'
    },
    methodText: {
      ...sharedDescriptions(entity).methodText,
      detail:
        'May be formatted using <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. Should include:' +
        '<ul class="ml-5 list-disc text-sm">' +
        '<li>variant library construction methods,</li>' +
        '<li>description of the functional assay, including model system and selection type,</li>' +
        '<li>sequencing strategy and sequencing technology, and</li>' +
        '<li>structure of biological or technical replicates (if applicable).</li>' +
        '</ul>'
    },
    rawReadIdentifiers: {
      hint: 'Accession numbers from ArrayExpress, BioProject, GEO, or SRA.',
      help: 'Experimenters are encouraged to deposit their raw sequence data in a public repository and link it to the relevant experiment record(s).',
      detail:
        'MaveDB currently supports accession numbers for:' +
        '<ul class="ml-5 list-disc text-sm">' +
        '<li><a href="https://www.ebi.ac.uk/biostudies/arrayexpress" target="_blank">ArrayExpress</a></li>' +
        '<li><a href="https://www.ncbi.nlm.nih.gov/bioproject/" target="_blank">BioProject</a></li>' +
        '<li><a href="https://www.ncbi.nlm.nih.gov/geo/" target="_blank">Gene Expression Omnibus</a></li>' +
        '<li><a href="https://www.ncbi.nlm.nih.gov/sra" target="_blank">Sequence Read Archive</a></li>' +
        '</ul>'
    }
  }
}

interface CalibrationDescriptions {
  scoreSet: FieldDescription
  title: FieldDescription
  notes: FieldDescription
  baselineScore: FieldDescription
  baselineScoreDescription: FieldDescription
  classificationType: FieldDescription
  rangeLabel: FieldDescription
  rangeDescription: FieldDescription
  rangeClassification: FieldDescription
  rangeBoundaries: FieldDescription
  className: FieldDescription
  acmgClassification: FieldDescription
  acmgDetails: FieldDescription
  oddsPathsToggle: FieldDescription
  oddsPathsRatio: FieldDescription
  researchUseOnly: FieldDescription
  methodSources: FieldDescription
  thresholdSources: FieldDescription
  evidenceSources: FieldDescription
  classesFile: FieldDescription
}

export function calibrationDescriptions(): CalibrationDescriptions {
  return {
    scoreSet: {
      hint: 'The score set this calibration applies to.',
      help: 'Select the score set to which this calibration will apply.'
    },
    title: {
      hint: 'Display name for this calibration.',
      help: 'Provide a title for the calibration.',
      detail: 'Display name for this calibration used in visualizations and listings.'
    },
    notes: {
      hint: 'Additional notes or context for the calibration.',
      help: 'Provide additional notes or context for the calibration.'
    },
    baselineScore: {
      hint: 'The baseline score for this score set.',
      help: 'What is the baseline score for this score set?',
      detail: 'This number should not be in a range classified as abnormal.'
    },
    baselineScoreDescription: {
      hint: 'Description of how the baseline score was determined.',
      help: 'Enter a description for the baseline score.',
      detail:
        'This might include additional details about how the baseline score was determined or what it is intended to represent.'
    },
    classificationType: {
      hint: 'Whether calibration uses score ranges or categorical classes.',
      help: 'Is this functional calibration defined by score ranges or categorical classes?',
      detail:
        'You may define score calibrations by either providing numerical ranges or by providing categorical class names. When providing numerical ranges, these ranges will define variant classes based on the functional score of variants. If you provide class names, you should upload a CSV file containing the mapping of variants to classes and ensure that the class names match those you define below.'
    },
    rangeLabel: {
      hint: 'Display name used in visualizations.',
      help: 'Enter a label for this functional range.',
      detail: 'Display name used in visualizations.'
    },
    rangeDescription: {
      hint: 'Contextual meaning for the range.',
      help: 'Enter a description for this functional range.',
      detail: 'Provide contextual meaning for the range.'
    },
    rangeClassification: {
      hint: 'Normal, abnormal, or not specified.',
      help: 'How should this range be classified?',
      detail: 'Normal, abnormal, or not specified.'
    },
    rangeBoundaries: {
      hint: 'Upper and lower bounds for this range.',
      help: 'Upper and lower bounds.',
      detail: 'Use toggle buttons for inclusive/exclusive boundaries and infinity.'
    },
    className: {
      hint: 'Class name matching the accompanying CSV file.',
      help: 'The class name for this range.',
      detail: 'This class name should be identical to the name provided in your accompanying CSV file.'
    },
    acmgClassification: {
      hint: 'Evidence strength for this functional range.',
      help: 'Provide an evidence strength for this functional range?',
      detail: 'Optionally, you can provide a description of the evidence supporting this classification.'
    },
    acmgDetails: {
      hint: 'Criterion and evidence strength.',
      help: 'Criterion and evidence strength.'
    },
    oddsPathsToggle: {
      hint: 'Whether to provide OddsPaths for this range.',
      help: 'Provide OddsPaths?'
    },
    oddsPathsRatio: {
      hint: 'The OddsPaths ratio for this range.',
      help: 'OddsPaths ratio.'
    },
    researchUseOnly: {
      hint: 'Whether this calibration is for research use only.',
      help: "Mark this calibration as 'research use only'?",
      detail:
        'Selecting this option indicates that the calibration is intended for research purposes only and should not be used for variant interpretation.'
    },
    methodSources: {
      hint: 'Publications describing the calibration method.',
      help: 'Provide sources for calibration methods.',
      detail: 'These publications should describe the method by which this calibration was generated.'
    },
    thresholdSources: {
      hint: 'Publications describing the threshold evidence.',
      help: 'Provide sources for calibration thresholds.',
      detail: 'These publications should describe the evidence used to set the functional range thresholds.'
    },
    evidenceSources: {
      hint: 'Publications describing the evidence for classifications.',
      help: 'Provide sources for calibration evidence.',
      detail:
        'These publications should describe the evidence used to assign evidence strengths and pathogenicity classifications to functional ranges.'
    },
    classesFile: {
      hint: 'CSV file mapping variants to class names.',
      help: 'Class name CSV',
      detail:
        'Since you are providing categorical class names, please upload a CSV file mapping variants to these classes. This file should contain the following columns:<br />' +
        '- One of: <code>variant_urn</code>, <code>hgvs_nt</code>, <code>hgvs_pro</code>: The URN or HGVS notation of the variant. This column should be unique.<br />' +
        '- <code>class_name</code>: The name of the class associated with the variant'
    }
  }
}

export function scoreSetDescriptions(entity = 'this score set'): SharedDescriptions & {
  license: FieldDescription
  dataUsagePolicy: FieldDescription
  methodTextMetaAnalysis: FieldDescription
} {
  const shared = sharedDescriptions(entity)
  return {
    ...shared,
    title: {
      ...shared.title,
      detail:
        'Examples: CBS low-B6 imputed and refined, NUDT15 protein stability assay, Arrestin-1 binding, SpCas9 positive selection'
    },
    shortDescription: {
      ...shared.shortDescription,
      detail:
        'Example: A Deep Mutational Scan of the human cystathionine-beta-synthase (CBS) using functional complementation in yeast via DMS-TileSeq at low levels of Vitamin B6.'
    },
    abstractText: {
      ...shared.abstractText,
      detail:
        'May be formatted using <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. It is common for a score set to have the same abstract text as the experiment that it belongs to. The focus should be on the MAVE data, rather than the full research contribution, so use your judgement when deciding what details are relevant.'
    },
    methodText: {
      ...shared.methodText,
      detail:
        'May be formatted using <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. Should include:' +
        '<ul class="ml-5 list-disc text-sm">' +
        '<li>a description of how scores were generated from raw data, including any normalization,</li>' +
        '<li>the sequence read filtering approach used,</li>' +
        '<li>details of how replicates were combined (if applicable), and</li>' +
        '<li>a description of any additional data columns included in the score and count tables, including column naming conventions.</li>' +
        '</ul>'
    },
    methodTextMetaAnalysis: {
      hint: 'Data analysis methods from raw sequence data. Supports Markdown.',
      help: 'A condensed description of the data analysis, starting from raw sequence data, suitable for a specialist audience of MAVE researchers.',
      detail:
        'May be formatted using <a href="https://daringfireball.net/projects/markdown/syntax" target="_blank">Markdown</a>. Should include:' +
        '<ul class="ml-5 list-disc text-sm">' +
        '<li>a description of how the scores in this score set were generated from the data in the analyzed score sets, and</li>' +
        '<li>a description of any additional data columns included in the score and count tables, including column naming conventions.</li>' +
        '</ul>'
    },
    license: {
      hint: 'The license under which data is made available to the public.',
      help: `The license under which the data in ${entity} is made available to the public.`,
      detail: `For more on data licensing in MaveDB, see the <a href="${config.appBaseUrl}/docs/mavedb/submitting-data/metadata-guide.html#licenses" target="_blank">documentation</a>.`
    },
    dataUsagePolicy: {
      hint: 'Additional guidelines governing the usage of this data.',
      help: `Any additional guidelines governing the usage of the data in ${entity}.`,
      detail: "This may assert, for example, the original author's right to publish the data first."
    }
  }
}

interface TargetDescriptions {
  copyFromExisting: FieldDescription
  name: FieldDescription
  label: FieldDescription
  category: FieldDescription
  externalIdentifier: FieldDescription
  taxonomy: FieldDescription
  sequenceType: FieldDescription
  referenceSequence: FieldDescription
  isChromosome: FieldDescription
  assembly: FieldDescription
  geneName: FieldDescription
  accession: FieldDescription
}

export function targetDescriptions(): TargetDescriptions {
  return {
    copyFromExisting: {
      hint: 'Pre-fill target fields from a previously defined target.',
      help: 'Optionally copy data from an existing target to pre-fill the fields below.'
    },
    name: {
      hint: 'A name to identify this target on the score set page.',
      help: 'A name to identify this target on the score set page.'
    },
    label: {
      hint: 'A label for this target, used in MAVE-HGVS strings.',
      help: 'A label for this target, used in MAVE-HGVS strings.',
      detail: 'Should not contain spaces or colons.'
    },
    category: {
      hint: 'The biological category of the target.',
      help: 'The biological category of the target.'
    },
    externalIdentifier: {
      hint: 'Link this target to an external database accession.',
      help: 'Link this target to an external database accession.',
      detail:
        'An offset may be specified to indicate the position of the first base or residue of the target sequence in the linked accession.'
    },
    taxonomy: {
      hint: 'The taxonomy of the organism whose sequence was used as the target.',
      help: 'Search for the taxonomy of the organism whose sequence was used as the target.',
      detail: 'Select from the list provided by NCBI Taxonomy.'
    },
    sequenceType: {
      hint: 'DNA or protein.',
      help: 'What type of sequence is the target?'
    },
    referenceSequence: {
      hint: 'The reference sequence used as the target for the assay.',
      help: 'Upload a FASTA file containing the reference sequence used as the target for the assay.'
    },
    isChromosome: {
      hint: 'Whether this target represents a whole chromosome.',
      help: 'Does this target represent a whole chromosome?'
    },
    assembly: {
      hint: 'The reference genome assembly for this target.',
      help: 'Select the reference genome assembly.'
    },
    geneName: {
      hint: 'The target gene identified by HGNC gene name.',
      help: 'Search for and select the target gene by HGNC gene name.'
    },
    accession: {
      hint: 'The target accession or transcript identifier.',
      help: 'Select the target accession/transcript identifier.'
    }
  }
}

interface VariantScoreDescriptions {
  scoresFile: FieldDescription
  scoreColumnsMetadataFile: FieldDescription
  countsFile: FieldDescription
  countColumnsMetadataFile: FieldDescription
}

export function variantScoreDescriptions(): VariantScoreDescriptions {
  const docsUrl = `${config.appBaseUrl}/docs/mavedb/submitting-data/data-formats.html`
  return {
    scoresFile: {
      hint: 'A CSV file with each row describing a single variant.',
      help: 'Load a scores file',
      detail:
        'This file is required and should be a CSV file, with each row describing a single variant. For more information, see the ' +
        `<a href="${docsUrl}" target="_blank">documentation</a>.`
    },
    scoreColumnsMetadataFile: {
      hint: 'A JSON file describing score columns.',
      help: 'Load a scores column metadata file',
      detail:
        "This file is optional but recommended. Should be a JSON file with column names as keys and objects containing 'description' and optional 'details' strings as values."
    },
    countsFile: {
      hint: 'A CSV file containing variant count data.',
      help: 'Load a counts file',
      detail:
        'This file is optional but recommended. No required columns, but describe any columns via the column metadata file and methods section.'
    },
    countColumnsMetadataFile: {
      hint: 'A JSON file describing count columns.',
      help: 'Load a counts column metadata file',
      detail:
        "This file is optional but recommended. Should be a JSON file with column names as keys and objects containing 'description' and optional 'details' strings as values."
    }
  }
}

interface ScoreSetContextDescriptions {
  fixedExperiment: FieldDescription
  superseding: FieldDescription
  supersededScoreSet: FieldDescription
  metaAnalysis: FieldDescription
  metaAnalyzesScoreSets: FieldDescription
  experiment: FieldDescription
}

export function scoreSetContextDescriptions(): ScoreSetContextDescriptions {
  const docsUrl = `${config.appBaseUrl}/docs/mavedb/getting-started/key-concepts.html`
  return {
    fixedExperiment: {
      hint: 'The experiment this score set belongs to.',
      help: 'Experiment',
      detail:
        'To add a score set to a different experiment, supercede a score set or add a score set to meta-analysis, ' +
        'please navigate to "New score set". For more on the relationship between score sets and experiments, see the ' +
        `<a href="${docsUrl}" target="_blank">documentation</a>.`
    },
    superseding: {
      hint: 'Whether this score set replaces a previously published one.',
      help: 'Does this score set correct errors in and replace a score set previously published on MaveDB that you created?'
    },
    supersededScoreSet: {
      hint: 'The score set this one replaces.',
      help: 'What score set does this supersede?',
      detail: "Type the superseded score set's MaveDB URN here and select it from the list."
    },
    metaAnalysis: {
      hint: 'Whether this score set is derived from other score sets.',
      help: 'Is this score set a meta-analysis?',
      detail:
        'Meta-analyses are score sets derived from data in other score sets that were created by you or other users. For example:' +
        '<ul class="ml-5 list-disc text-sm">' +
        '<li>a score set that combines data from two other score sets to produce new scores, or</li>' +
        '<li>a score set that adds imputed missing values to the scores in another score set.</li>' +
        '</ul>'
    },
    metaAnalyzesScoreSets: {
      hint: 'The score sets analyzed by this meta-analysis.',
      help: 'What score set(s) does this score set analyze?',
      detail: "Type a score set's MaveDB URN here and select it from the list. You may choose more than one score set."
    },
    experiment: {
      hint: 'The experiment this score set belongs to.',
      help: 'To which experiment does this score set belong?',
      detail:
        'For more on the relationship between score sets and experiments, see the ' +
        `<a href="${docsUrl}" target="_blank">documentation</a>.`
    }
  }
}
