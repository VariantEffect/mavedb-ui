/** Amino acids and their codes. */
export const AMINO_ACIDS = [
  {name: 'Alanine', codes: {single: 'A', triple: 'ALA', dAminoAcidCode: 'd-ALA'}},
  {name: 'Arginine', codes: {single: 'R', triple: 'ARG', dAminoAcidCode: 'd-ARG'}},
  {name: 'Asparagine', codes: {single: 'N', triple: 'ASN', dAminoAcidCode: 'd-ASN'}},
  {name: 'Aspartic Acid', codes: {single: 'D', triple: 'ASP', dAminoAcidCode: 'd-ASP'}},
  {name: 'Cysteine', codes: {single: 'C', triple: 'CYS', dAminoAcidCode: 'd-CYS'}},
  {name: 'Glutamic Acid', codes: {single: 'E', triple: 'GLU', dAminoAcidCode: 'd-GLU'}},
  {name: 'Glutamine', codes: {single: 'Q', triple: 'GLN', dAminoAcidCode: 'd-GLN'}},
  {name: 'Glycine', codes: {single: 'G', triple: 'GLY', dAminoAcidCode: ''}},
  {name: 'Histidine', codes: {single: 'H', triple: 'HIS', dAminoAcidCode: 'd-HIS'}},
  {name: 'Isoleucine', codes: {single: 'I', triple: 'ILE', dAminoAcidCode: 'd-ILE'}},
  {name: 'Leucine', codes: {single: 'L', triple: 'LEU', dAminoAcidCode: 'd-LEU'}},
  {name: 'Lysine', codes: {single: 'K', triple: 'LYS', dAminoAcidCode: 'd-LYS'}},
  {name: 'Methionine', codes: {single: 'M', triple: 'MET', dAminoAcidCode: 'd-MET'}},
  {name: 'Phenylalanine', codes: {single: 'F', triple: 'PHE', dAminoAcidCode: 'd-PHE'}},
  {name: 'Proline', codes: {single: 'P', triple: 'PRO', dAminoAcidCode: 'd-PRO'}},
  {name: 'Serine', codes: {single: 'S', triple: 'SER', dAminoAcidCode: 'd-SER'}},
  {name: 'Threonine', codes: {single: 'T', triple: 'THR', dAminoAcidCode: 'd-THR'}},
  {name: 'Tryptophan', codes: {single: 'W', triple: 'TRP', dAminoAcidCode: 'd-TRP'}},
  {name: 'Tyrosine', codes: {single: 'Y', triple: 'TYR', dAminoAcidCode: 'd-TYR'}},
  {name: 'Valine', codes: {single: 'V', triple: 'VAL', dAminoAcidCode: 'd-VAL'}}
]

export const AMINO_ACIDS_WITH_TER = [
  ...AMINO_ACIDS,
  {name: 'Termination', codes: {single: '*', triple: 'Ter'}}
]

/**
 * Single-letter amino acid codes, ordered from hydrophobic to hydrophilic.
 *
 * The ordering is adopted from mavevis (https://github.com/VariantEffect/mavevis) and does not seem to correspond to a
 * standard hydrophobicity scale.
 */
export const AMINO_ACIDS_BY_HYDROPHILIA = Array.from('PCGQNTSEDKHRWYFMILVA')
