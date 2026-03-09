<template>
  <div class="flex min-w-0 flex-col gap-1.5 px-5 py-3 hover:bg-gray-50">
    <router-link
      class="break-words text-sm font-semibold leading-snug text-link"
      :to="{name: 'scoreSet', params: {urn: scoreSet.urn}}"
    >
      {{ scoreSet.title }}
    </router-link>
    <p v-if="scoreSet.shortDescription && showDescription" class="text-sm leading-snug text-gray-600">
      {{ scoreSet.shortDescription }}
    </p>
    <div v-if="showMeta" class="flex flex-wrap items-center gap-1.5">
      <span
        v-for="gene in visibleGenes"
        :key="gene"
        class="inline-block whitespace-nowrap rounded-xl border border-mint bg-sage-light px-2.5 py-px text-[0.6875rem] font-semibold text-sage-dark"
        title="Target gene"
      >
        {{ gene }}
      </span>
      <span
        v-if="geneNames.length > maxTags"
        class="inline-block whitespace-nowrap rounded-xl border border-mint bg-sage-light px-2.5 py-px text-[0.6875rem] font-semibold text-sage-dark"
        :title="`${geneNames.length - maxTags} more target genes`"
      >
        +{{ geneNames.length - maxTags }} more
      </span>
      <span
        v-for="organism in visibleOrganisms"
        :key="organism"
        class="inline-block whitespace-nowrap rounded-xl border border-orange-border bg-orange-light px-2.5 py-px text-[0.6875rem] font-semibold italic text-orange-cta-dark"
        title="Organism"
      >
        {{ organism }}
      </span>
      <span
        v-if="organisms.length > maxTags"
        class="inline-block whitespace-nowrap rounded-xl border border-orange-border bg-orange-light px-2.5 py-px text-[0.6875rem] font-semibold italic text-orange-cta-dark"
        :title="`${organisms.length - maxTags} more organisms`"
      >
        +{{ organisms.length - maxTags }} more
      </span>
      <span
        v-if="sequenceType"
        class="inline-block whitespace-nowrap rounded-xl border border-calibrated-border bg-calibrated-light px-2.5 py-px text-[0.6875rem] font-semibold text-calibrated"
        title="Sequence type"
      >
        {{ sequenceType }}
      </span>
      <span
        v-if="scoreSet.numVariants"
        class="inline-block whitespace-nowrap rounded-xl border border-gray-300 bg-gray-100 px-2.5 py-px text-[0.6875rem] font-semibold text-gray-600"
        title="Number of variants"
      >
        {{ scoreSet.numVariants.toLocaleString() }} variants
      </span>
      <span v-if="scoreSet.publishedDate" class="ml-auto whitespace-nowrap text-[0.6875rem] text-gray-400">
        Published {{ formattedDate }}
      </span>
      <span v-else class="ml-auto whitespace-nowrap text-[0.6875rem] text-gray-400"> Unpublished </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import {getTargetGeneName} from '@/lib/target-genes'

interface ScoreSetData {
  urn: string
  title: string
  shortDescription?: string
  numVariants?: number
  publishedDate?: string | null
  targetGenes?: {
    name: string
    mappedHgncName?: string | null
    targetAccession?: {accession?: string} | null
    targetSequence?: {
      sequenceType?: string | null
      taxonomy?: {
        organismName?: string | null
      } | null
    } | null
  }[]
}

const MAX_TAGS = 3

export default defineComponent({
  name: 'MvScoreSetRow',

  props: {
    scoreSet: {
      type: Object as PropType<ScoreSetData>,
      required: true
    },
    showDescription: {
      type: Boolean,
      default: true
    },
    showMeta: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    maxTags(): number {
      return MAX_TAGS
    },
    geneNames(): string[] {
      if (!this.scoreSet.targetGenes) return []
      return [...new Set(this.scoreSet.targetGenes.map((g) => getTargetGeneName(g)).filter(Boolean))]
    },
    visibleGenes(): string[] {
      return this.geneNames.slice(0, MAX_TAGS)
    },
    organisms(): string[] {
      if (!this.scoreSet.targetGenes) return []
      return [
        ...new Set(
          this.scoreSet.targetGenes.map((g) => g.targetSequence?.taxonomy?.organismName).filter(Boolean) as string[]
        )
      ]
    },
    visibleOrganisms(): string[] {
      return this.organisms.slice(0, MAX_TAGS)
    },
    sequenceType(): string | null {
      const target = this.scoreSet.targetGenes?.[0]
      if (!target) return null
      // Infer that accession based targets are DNA.
      if (target.targetAccession) return 'Nucleotide'
      const type = target.targetSequence?.sequenceType
      if (type === 'dna') return 'Nucleotide'
      if (type === 'protein') return 'Protein'
      return null
    },
    formattedDate(): string {
      if (!this.scoreSet.publishedDate) return ''
      const date = new Date(this.scoreSet.publishedDate)
      return date.toLocaleDateString('en-US', {month: 'short', year: 'numeric'})
    }
  }
})
</script>
