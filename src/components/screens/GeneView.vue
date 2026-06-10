<template>
  <MvLayout>
    <template v-if="status === 'Loaded' && gene" #header>
      <MvPageHeader eyebrow="Gene" max-width="1000px" :title="gene.symbol">
        <template #subtitle>
          <div class="-mt-3 text-sm leading-relaxed text-text-secondary">{{ gene.name }}</div>
        </template>
      </MvPageHeader>
    </template>

    <MvPageLoading v-if="status === 'Loading' || status === 'NotLoaded'" text="Loading gene information..." />

    <MvItemNotFound v-else-if="status === 'NotFound'" :item-id="symbol" model="gene" />

    <MvServiceUnavailable
      v-else-if="status === 'Failed'"
      description="Gene information is temporarily unavailable. Please try again in a moment."
      retry-label="Retry gene lookup"
      @retry="loadFirstPage"
    />

    <template v-else-if="status === 'Loaded' && gene">
      <div class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8" style="max-width: 1000px">
        <section aria-labelledby="gene-facts-heading" class="mb-5 rounded-lg border border-border bg-white px-5 py-4">
          <h2 id="gene-facts-heading" class="mave-section-title mb-2">Gene facts</h2>
          <div class="gene-facts-grid grid grid-cols-1 gap-x-8 tablet:grid-cols-2">
            <MvDetailRow
              v-for="(fact, index) in geneFacts"
              :key="fact.label"
              :class="{'tablet:col-span-2': shouldSpanGeneFact(index)}"
              :label="fact.label"
              :value="fact.url ? null : fact.value"
            >
              <a
                v-if="fact.url"
                :aria-label="fact.ariaLabel"
                class="text-link"
                :href="fact.url"
                rel="noopener noreferrer"
                target="_blank"
              >
                {{ fact.value }}
              </a>
            </MvDetailRow>
          </div>
        </section>

        <section aria-labelledby="gene-score-sets-heading">
          <div class="mb-3 flex flex-col gap-1 tablet:flex-row tablet:items-center tablet:justify-between">
            <h2 id="gene-score-sets-heading" class="mave-section-title">Published score sets</h2>
            <span class="text-sm text-text-muted">
              {{ loadedScoreSetCount }} loaded ({{ totalScoreSetCount }} total)
            </span>
          </div>

          <MvEmptyState
            v-if="gene.scoreSets.length === 0"
            description="No published MaveDB score sets are available for this gene yet."
            title="No published MaveDB score sets"
          />

          <div v-else class="flex flex-col gap-2.5">
            <div
              v-for="group in groupedScoreSets"
              :key="group.experimentUrn"
              class="overflow-hidden rounded-lg border border-gray-200 border-l-[3px] border-l-sage-light bg-white"
            >
              <div class="px-5 pt-3 text-xs font-semibold text-gray-500">
                Experiment:
                <router-link class="text-link" :to="{name: 'experiment', params: {urn: group.experimentUrn}}">
                  {{ group.experimentTitle }}
                </router-link>
                <span v-if="group.scoreSets.length > 1" class="text-gray-400">
                  - {{ group.scoreSets.length }} score sets
                </span>
              </div>
              <MvScoreSetRow
                v-for="scoreSet in group.scoreSets"
                :key="scoreSet.urn"
                :score-set="scoreSet"
                show-multi-target-pill
              />
            </div>
          </div>

          <div v-if="canLoadMore" class="pt-5 text-center">
            <MvStatusMessage v-if="loadMoreError" class="mb-3 text-left" severity="error">
              Gene information is temporarily unavailable. Try again in a moment.
            </MvStatusMessage>
            <button
              class="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[5px] border-[1.5px] border-sage bg-white px-6 py-2 text-sm font-semibold text-sage hover:bg-sage-light disabled:cursor-wait disabled:opacity-70"
              :disabled="loadingMore"
              type="button"
              @click="loadMoreScoreSets"
            >
              <i v-if="loadingMore" class="pi pi-spinner pi-spin mr-2 text-xs" />
              Load more score sets
            </button>
          </div>
        </section>
      </div>
    </template>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import {getGene, type GeneResponse} from '@/api/mavedb'
import MvDetailRow from '@/components/common/MvDetailRow.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvScoreSetRow from '@/components/common/MvScoreSetRow.vue'
import MvServiceUnavailable from '@/components/common/MvServiceUnavailable.vue'
import MvStatusMessage from '@/components/common/MvStatusMessage.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import {
  classifyGeneError,
  getGeneIdentifierLinks,
  getGeneSummary,
  groupGeneScoreSetsByExperiment,
  type GeneExperimentGroup,
  type GeneIdentifierLink
} from '@/lib/genes'

type GeneStatus = 'NotLoaded' | 'Loading' | 'Loaded' | 'NotFound' | 'Failed'
type GeneFact = {
  label: string
  value: string
  url?: string
  ariaLabel?: string
}

const SCORE_SET_PAGE_SIZE = 20

