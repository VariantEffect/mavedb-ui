import Papa from 'papaparse'

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

export const AMINO_ACIDS_BY_HYDROPHILIA = Array.from('AVLIMFYWRHKDESTNQGCP*').reverse()

export function parseScores(csvData) {
  csvData = csvData.replace(/(^|\n|\r) *#[^\n\r]*(\n|\r|\r\n|$)/g, '$1')
  const records = Papa.parse(csvData, {
    header: true,
    // comment: '#', // We can't use this, because our data have unescaped #s.
    skipEmptyLines: true
  }).data
  records.forEach((record) => {
    if (record.score) {
      record.score = parseFloat(record.score)
    }
  })
  return records
}

export function singleLetterAminoAcidCode(code) {
  code = code.toUpperCase()
  if (code.length == 1) {
    return code
  }
  if (code.length == 3) {
    const aa = AMINO_ACIDS.find((aa) => aa.codes.triple == code)
    return aa ? aa.codes.single : null
  }
  // TODO Deal with the lowercase d-
  if (code.length == 5) {
    const aa = AMINO_ACIDS.find((aa) => aa.codes.dAminoAcidCode == code)
    return aa ? aa.codes.single : null
  }
  return null
}

// TODO What about *?
export function aminoAcidHydrophiliaRanking(aaCode) {
  let singleLetterCode = singleLetterAminoAcidCode(aaCode)
  if (singleLetterCode == null) {
    if (aaCode == '=') {
      return 0
    } else {
      return -1
    }
  }
  const ranking = AMINO_ACIDS_BY_HYDROPHILIA.indexOf(singleLetterCode)
  return ranking >= 0 ? ranking : null
}

const proVariantRegex = /^p\.([A-Za-z]{3})([0-9]+)([A-Za-z]{3}|=)$/

export function parseProVariant(variant) {
  const match = variant.match(proVariantRegex)
  if (!match) {
    // console.log(`WARNING: Unrecognized pro variant: ${variant}`)
    return null
  }
  return {
    position: parseInt(match[2]),
    original: match[1],
    substitution: match[3]
  }
}
