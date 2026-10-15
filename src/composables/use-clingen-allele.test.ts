import {effectScope, ref} from 'vue'
import {describe, expect, test, vi} from 'vitest'

import type {ClinGenAllele} from '@/api/clingen/types'
import {useClingenAllele} from '@/composables/use-clingen-allele'

const records: Record<string, ClinGenAllele> = {
  CA1: {
    '@id': 'http://reg.genome.network/allele/CA1',
    transcriptAlleles: [
      {hgvs: 'NM_1.3:c.5A>C'},
      {
        hgvs: 'NM_1.4:c.5A>C',
        MANE: {
          maneStatus: 'MANE Select',
          nucleotide: {RefSeq: {hgvs: 'NM_1.4:c.5A>C'}, Ensembl: {hgvs: 'ENST1.9:c.5A>C'}}
        }
      }
    ]
  } as ClinGenAllele,
  PA1: {
    '@id': 'http://reg.genome.network/allele/PA1',
    aminoAcidAlleles: [
      {hgvs: ['NP_1.1:p.Ser2Arg'], matchingRegisteredTranscripts: [{'@id': 'http://reg.genome.network/allele/CA1'}]}
    ]
  } as ClinGenAllele
}

vi.mock('@/api/clingen/alleles', () => ({
  getAlleleByCaId: vi.fn(async (id: string) => records[id])
}))

async function maneTranscriptsFor(id: string): Promise<string[]> {
  const scope = effectScope()
  const clingen = scope.run(() => useClingenAllele(ref(id)))!
  await clingen.fetchAllele()
  const transcripts = clingen.maneTranscripts.value
  scope.stop()
  return transcripts
}

describe('useClingenAllele — maneTranscripts', () => {
  test('reads a nucleotide allele’s own MANE transcripts', async () => {
    expect(await maneTranscriptsFor('CA1')).toEqual(['NM_1.4', 'ENST1.9'])
  })

  test('reads an amino-acid allele’s MANE transcripts from the nucleotide allele it encodes', async () => {
    expect(await maneTranscriptsFor('PA1')).toEqual(['NM_1.4', 'ENST1.9'])
  })
})
