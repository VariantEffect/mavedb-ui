<template>
  <div class="mavedb-assay-facts-card">
    <div class="mavedb-assay-facts-card-header">
      <span class="mavedb-assay-facts-heading">
        <template v-if="firstAuthor">{{ firstAuthor }}</template>
        <span v-if="firstAuthor && numAuthors > 1" class="mavedb-assay-facts-heading-et-al">&nbsp;et al.</span>
        <template v-if="geneAndYear"><template v-if="firstAuthor">&nbsp;</template>{{ geneAndYear }}</template>
        <span v-if="(firstAuthor || geneAndYear) && journal" class="mavedb-assay-facts-heading-journal"
          >&nbsp;{{ journal }}</span
        >
        <template v-if="missingAuthorGeneAndYear">Score set</template>
      </span>
    </div>
    <div class="mavedb-assay-facts-section mavedb-assay-facts-bottom-separator">
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Gene (HGNC symbol)</div>
        <div class="mavedb-assay-facts-value">
          {{ geneTextForScoreSet ? geneTextForScoreSet : 'Not specified' }}
        </div>
      </div>
    </div>
    <div class="mavedb-assay-facts-section">
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Assay Type</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="getKeyword('Phenotypic Assay Method')">
            {{ getKeyword('Phenotypic Assay Method') }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Molecular Mechanism Assessed</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="getKeyword('Molecular Mechanism Assessed')">
            {{ getKeyword('Molecular Mechanism Assessed') }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Variant Consequences Detected</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="getKeyword('Phenotypic Assay Mechanism')">
            {{ getKeyword('Phenotypic Assay Mechanism') }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Model System</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="getKeyword('Phenotypic Assay Model System')">
            {{ getKeyword('Phenotypic Assay Model System') }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Detects Splicing Variants?</div>
        <div class="mavedb-assay-facts-value" :class="{yellow: !detectsSplicing}">
          {{ detectsSplicing == null ? 'Not specified' : detectsSplicing ? 'Yes' : 'No' }}
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Detects NMD Variants?</div>
        <div class="mavedb-assay-facts-value" :class="{yellow: !detectsNmd}">
          {{ detectsNmd == null ? 'Not specified' : detectsNmd ? 'Yes' : 'No' }}
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Number of Variants</div>
        <div class="mavedb-assay-facts-value">
          <div>{{ scoreSet.numVariants?.toLocaleString() }}</div>
        </div>
      </div>
    </div>
    <div class="mavedb-assay-facts-section-title">
      Clinical Performance<sup v-if="!primaryScoreRangeIsInvestigatorProvided">*</sup>
    </div>
    <div class="mavedb-assay-facts-section">
      <div
        v-if="
          primaryScoreRange?.functionalClassifications?.some(
            (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
              r.oddspathsRatio
          )
        "
      >
        <div class="mavedb-assay-facts-row">
          <div class="mavedb-assay-facts-label">OddsPath – Normal</div>
          <div
            v-if="
              primaryScoreRange?.functionalClassifications?.some(
                (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
                  r.functionalClassification === 'normal' && r.oddspathsRatio
              )
            "
            class="mavedb-assay-facts-value"
          >
            {{ roundOddsPath(normalScoreRange?.oddspathsRatio) }}
            <span
              :class="[
                'mavedb-classification-badge',
                `mave-evidence-code-${
                  normalScoreRange?.acmgClassification ? formatEvidenceCode(normalScoreRange) : 'INDETERMINATE'
                }`
              ]"
            >
              {{ formatEvidenceCode(normalScoreRange) }}
            </span>
          </div>
          <div v-else class="mavedb-assay-facts-value">OddsPath normal not provided</div>
        </div>
        <div class="mavedb-assay-facts-row">
          <div class="mavedb-assay-facts-label">OddsPath – Abnormal</div>
          <div
            v-if="
              primaryScoreRange?.functionalClassifications?.some(
                (r: components['schemas']['mavedb__view_models__score_calibration__FunctionalClassification']) =>
                  r.functionalClassification === 'abnormal' && r.oddspathsRatio
              )
            "
            class="mavedb-assay-facts-value"
          >
            {{ roundOddsPath(abnormalScoreRange?.oddspathsRatio) }}
            <span
              :class="[
                'mavedb-classification-badge',
                `mave-evidence-code-${
                  abnormalScoreRange?.acmgClassification ? formatEvidenceCode(abnormalScoreRange) : 'INDETERMINATE'
                }`
              ]"
            >
              {{ formatEvidenceCode(abnormalScoreRange) }}
            </span>
          </div>
          <div v-else class="mavedb-assay-facts-value">OddsPath abnormal not provided</div>
        </div>
        <div v-if="!primaryScoreRangeIsInvestigatorProvided" style="font-size: 10px; margin-top: 4px">
          <sup>*</sup>OddsPath data from non-primary source(s):
          <template v-if="oddsPathSources">
            (
            <template v-for="(s, i) in oddsPathSources" :key="s.url">
              <a :href="s.url" rel="noopener" target="_blank">{{ shortCitationForPublication(s) }}</a
              ><span v-if="i < oddsPathSources.length - 1">, </span>
            </template>
            ).
          </template>
          <template v-else>.</template>
        </div>
      </div>
      <div v-else>OddsPath values are not provided for this score set.</div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import {defineComponent, PropType} from 'vue'

import {formatEvidenceCode} from '@/lib/calibrations'
import {getExperimentKeyword} from '@/lib/experiments'
import {firstAuthorLastName} from '@/lib/score-sets'
import {getTargetGeneName} from '@/lib/target-genes'
import {shortCitationForPublication} from '@/lib/publication'
import type {components} from '@/schema/openapi'

export default defineComponent({
  name: 'AssayFactSheet',

  props: {
    scoreSet: {
      type: Object as PropType<components['schemas']['ScoreSet']>,
      required: true
    }
  },

  setup() {
    return {
      shortCitationForPublication
    }
  },

  computed: {
    firstAuthor: function () {
      const author = firstAuthorLastName(this.scoreSet)
      return author ? author : null
    },

    numAuthors: function () {
      return this.scoreSet.primaryPublicationIdentifiers[0]?.authors.length ?? 0
    },

    geneAndYear: function () {
      const gene = this.geneTextForScoreSet
      const year = this.scoreSet.primaryPublicationIdentifiers[0]?.publicationYear
      const parts = [gene, year?.toString()].filter((x) => x != null)
      return parts.length > 0 ? parts.join(' ') : undefined
    },

    missingAuthorGeneAndYear: function () {
      return !this.firstAuthor && !this.geneAndYear
    },

    journal: function () {
      return this.scoreSet.primaryPublicationIdentifiers[0]?.publicationJournal
    },

    distinctGenesForTargets: function () {
      const geneNames = this.scoreSet.targetGenes?.map((tg) => getTargetGeneName(tg)) || []
      return _.uniq(geneNames.filter((name) => !_.isEmpty(name))) as string[]
    },

    geneTextForScoreSet: function () {
      if (this.distinctGenesForTargets.length == 0) {
        return null
      }

      return this.distinctGenesForTargets.length == 1 ? this.distinctGenesForTargets[0] : 'Multiple genes'
    },

    detectsNmd: function () {
      const libraryCreationMethod = this.getKeyword('Variant Library Creation Method')
      switch (libraryCreationMethod) {
        case 'Endogenous locus library method':
          if (this.scoreSet.urn.startsWith('urn:mavedb:00001242')) {
            return false
          }
          return true
        case 'In vitro construct library method':
          if (this.scoreSet.urn.startsWith('urn:mavedb:00001226')) {
            return true
          }
          return false
        default:
          return null
      }
    },

    detectsSplicing: function () {
      const libraryCreationMethod = this.getKeyword('Variant Library Creation Method')
      switch (libraryCreationMethod) {
        case 'Endogenous locus library method':
          return true
        case 'In vitro construct library method':
          if (this.scoreSet.urn.startsWith('urn:mavedb:00001226')) {
            return true
          }
          return false
        default:
          return null
      }
    },
    primaryScoreRange: function () {
      if (this.scoreSet.scoreCalibrations == null) {
        return null
      }

      return (
        Object.values(this.scoreSet.scoreCalibrations).filter((sr) => sr?.primary)[0] ||
        this.scoreSet.scoreCalibrations?.find((sr) => sr?.investigatorProvided) ||
        null
      )
    },
    primaryScoreRangeIsInvestigatorProvided: function () {
      if (this.scoreSet.scoreCalibrations == null) {
        return false
      }

      return this.primaryScoreRange === this.scoreSet.scoreCalibrations?.find((sr) => sr?.investigatorProvided)
    },
    abnormalScoreRange: function () {
      return (
        this.primaryScoreRange?.functionalClassifications?.find((r) => r.functionalClassification === 'abnormal') ||
        null
      )
    },
    normalScoreRange: function () {
      return (
        this.primaryScoreRange?.functionalClassifications?.find((r) => r.functionalClassification === 'normal') || null
      )
    },
    oddsPathSources() {
      return this.primaryScoreRange?.evidenceSources
    },
    sources: function () {
      return this.scoreSet.primaryPublicationIdentifiers.concat(this.scoreSet.secondaryPublicationIdentifiers)
    }
  },

  methods: {
    getKeyword(key: string): string | null {
      return getExperimentKeyword(this.scoreSet.experiment, key)
    },
    roundOddsPath: function (oddsPath: number | null | undefined) {
      return oddsPath?.toFixed(3)
    },
    formatEvidenceCode
  }
})
</script>

<style scoped>
/* Assay fact sheet layout */

.mavedb-assay-facts-card {
  width: 100%;
  border: 1px solid #000;
  padding: 1em;
  font-family: sans-serif;
  line-height: 1.5;
  box-sizing: border-box;
}

.mavedb-assay-facts-card-header {
  font-weight: bold;
  border-bottom: 0.19em solid #000;
  padding-bottom: 0.25em;
  margin-bottom: 0.5em;
}

.mavedb-assay-facts-section {
  margin-bottom: 0.75em;
}

.mavedb-assay-facts-section-title {
  font-weight: bold;
  margin: 0.375em 0;
  border-top: 0.06em solid #3e3d3dbb;
  padding-top: 0.5em;
  font-size: 1.1em;
}

.mavedb-assay-facts-row {
  display: flex;
  justify-content: space-between;
  margin: 0.125em 0;
}

.mavedb-assay-facts-bottom-separator {
  border-bottom: 0.06em solid #3e3d3dbb;
}

/* Assay facts data */

.mavedb-assay-facts-label {
  font-weight: bold;
  flex: 1;
}

.mavedb-assay-facts-value {
  position: relative;
  flex: 1;
  text-align: left;
}

.mavedb-assay-facts-value.yellow {
  background: var(--color-badge-alert);
  padding: 0.125em 0.25em;
  border-radius: 4px;
}

/* Heading */

.mavedb-assay-facts-heading {
  font-size: 1.4em;
}

.mavedb-assay-facts-heading-et-al,
.mavedb-assay-facts-heading-journal {
  font-style: italic;
}

/* Variant classification */

.mavedb-classification-badge {
  position: absolute;
  left: 6em;
  padding: 0.125em 0.375em;
  border-radius: 0.25em;
  font-size: 0.75em;
  font-weight: bold;
  margin-left: 0.25em;
}
</style>
