import {getErrorResponse, type GeneResponse, type GeneScoreSet} from '@/api/mavedb'

export type GeneErrorState = 'not-found' | 'retryable'

export interface GeneSummary {
  scoreSetCount: number
  totalScoredVariants: number
}

export interface GeneIdentifierLink {
  label: string
  value: string
  url: string
}

export interface GeneExperimentGroup {
  experimentUrn: string
  experimentTitle: string
  scoreSets: GeneScoreSet[]
}

function scoreSetDate(scoreSet: GeneScoreSet): string {
  return scoreSet.publishedDate || scoreSet.modificationDate || ''
}

export function sortGeneScoreSets(scoreSets: GeneScoreSet[]): GeneScoreSet[] {
  return [...scoreSets].sort((a, b) => {
    const dateComparison = scoreSetDate(b).localeCompare(scoreSetDate(a))
    return dateComparison || b.urn.localeCompare(a.urn)
  })
}

export function groupGeneScoreSetsByExperiment(scoreSets: GeneScoreSet[]): GeneExperimentGroup[] {
  const groups = new Map<string, GeneExperimentGroup>()

  for (const scoreSet of sortGeneScoreSets(scoreSets)) {
    const experimentUrn = scoreSet.experiment.urn
    const existingGroup = groups.get(experimentUrn)
    if (existingGroup) {
      existingGroup.scoreSets.push(scoreSet)
    } else {
      groups.set(experimentUrn, {
        experimentUrn,
        experimentTitle: scoreSet.experiment.title,
        scoreSets: [scoreSet]
      })
    }
  }

  return [...groups.values()]
}

export function getGeneSummary(gene: GeneResponse): GeneSummary {
  return {
    scoreSetCount: gene.total,
    totalScoredVariants: gene.totalScoredVariants
  }
}

export function getGeneIdentifierLinks(gene: GeneResponse): GeneIdentifierLink[] {
  const links = new Map<string, GeneIdentifierLink>()
  const addLink = (link: GeneIdentifierLink) => {
    const key = `${link.label.toLowerCase()}:${link.value}`
    if (!links.has(key)) {
      links.set(key, link)
    }
  }

  if (gene.hgncId) {
    addLink({
      label: 'HGNC',
      value: gene.hgncId,
      url: `https://www.genenames.org/data/gene-symbol-report/#!/hgnc_id/${encodeURIComponent(gene.hgncId)}`
    })
  } else if (gene.symbol) {
    addLink({
      label: 'HGNC',
      value: gene.symbol,
      url: `https://www.genenames.org/tools/search/#!/all?query=${encodeURIComponent(gene.symbol)}`
    })
  }

  if (gene.omimId) {
    addLink({
      label: 'OMIM',
      value: gene.omimId,
      url: `https://omim.org/entry/${encodeURIComponent(gene.omimId)}`
    })
  }

  return [...links.values()]
}

export function classifyGeneError(error: unknown): GeneErrorState {
  return getErrorResponse(error).status === 404 ? 'not-found' : 'retryable'
}

export function isMultiTargetScoreSet(scoreSet: Pick<GeneScoreSet, 'targetGenes'>): boolean {
  return scoreSet.targetGenes.length > 1
}
