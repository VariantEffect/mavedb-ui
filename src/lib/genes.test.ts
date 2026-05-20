import axios from 'axios'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {GeneResponse, GeneScoreSet} from '@/api/mavedb'

import {
  classifyGeneError,
  getGeneIdentifierLinks,
  getGeneSummary,
  groupGeneScoreSetsByExperiment,
  isMultiTargetScoreSet,
  sortGeneScoreSets
} from './genes'

vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  },
  isAxiosError: (error: unknown) => Boolean((error as {isAxiosError?: boolean}).isAxiosError)
}))

vi.mock('@/config', () => ({
  default: {
    apiBaseUrl: 'https://api.example'
  }
}))

const mockedAxiosGet = vi.mocked(axios.get)
type GetGene = typeof import('@/api/mavedb/genes')['getGene']

type ScoreSetOverrides = Partial<Omit<GeneScoreSet, 'experiment'>> & {
  experiment?: Partial<GeneScoreSet['experiment']>
}

function scoreSet(overrides: ScoreSetOverrides): GeneScoreSet {
  const experiment = {
    urn: 'urn:mavedb:00000001-a',
    title: 'Experiment',
    shortDescription: 'Experiment short description',
    creationDate: '2024-01-01',
    modificationDate: '2024-01-01',
    ...overrides.experiment
  } as GeneScoreSet['experiment']

  return {
    urn: 'urn:mavedb:00000001-a-1',
    title: 'Score set',
    shortDescription: 'Short description',
    publishedDate: '2024-01-01',
    replacesId: null,
    numVariants: 7,
    primaryPublicationIdentifiers: [],
    secondaryPublicationIdentifiers: [],
    license: {id: 1, shortName: 'CC BY', longName: 'Creative Commons', link: null, version: null},
    creationDate: '2024-01-01',
    modificationDate: '2024-01-01',
    targetGenes: [
      {
        id: 1,
        name: 'BRCA1',
        category: 'protein_coding',
        externalIdentifiers: [],
        targetSequence: null,
        targetAccession: null,
        mappedHgncName: 'BRCA1',
        uniprotIdFromMappedMetadata: null
      }
    ],
    private: false,
    ...overrides,
    experiment
  } as GeneScoreSet
}

