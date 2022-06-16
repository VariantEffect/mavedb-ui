import _ from 'lodash'

const geneticCodes = {
  standard: {
    dna: {
      aaToCodons: {
        'A': ['GCA','GCC','GCG','GCT'], 
        'C': ['TGC','TGT'], 
        'D': ['GAC', 'GAT'],
        'E': ['GAA','GAG'],
        'F': ['TTC','TTT'],
        'G': ['GGA','GGC','GGG','GGT'],
        'H': ['CAC','CAT'],
        'I': ['ATA','ATC','ATT'],
        'K': ['AAA','AAG'],
        'L': ['CTA','CTC','CTG','CTT','TTA','TTG'],
        'M': ['ATG'],
        'N': ['AAC','AAT'],
        'P': ['CCA','CCC','CCG','CCT'],
        'Q': ['CAA','CAG'],
        'R': ['AGA','AGG','CGA','CGC','CGG','CGT'],
        'S': ['AGC','AGT','TCA','TCC','TCG','TCT'],
        'T': ['ACA','ACC','ACG','ACT'],
        'V': ['GTA','GTC','GTG','GTT'],
        'W': ['TGG'],
        'Y': ['TAC','TAT']
      }
    }
  }
}

for (const code of _.keys(geneticCodes)) {
  if (geneticCodes[code]?.dna?.aaToCodons) {
    geneticCodes[code].dna.codonToAa = _.fromPairs(
      _.flatten(
        _.values(
          _.mapValues(geneticCodes[code].dna.aaToCodons, (codons, aa) => codons.map((codon) => [codon, aa]))
        )
      )
    )
  }
}

export default geneticCodes
