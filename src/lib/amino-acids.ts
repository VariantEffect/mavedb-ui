/** Amino acids, their codes, hydrophobicity based on Kyte-Doolittle scale, and class based on Enrich2 paper (fig.1).
 *
 * Kyte-Doolittle data source: https://github.com/channotation/chap/blob/master/share/data/hydrophobicity/kyte_doolittle_1982.json
 * reference: http://www.sciencedirect.com/science/article/pii/0022283682905150
 *
 * Enrich2 reference: https://genomebiology.biomedcentral.com/articles/10.1186/s13059-017-1272-5/figures/1
 */
export const AMINO_ACIDS = [
  {
    name: 'Alanine',
    codes: {single: 'A', triple: 'ALA', dAminoAcidCode: 'd-ALA'},
    class: 'non-polar',
    hydrophobicity: {normalizedValue: 0.4, originalValue: 1.8}
  },
  {
    name: 'Arginine',
    codes: {single: 'R', triple: 'ARG', dAminoAcidCode: 'd-ARG'},
    class: 'positive-charged',
    hydrophobicity: {normalizedValue: -1.0, originalValue: -4.5}
  },
  {
    name: 'Asparagine',
    codes: {single: 'N', triple: 'ASN', dAminoAcidCode: 'd-ASN'},
    class: 'polar-neutral',
    hydrophobicity: {normalizedValue: -0.77777778, originalValue: -3.5}
  },
  {
    name: 'Aspartic Acid',
    codes: {single: 'D', triple: 'ASP', dAminoAcidCode: 'd-ASP'},
    class: 'negative-charged',
    hydrophobicity: {normalizedValue: -0.77777778, originalValue: -3.5}
  },
  {
    name: 'Cysteine',
    codes: {single: 'C', triple: 'CYS', dAminoAcidCode: 'd-CYS'},
    class: 'polar-neutral',
    hydrophobicity: {normalizedValue: 0.55555556, originalValue: 2.5}
  },
  {
    name: 'Glutamic Acid',
    codes: {single: 'E', triple: 'GLU', dAminoAcidCode: 'd-GLU'},
    class: 'negative-charged',
    hydrophobicity: {normalizedValue: -0.77777778, originalValue: -3.5}
  },
  {
    name: 'Glutamine',
    codes: {single: 'Q', triple: 'GLN', dAminoAcidCode: 'd-GLN'},
    class: 'polar-neutral',
    hydrophobicity: {normalizedValue: -0.77777778, originalValue: -3.5}
  },
  {
    name: 'Glycine',
    codes: {single: 'G', triple: 'GLY', dAminoAcidCode: ''},
    class: 'unique',
    hydrophobicity: {normalizedValue: -0.08888889, originalValue: -0.4}
  },
  {
    name: 'Histidine',
    codes: {single: 'H', triple: 'HIS', dAminoAcidCode: 'd-HIS'},
    class: 'positive-charged',
    hydrophobicity: {normalizedValue: -0.71111111, originalValue: -3.2}
  },
  {
    name: 'Isoleucine',
    codes: {single: 'I', triple: 'ILE', dAminoAcidCode: 'd-ILE'},
    class: 'non-polar',
    hydrophobicity: {normalizedValue: 1.0, originalValue: 4.5}
  },
  {
    name: 'Leucine',
    codes: {single: 'L', triple: 'LEU', dAminoAcidCode: 'd-LEU'},
    class: 'non-polar',
    hydrophobicity: {normalizedValue: 0.84444444, originalValue: 3.8}
  },
  {
    name: 'Lysine',
    codes: {single: 'K', triple: 'LYS', dAminoAcidCode: 'd-LYS'},
    class: 'positive-charged',
    hydrophobicity: {normalizedValue: -0.86666667, originalValue: -3.9}
  },
  {
    name: 'Methionine',
    codes: {single: 'M', triple: 'MET', dAminoAcidCode: 'd-MET'},
    class: 'polar-neutral',
    hydrophobicity: {normalizedValue: 0.42222222, originalValue: 1.9}
  },
  {
    name: 'Phenylalanine',
    codes: {single: 'F', triple: 'PHE', dAminoAcidCode: 'd-PHE'},
    class: 'aromatic',
    hydrophobicity: {normalizedValue: 0.62222222, originalValue: 2.8}
  },
  {
    name: 'Proline',
    codes: {single: 'P', triple: 'PRO', dAminoAcidCode: 'd-PRO'},
    class: 'unique',
    hydrophobicity: {normalizedValue: -0.35555556, originalValue: -1.6}
  },
  {
    name: 'Serine',
    codes: {single: 'S', triple: 'SER', dAminoAcidCode: 'd-SER'},
    class: 'polar-neutral',
    hydrophobicity: {normalizedValue: -0.17777778, originalValue: -0.8}
  },
  {
    name: 'Threonine',
    codes: {single: 'T', triple: 'THR', dAminoAcidCode: 'd-THR'},
    class: 'polar-neutral',
    hydrophobicity: {normalizedValue: -0.15555556, originalValue: -0.7}
  },
  {
    name: 'Tryptophan',
    codes: {single: 'W', triple: 'TRP', dAminoAcidCode: 'd-TRP'},
    class: 'aromatic',
    hydrophobicity: {normalizedValue: -0.2, originalValue: -0.9}
  },
  {
    name: 'Tyrosine',
    codes: {single: 'Y', triple: 'TYR', dAminoAcidCode: 'd-TYR'},
    class: 'aromatic',
    hydrophobicity: {normalizedValue: -0.28888889, originalValue: -1.3}
  },
  {
    name: 'Valine',
    codes: {single: 'V', triple: 'VAL', dAminoAcidCode: 'd-VAL'},
    class: 'non-polar',
    hydrophobicity: {normalizedValue: 0.93333333, originalValue: 4.2}
  }
]

export const AMINO_ACIDS_WITH_TER = [...AMINO_ACIDS, {name: 'Termination', codes: {single: '*', triple: 'Ter'}}]

/**
 * Single-letter amino acid codes, ordered from hydrophobic to hydrophilic.
 *
 * The ordering is adopted from mavevis (https://github.com/VariantEffect/mavevis) and does not seem to correspond to a
 * standard hydrophobicity scale.
 */
export const AMINO_ACIDS_BY_HYDROPHILIA = Array.from('PCGQNTSEDKHRWYFMILVA')
