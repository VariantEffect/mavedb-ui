export type MeasurementType = 'nucleotide' | 'protein' | 'associatedNucleotide'

export const MEASUREMENT_TYPE_LABELS: Record<MeasurementType, {full: string; short: string}> = {
  nucleotide: {full: 'Nucleotide level', short: 'Nucleotide'},
  protein: {full: 'Protein level', short: 'Protein'},
  associatedNucleotide: {full: 'Synonymous nucleotide', short: 'Synonymous'}
}

export const MEASUREMENT_TYPE_CLASSES: Record<MeasurementType, string> = {
  nucleotide: 'bg-nucleotide-light text-nucleotide',
  protein: 'bg-protein-light text-protein',
  associatedNucleotide: 'bg-synonymous-nucleotide-light text-synonymous-nucleotide'
}
