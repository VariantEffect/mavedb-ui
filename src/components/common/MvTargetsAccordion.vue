<template>
  <div class="mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-white">
    <div class="border-b border-border-light px-5 py-3.5">
      <span class="text-xs font-bold uppercase tracking-wider text-text-dark">Targets</span>
    </div>

    <!-- Grouped by score set (experiment view) -->
    <template v-if="scoreSets && scoreSets.length > 0">
      <div v-for="(scoreSet, ssIdx) in scoreSets" :key="scoreSet.urn">
        <div class="border-b border-border-light px-5 py-2">
          <router-link class="text-xs font-semibold text-link" :to="{name: 'scoreSet', params: {urn: scoreSet.urn}}">
            {{ scoreSet.title || scoreSet.urn }}
          </router-link>
          <div class="text-[0.6875rem] text-text-muted leading-snug -mt-1">{{ scoreSet.urn }}</div>
        </div>
        <div class="pl-4">
          <MvCollapsible v-for="(gene, geneIdx) in scoreSet.targetGenes" :key="`${scoreSet.urn}-${geneIdx}`" :open="ssIdx === 0">
            <template #header>
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-text-primary">{{ getTargetGeneName(gene) }}</span>
                <span v-if="gene.category" class="text-xs font-medium text-text-muted">{{
                  textForTargetGeneCategory(gene.category)
                }}</span>
              </div>
            </template>
            <MvTargetGeneDetails :gene="gene" />
          </MvCollapsible>
        </div>
      </div>
    </template>

    <!-- Direct target genes (score set view) -->
    <template v-else-if="targetGenes && targetGenes.length > 0">
      <MvCollapsible v-for="(gene, i) in targetGenes" :key="i">
        <template #header>
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-text-primary">{{ getTargetGeneName(gene) }}</span>
            <span v-if="gene.category" class="text-xs font-medium text-text-muted">{{
              textForTargetGeneCategory(gene.category)
            }}</span>
          </div>
        </template>
        <MvTargetGeneDetails :gene="gene" />
      </MvCollapsible>
    </template>

    <div v-else class="px-5 py-4 text-sm italic text-text-muted">No associated targets</div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvCollapsible from '@/components/common/MvCollapsible.vue'
import MvTargetGeneDetails from '@/components/common/MvTargetGeneDetails.vue'
import {getTargetGeneName, textForTargetGeneCategory} from '@/lib/target-genes'
import {components} from '@/schema/openapi'

type TargetGene = components['schemas']['TargetGene']

export default defineComponent({
  name: 'MvTargetsAccordion',

  components: {MvCollapsible, MvTargetGeneDetails},

  props: {
    scoreSets: {
      type: Array as PropType<Array<{urn: string; title?: string; targetGenes: TargetGene[]}>>,
      default: null
    },
    targetGenes: {type: Array as PropType<TargetGene[]>, default: null}
  },

  methods: {
    getTargetGeneName,
    textForTargetGeneCategory
  }
})
</script>