function geneResponse(overrides: Partial<GeneResponse> = {}): GeneResponse {
  return {
    symbol: 'BRCA1',
    name: 'BRCA1 DNA repair associated',
    locusGroup: 'protein-coding gene',
    location: '17q21.31',
    hgncId: 'HGNC:1100',
    omimId: '113705',
    scoreSets: [],
    limit: 20,
    offset: 0,
    total: 0,
    totalScoredVariants: 0,
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('gene page helpers', () => {
  it('calls the encoded gene endpoint with pagination params, accept header, and abort signal', async () => {
    mockedAxiosGet.mockResolvedValueOnce({data: geneResponse({symbol: 'BRCA1/unsafe'})})
    const abortController = new AbortController()
    const {getGene} = (await import('@/api/mavedb/genes')) as {getGene: GetGene}

    await getGene('BRCA1/unsafe', {limit: 10, offset: 20}, abortController.signal)

    expect(mockedAxiosGet).toHaveBeenCalledWith('https://api.example/genes/BRCA1%2Funsafe', {
      headers: {accept: 'application/json'},
      params: {limit: 10, offset: 20},
      signal: abortController.signal
    })
  })

  it('sorts score sets newest-first with a deterministic URN tie-breaker', () => {
    const older = scoreSet({urn: 'urn:mavedb:00000001-a-1', publishedDate: '2024-01-01'})
    const newer = scoreSet({urn: 'urn:mavedb:00000001-a-2', publishedDate: '2024-03-01'})
    const sameDateHigherUrn = scoreSet({urn: 'urn:mavedb:00000001-a-3', publishedDate: '2024-03-01'})

    expect(sortGeneScoreSets([older, newer, sameDateHigherUrn]).map((item) => item.urn)).toEqual([
      sameDateHigherUrn.urn,
      newer.urn,
      older.urn
    ])
  })

  it('groups score sets by experiment and orders groups by each group newest row', () => {
    const olderExperiment = scoreSet({
      urn: 'urn:mavedb:00000001-a-1',
      publishedDate: '2024-01-01',
      experiment: {urn: 'urn:mavedb:00000001-a', title: 'Older experiment'}
    })
    const newerExperiment = scoreSet({
      urn: 'urn:mavedb:00000002-a-1',
      publishedDate: '2024-03-01',
      experiment: {urn: 'urn:mavedb:00000002-a', title: 'Newer experiment'}
    })
    const olderExperimentSecondRow = scoreSet({
      urn: 'urn:mavedb:00000001-a-2',
      publishedDate: '2024-02-01',
      experiment: {urn: 'urn:mavedb:00000001-a', title: 'Older experiment'}
    })

    const groups = groupGeneScoreSetsByExperiment([olderExperiment, newerExperiment, olderExperimentSecondRow])

    expect(groups.map((group) => group.experimentUrn)).toEqual(['urn:mavedb:00000002-a', 'urn:mavedb:00000001-a'])
    expect(groups[1].scoreSets.map((item) => item.urn)).toEqual([
      olderExperimentSecondRow.urn,
      olderExperiment.urn
    ])
  })

  it('uses API totals for summary counts instead of the loaded page length', () => {
    const gene = geneResponse({scoreSets: [scoreSet({})], total: 12, totalScoredVariants: 345})

    expect(getGeneSummary(gene)).toEqual({scoreSetCount: 12, totalScoredVariants: 345})
  })

  it('extracts HGNC and OMIM links without surfacing target-level external identifiers', () => {
    const duplicateEnsemblIdentifier = {
      offset: 0,
      identifier: {
        dbName: 'Ensembl',
        identifier: 'ENSG00000012048',
        url: 'https://ensembl.org/id/ENSG00000012048'
      }
    }
    const duplicateEnsemblIdentifierWithAlternateUrl = {
      offset: 0,
      identifier: {
        dbName: 'Ensembl',
        identifier: 'ENSG00000012048',
        url: 'https://alternate.example/ENSG00000012048'
      }
    }
    const gene = geneResponse({
      omimId: '113705',
      scoreSets: [
        scoreSet({
          targetGenes: [
            {
              id: 1,
              name: 'BRCA1',
              category: 'protein_coding',
              mappedHgncName: 'BRCA1',
              uniprotIdFromMappedMetadata: null,
              targetSequence: null,
              targetAccession: null,
              externalIdentifiers: [
                duplicateEnsemblIdentifier,
                duplicateEnsemblIdentifier,
                duplicateEnsemblIdentifierWithAlternateUrl,
                {
                  offset: 0,
                  identifier: {
                    dbName: 'RefSeq',
                    identifier: 'NM_007294.4',
                    url: 'https://www.ncbi.nlm.nih.gov/nuccore/NM_007294.4'
                  }
                },
                {
                  offset: 0,
                  identifier: {
                    dbName: 'UniProt',
                    identifier: 'P38398',
                    url: 'https://www.uniprot.org/uniprotkb/P38398'
                  }
                }
              ]
            },
            {
              id: 2,
              name: 'TP53',
              category: 'protein_coding',
              mappedHgncName: 'TP53',
              uniprotIdFromMappedMetadata: null,
              targetSequence: null,
              targetAccession: null,
              externalIdentifiers: [
                {
                  offset: 0,
                  identifier: {
                    dbName: 'Ensembl',
                    identifier: 'ENSG00000141510',
                    url: 'https://ensembl.org/id/ENSG00000141510'
                  }
                }
              ]
            }
          ]
        })
      ]
    })

    expect(getGeneIdentifierLinks(gene)).toEqual([
      {
        label: 'HGNC',
        value: 'HGNC:1100',
        url: 'https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/HGNC%3A1100'
      },
      {label: 'OMIM', value: '113705', url: 'https://omim.org/entry/113705'}
    ])
  })

  it('falls back to HGNC symbol search when an HGNC ID is not available', () => {
    expect(getGeneIdentifierLinks(geneResponse({hgncId: null, omimId: null}))).toEqual([
      {
        label: 'HGNC',
        value: 'BRCA1',
        url: 'https://www.genenames.org/tools/search/#!/all?query=BRCA1'
      }
    ])
  })

  it('classifies 404 as not found and service failures as retryable', () => {
    expect(classifyGeneError({isAxiosError: true, response: {status: 404}})).toBe('not-found')
    expect(classifyGeneError({isAxiosError: true, response: {status: 503}})).toBe('retryable')
    expect(classifyGeneError(new Error('network failed'))).toBe('retryable')
  })

  it('detects multi-target score sets from targetGenes length', () => {
    expect(isMultiTargetScoreSet(scoreSet({targetGenes: [scoreSet({}).targetGenes[0]]}))).toBe(false)
    expect(
      isMultiTargetScoreSet(
        scoreSet({
          targetGenes: [scoreSet({}).targetGenes[0], {...scoreSet({}).targetGenes[0], id: 2, name: 'TP53'}]
        })
      )
    ).toBe(true)
  })
})
