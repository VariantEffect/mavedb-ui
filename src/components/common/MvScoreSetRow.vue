<template>
  <div class="flex min-w-0 flex-col gap-1.5 px-5 py-3 hover:bg-gray-50">
    <router-link class="block text-link no-underline" :to="{name: 'scoreSet', params: {urn: scoreSet.urn}}">
      <div class="text-xs-minus font-medium">{{ scoreSet.urn }}</div>
      <div class="text-md font-semibold leading-snug">{{ scoreSet.title }}</div>
    </router-link>
    <p v-if="scoreSet.shortDescription && showDescription" class="text-sm leading-snug text-gray-600">
      {{ scoreSet.shortDescription }}
    </p>
    <div v-if="showMeta" class="flex flex-wrap items-center gap-1.5">
      <template v-if="showCollections && collections.length">
        <CollectionBadge v-for="col in collections" :key="col.urn" :collection="col" size="sm" />
        <span class="mx-0.5 text-border">|</span>
      </template>
      <MvPill v-for="gene in visibleGenes" :key="gene" :label="gene" title="Target gene" variant="blue" />
      <MvPill
        v-if="geneNames.length > maxTags"
        :label="`+${geneNames.length - maxTags} more`"
        :title="`${geneNames.length - maxTags} more target genes`"
        variant="blue"
      />
      <MvPill
        v-for="organism in visibleOrganisms"
        :key="organism"
        :label="organism"
        title="Organism"
        variant="orange"
      />
      <MvPill
        v-if="organisms.length > maxTags"
        :label="`+${organisms.length - maxTags} more`"
        :title="`${organisms.length - maxTags} more organisms`"
        variant="orange"
      />
      <MvPill
        v-if="sequenceType"
        :label="sequenceType"
        title="Sequence type"
        :variant="sequenceType === 'Nucleotide' ? 'nucleotide' : 'protein'"
      />
      <MvPill
        v-if="scoreSet.numVariants"
        :label="`${scoreSet.numVariants.toLocaleString()} variants`"
        title="Number of variants"
      />
      <span v-if="scoreSet.publishedDate" class="ml-auto whitespace-nowrap text-xs-minus text-gray-400">
        Published {{ formattedDate }}
      </span>
      <span v-else class="ml-auto whitespace-nowrap text-xs-minus text-gray-400"> Unpublished </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import CollectionBadge from '@/components/common/MvCollectionBadge.vue'
import MvPill from '@/components/common/MvPill.vue'
import {getTargetGeneName} from '@/lib/target-genes'
import {components} from '@/schema/openapi'

type FullScoreSet = components['schemas']['ScoreSet']
type ShortScoreSet = components['schemas']['ShortScoreSet']
type ScoreSet = ShortScoreSet | FullScoreSet

const MAX_TAGS = 3

export default defineComponent({
  name: 'MvScoreSetRow',

  components: {CollectionBadge, MvPill},

  props: {
    scoreSet: {
      type: Object as PropType<ScoreSet>,
      required: true
    },
    showCollections: {
      type: Boolean,
      default: false
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
    collections(): FullScoreSet['officialCollections'] {
      return 'officialCollections' in this.scoreSet ? (this.scoreSet as FullScoreSet).officialCollections : []
    },
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
