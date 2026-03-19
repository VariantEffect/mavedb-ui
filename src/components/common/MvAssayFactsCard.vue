<template>
  <div>
    <h3 class="mave-section-title">Assay Facts</h3>
    <div v-if="scoreSet" class="mb-2.5 pb-2.5 border-b border-border">
      <div class="text-base font-semibold text-text-primary leading-[1.3] mb-0.5">
        <router-link
          v-if="linkTitle"
          class="text-link"
          :to="{name: 'scoreSet', params: {urn: scoreSet.urn}, query: variantQuery}"
        >
          {{ getScoreSetShortName(scoreSet) }}
        </router-link>
        <span v-else>{{ getScoreSetShortName(scoreSet) }}</span>
      </div>
      <div v-if="geneName || scoreSet.numVariants" class="text-sm text-text-muted">
        <template v-if="geneName">{{ geneName }}</template>
        <template v-if="geneName && scoreSet.numVariants"> &middot; </template>
        <template v-if="scoreSet.numVariants">{{ scoreSet.numVariants.toLocaleString() }} variants</template>
      </div>
    </div>
    <div class="assay-facts-grid grid grid-cols-1 gap-x-8 tablet:grid-cols-2">
      <MvDetailRow fallback="Not specified" label="Assay type" :value="getKeyword('Phenotypic Assay Method')" />
      <MvDetailRow
        fallback="Not specified"
        label="Molecular mechanism"
        :value="getKeyword('Molecular Mechanism Assessed')"
      />
      <MvDetailRow
        fallback="Not specified"
        label="Variant consequences"
        :value="getKeyword('Phenotypic Assay Mechanism')"
      />
      <MvDetailRow fallback="Not specified" label="Model system" :value="getKeyword('Phenotypic Assay Model System')" />
      <MvDetailRow fallback="Not specified" label="Detects splicing?">
        <span
          v-if="detectsSplicing != null"
          :class="{'flex-1 bg-badge-alert px-1.5 py-px rounded': detectsSplicing === false}"
        >
          {{ detectsSplicing ? 'Yes' : 'No' }}
        </span>
      </MvDetailRow>
      <MvDetailRow fallback="Not specified" label="Detects NMD?">
        <span v-if="detectsNmd != null" :class="{'flex-1 bg-badge-alert px-1.5 py-px rounded': detectsNmd === false}">
          {{ detectsNmd ? 'Yes' : 'No' }}
        </span>
      </MvDetailRow>
    </div>
    <div class="mt-2 border-t border-border pt-2">
      <div class="text-[11px] font-bold uppercase tracking-[0.4px] text-[#999] mb-1">Assay OddsPath</div>
      <template v-if="hasOddsPath">
        <div class="assay-facts-grid grid grid-cols-1 gap-x-8 tablet:grid-cols-2">
          <MvDetailRow fallback="Not provided" label="OddsPath Normal">
            <template v-if="normalOddsPath != null">
              <span class="inline-block min-w-[7ch] font-mono font-bold">{{ normalOddsPath }}</span>
              <MvEvidenceTag v-if="normalEvidenceCode" class="ml-2" :code="normalEvidenceCode" />
            </template>
          </MvDetailRow>
          <MvDetailRow fallback="Not provided" label="OddsPath Abnormal">
            <template v-if="abnormalOddsPath != null">
              <span class="inline-block min-w-[7ch] font-mono font-bold">{{ abnormalOddsPath }}</span>
              <MvEvidenceTag v-if="abnormalEvidenceCode" class="ml-2" :code="abnormalEvidenceCode" />
            </template>
          </MvDetailRow>
        </div>
      </template>
      <p v-else class="text-xs-plus italic text-text-muted">Not provided</p>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvDetailRow from '@/components/common/MvDetailRow.vue'
import MvEvidenceTag from '@/components/common/MvEvidenceTag.vue'
import {
  findClassificationByType,
  formatEvidenceCode,
  getClassificationOddsPath,
  getPrimaryCalibration
} from '@/lib/calibrations'
import {getExperimentKeyword} from '@/lib/experiments'
import {getScoreSetShortName} from '@/lib/score-sets'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type ScoreCalibration = components['schemas']['ScoreCalibration']
type FunctionalClassification =
  components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']

export default defineComponent({
  name: 'MvAssayFactsCard',

  components: {
    MvDetailRow,
    MvEvidenceTag
  },

  props: {
    linkTitle: {type: Boolean, default: true},
    scoreSet: {type: Object as PropType<ScoreSet>, default: null},
    variantUrn: {type: String, default: null}
  },

  computed: {
    geneName(): string | null {
      const targets = this.scoreSet?.targetGenes
      if (targets?.length > 0) {
        return targets[0].mappedHgncName || targets[0].name || null
      }
      return null
    },
    variantQuery(): Record<string, string> {
      return this.variantUrn ? {variant: this.variantUrn} : {}
    },
    libraryCreationMethod(): string | null {
      return this.getKeyword('Variant Library Creation Method')
    },
    detectsSplicing(): boolean | null {
      switch (this.libraryCreationMethod) {
        case 'Endogenous locus library method':
          return true
        case 'In vitro construct library method':
          if (this.scoreSet?.urn?.startsWith('urn:mavedb:00001226')) return true
          return false
        default:
          return null
      }
    },
    detectsNmd(): boolean | null {
      switch (this.libraryCreationMethod) {
        case 'Endogenous locus library method':
          if (this.scoreSet?.urn?.startsWith('urn:mavedb:00001242')) return false
          return true
        case 'In vitro construct library method':
          if (this.scoreSet?.urn?.startsWith('urn:mavedb:00001226')) return true
          return false
        default:
          return null
      }
    },
    primaryCalibration(): ScoreCalibration | null {
      return getPrimaryCalibration(this.scoreSet) as ScoreCalibration | null
    },
    normalRange(): FunctionalClassification | null {
      return findClassificationByType(this.primaryCalibration, 'normal') as FunctionalClassification | null
    },
    abnormalRange(): FunctionalClassification | null {
      return findClassificationByType(this.primaryCalibration, 'abnormal') as FunctionalClassification | null
    },
    normalOddsPath(): string | null {
      return getClassificationOddsPath(this.primaryCalibration, 'normal', 3)
    },
    abnormalOddsPath(): string | null {
      return getClassificationOddsPath(this.primaryCalibration, 'abnormal', 3)
    },
    hasOddsPath(): boolean {
      return this.normalOddsPath != null || this.abnormalOddsPath != null
    },
    normalEvidenceCode(): string {
      return formatEvidenceCode(this.normalRange)
    },
    abnormalEvidenceCode(): string {
      return formatEvidenceCode(this.abnormalRange)
    }
  },

  methods: {
    getScoreSetShortName,
    getKeyword(key: string): string | null {
      return getExperimentKeyword(this.scoreSet?.experiment, key)
    }
  }
})
</script>

<style scoped>
/* In 2-col grid, the 2nd item is first in the right column — remove its inherited top border */
@media (min-width: 56rem) {
  .assay-facts-grid > :nth-child(2) {
    border-top: none;
  }
}
</style>
