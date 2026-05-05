/**
 * Returns the preferred display name for a target gene.
 * Prefers `mappedHgncName` (the HGNC-mapped name) when available,
 * falling back to the user-provided `name` field.
 */
export function getTargetGeneName(gene: {name: string; mappedHgncName?: string | null}): string {
  return gene.mappedHgncName || gene.name
}

export const EXTERNAL_GENE_DATABASES = ['UniProt', 'Ensembl', 'RefSeq'] as const
export const SEQUENCE_TYPES = ['DNA', 'protein'] as const

/** The identifier field during editing: an object after selection, a string while typing, or null. */
export type EditableIdentifier = {identifier: string; dbName: string} | string | null

export interface EditableIdentifierOffset {
  identifier: EditableIdentifier
  offset: number | null
}

/** Creates a blank target gene object for the target form. */
export function emptyTargetGene() {
  return {
    index: null as number | null,
    name: null as string | null,
    category: null as TargetGeneCategory | null,
    type: null as string | null,
    targetSequence: {
      sequenceType: null as string | null,
      sequence: null as string | null,
      label: null as string | null,
      reference: null as string | null,
      taxonomy: null as Record<string, unknown> | null
    },
    targetAccession: {
      accession: null as string | null,
      assembly: null as string | null,
      gene: null as string | null
    },
    externalIdentifiers: Object.fromEntries(
      EXTERNAL_GENE_DATABASES.map((dbName) => [dbName, {identifier: null, offset: null}])
    ) as Record<string, EditableIdentifierOffset>
  }
}

export type TargetGene = ReturnType<typeof emptyTargetGene>

export type TargetGeneCategory = 'protein_coding' | 'regulatory' | 'other_noncoding'

export const TARGET_GENE_CATEGORIES: TargetGeneCategory[] = ['protein_coding', 'regulatory', 'other_noncoding']

export function textForTargetGeneCategory(cat: TargetGeneCategory): string | undefined {
  switch (cat) {
    case 'protein_coding':
      return 'Protein Coding'
    case 'regulatory':
      return 'Regulatory'
    case 'other_noncoding':
      return 'Other noncoding'
    default:
      return undefined
  }
}

/** UI wrapper state for a target gene in the form (TargetEditor internal state). */
export interface TargetGeneFormState {
  isRelativeToChromosome: boolean
  linkedAccessions: Record<string, boolean>
  autofilledTargetGene: TargetGene | null
}

/** The API-ready payload shape returned by TargetEditor.getPayload(). */
export interface TransformedTargetGene {
  name: string | null
  category: TargetGeneCategory | null
  targetSequence: {
    sequenceType: string | null
    sequence: string | null
    label: string | null
    taxonomy: Record<string, unknown> | null
  } | null
  targetAccession: {
    accession: string | null
    assembly: string | null
    gene: string | null
    isBaseEditor?: boolean
  } | null
  externalIdentifiers: Array<{
    offset: number | null
    identifier: {identifier: string; dbName: string}
  }>
}
