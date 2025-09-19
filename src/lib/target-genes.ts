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