export default defineComponent({
  name: 'GeneView',

  components: {
    MvDetailRow,
    MvEmptyState,
    MvItemNotFound,
    MvLayout,
    MvPageHeader,
    MvPageLoading,
    MvScoreSetRow,
    MvServiceUnavailable,
    MvStatusMessage
  },

  props: {
    symbol: {type: String, required: true}
  },

  setup() {
    return {head: useHead({title: 'Gene - MaveDB'})}
  },

  data() {
    return {
      gene: null as GeneResponse | null,
      status: 'NotLoaded' as GeneStatus,
      loadingMore: false,
      loadMoreError: false,
      loadMoreRequestId: 0,
      abortController: null as AbortController | null
    }
  },

  computed: {
    geneFacts(): GeneFact[] {
      if (!this.gene) return []
      const facts: GeneFact[] = [{label: 'Scored variants', value: this.scoredVariantCount}]

      if (this.gene.locusGroup) {
        facts.push({
          label: 'Locus type',
          value: this.gene.locusGroup
        })
      }

      if (this.gene.location) {
        facts.push({
          label: 'Chromosomal location',
          value: this.gene.location
        })
      }

      if (this.omimIdentifier) {
        facts.push({
          label: 'OMIM',
          value: this.omimIdentifier.value,
          url: this.omimIdentifier.url,
          ariaLabel: `OMIM ${this.omimIdentifier.value}`
        })
      }

      if (this.hgncIdentifier) {
        facts.push({
          label: 'HGNC',
          value: this.hgncIdentifier.value,
          url: this.hgncIdentifier.url,
          ariaLabel: `HGNC ${this.hgncIdentifier.value}`
        })
      }

      return facts
    },
    loadedScoreSetCount(): string {
      return (this.gene?.scoreSets.length ?? 0).toLocaleString()
    },
    totalScoreSetCount(): string {
      if (!this.gene) return '0'
      return getGeneSummary(this.gene).scoreSetCount.toLocaleString()
    },
    identifierLinks(): GeneIdentifierLink[] {
      return this.gene ? getGeneIdentifierLinks(this.gene) : []
    },
    hgncIdentifier(): GeneIdentifierLink | null {
      return this.identifierLinks.find((identifier) => identifier.label === 'HGNC') || null
    },
    omimIdentifier(): GeneIdentifierLink | null {
      return this.identifierLinks.find((identifier) => identifier.label === 'OMIM') || null
    },
    groupedScoreSets(): GeneExperimentGroup[] {
      return this.gene ? groupGeneScoreSetsByExperiment(this.gene.scoreSets) : []
    },
    canLoadMore(): boolean {
      return Boolean(this.gene && this.gene.scoreSets.length < this.gene.total)
    },
    scoredVariantCount(): string {
      if (!this.gene) return '0'
      return getGeneSummary(this.gene).totalScoredVariants.toLocaleString()
    }
  },

  watch: {
    symbol() {
      this.loadFirstPage()
    },
    gene(newGene: GeneResponse | null) {
      this.head?.patch({title: newGene ? `${newGene.symbol} - MaveDB` : 'Gene - MaveDB'})
    }
  },

  mounted() {
    this.loadFirstPage()
  },

  beforeUnmount() {
    this.abortController?.abort()
  },

  methods: {
    async loadFirstPage() {
      this.abortController?.abort()
      const controller = new AbortController()
      const symbol = this.symbol
      this.abortController = controller
      this.status = 'Loading'
      this.gene = null
      this.loadingMore = false
      this.loadMoreError = false
      this.loadMoreRequestId += 1

      try {
        const gene = await getGene(symbol, {limit: SCORE_SET_PAGE_SIZE, offset: 0}, controller.signal)
        if (controller.signal.aborted || this.abortController !== controller || this.symbol !== symbol) return
        this.gene = gene
        this.status = 'Loaded'
      } catch (error) {
        if (controller.signal.aborted || this.abortController !== controller || this.symbol !== symbol) return
        this.status = classifyGeneError(error) === 'not-found' ? 'NotFound' : 'Failed'
      }
    },

    async loadMoreScoreSets() {
      if (!this.gene || this.loadingMore) return
      this.abortController?.abort()
      const controller = new AbortController()
      const symbol = this.symbol
      this.abortController = controller
      const currentGene = this.gene
      const requestId = this.loadMoreRequestId + 1
      this.loadMoreRequestId = requestId
      this.loadingMore = true
      this.loadMoreError = false
      const offset = currentGene.scoreSets.length
      try {
        const nextPage = await getGene(symbol, {limit: SCORE_SET_PAGE_SIZE, offset}, controller.signal)
        if (
          controller.signal.aborted ||
          this.symbol !== symbol ||
          this.gene !== currentGene ||
          this.loadMoreRequestId !== requestId
        )
          return
        this.gene = {
          ...nextPage,
          scoreSets: [...currentGene.scoreSets, ...nextPage.scoreSets]
        }
      } catch {
        if (
          controller.signal.aborted ||
          this.symbol !== symbol ||
          this.gene !== currentGene ||
          this.loadMoreRequestId !== requestId
        )
          return
        this.loadMoreError = true
      } finally {
        if (this.loadMoreRequestId === requestId) {
          this.loadingMore = false
        }
      }
    },

    shouldSpanGeneFact(index: number): boolean {
      return this.geneFacts.length % 2 === 1 && index === this.geneFacts.length - 1
    }
  }
})
</script>

<style scoped>
@media (min-width: 56rem) {
  .gene-facts-grid > :nth-child(2) {
    border-top: none;
  }
}
</style>
