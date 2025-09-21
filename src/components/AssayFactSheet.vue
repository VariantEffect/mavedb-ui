<template>
  <div class="mavedb-assay-facts-card">
    <div class="mavedb-assay-facts-card-header">
      <span class="mavedb-assay-facts-author">{{ authorLine }}</span>
    </div>
    <div class="mavedb-assay-facts-section mavedb-assay-facts-bottom-separator">
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Gene (HGNC symbol)</div>
        <div class="mavedb-assay-facts-value">{{ scoreSet.targetGenes[0]?.name }}</div>
      </div>
    </div>
    <div class="mavedb-assay-facts-section">
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Assay Type</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="scoreSet.experiment.keywords?.some((k) => k.keyword.key === 'Phenotypic Assay Method')">
            {{ scoreSet.experiment.keywords.find((k) => k.keyword.key === 'Phenotypic Assay Method').keyword.label }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Molecular Mechanism Assessed</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="scoreSet.experiment.keywords?.some((k) => k.keyword.key === 'Phenotypic Assay Mechanism')">
            {{ scoreSet.experiment.keywords.find((k) => k.keyword.key === 'Phenotypic Assay Mechanism').keyword.label }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Model System</div>
        <div class="mavedb-assay-facts-value">
          <div v-if="scoreSet.experiment.keywords?.some((k) => k.keyword.key === 'Phenotypic Assay Model System')">
            {{
              scoreSet.experiment.keywords.find((k) => k.keyword.key === 'Phenotypic Assay Model System').keyword.label
            }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <!--
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Detects Splicing Variants?</div>
        <div class="mavedb-assay-facts-value" :class="{ yellow: scoreSet.detectsSplicing === 'No' }">
          {{ scoreSet.detectsSplicing || "Yes" }}
        </div>
      </div>
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Detects NMD Variants?</div>
        <div class="mavedb-assay-facts-value" :class="{ yellow: scoreSet.detectsNmd === 'No' }">
          {{ scoreSet.detectsNmd || "Yes" }}
        </div>
      </div>
      -->
      <div class="mavedb-assay-facts-row">
        <div class="mavedb-assay-facts-label">Number of Variants</div>
        <div class="mavedb-assay-facts-value">
          <div>{{ scoreSet.numVariants?.toLocaleString() }}</div>
        </div>
      </div>
    </div>
    <div class="mavedb-assay-facts-section-title">Clinical Performance</div>
    <div class="mavedb-assay-facts-section">
      <div v-if="scoreSet.scoreRanges?.investigatorProvided?.ranges[0]?.oddsPath?.ratio">
        <div class="mavedb-assay-facts-row">
          <div class="mavedb-assay-facts-label">OddsPath – Normal</div>
          <div
            v-if="scoreSet.scoreRanges?.investigatorProvided?.ranges?.some((r) => r.classification === 'normal')"
            class="mavedb-assay-facts-value"
          >
            {{
              roundOddsPath(
                scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === 'normal').oddsPath
                  ?.ratio
              )
            }}
            <span class="mavedb-classification-badge mavedb-blue">
              {{
                scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === 'normal').oddsPath
                  ?.evidence
              }}
            </span>
          </div>
        </div>
        <div class="mavedb-assay-facts-row">
          <div class="mavedb-assay-facts-label">OddsPath – Abnormal</div>
          <div
            v-if="scoreSet.scoreRanges?.investigatorProvided?.ranges?.some((r) => r.classification === 'abnormal')"
            class="mavedb-assay-facts-value"
          >
            {{
              roundOddsPath(
                scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === 'abnormal').oddsPath
                  ?.ratio
              )
            }}
            <span class="mavedb-classification-badge mavedb-red strong">
              {{
                scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === 'abnormal').oddsPath
                  ?.evidence
              }}
            </span>
          </div>
        </div>
      </div>
      <div v-else>OddsPath values are not provided for this score set.</div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue'

import type {components} from '@/schema/openapi'

export default defineComponent({
  name: 'AssayFactSheet',

  props: {
    scoreSet: {
      type: Object as PropType<components['schemas']['ScoreSet']>,
      required: true
    }
  },

  computed: {
    authorLine: function () {
      const author = this.scoreSet.primaryPublicationIdentifiers[0]?.authors[0].name
      const gene = this.scoreSet.targetGenes?.[0]?.name || ''
      const year = this.scoreSet.primaryPublicationIdentifiers[0]?.publicationYear || ''

      if (author && author.length > 0) {
        return `${author} et al. ${gene} ${year}`
      }
      return `${gene} ${year}`
    }
  },

  methods: {
    roundOddsPath: function (oddsPath: number | undefined) {
      return oddsPath?.toPrecision(5)
    }
  }
})
</script>

<style scoped>
/* Assay fact sheet layout */

.mavedb-assay-facts-card {
  width: 580px; /* fixed size */
  border: 1px solid #000;
  padding: 12px;
  font-family: sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

.mavedb-assay-facts-card-header {
  font-weight: bold;
  border-bottom: 3px solid #000;
  padding-bottom: 4px;
  margin-bottom: 8px;
}

.mavedb-assay-facts-section {
  margin-bottom: 12px;
}

.mavedb-assay-facts-section-title {
  font-weight: bold;
  margin: 6px 0;
  border-top: 1px solid #3e3d3dbb;
  padding-top: 4px;
  font-size: 16px;
  font-weight: bold;
}

.mavedb-assay-facts-row {
  display: flex;
  justify-content: space-between;
  margin: 2px 0;
}

.mavedb-assay-facts-bottom-separator {
  border-bottom: 1px solid #3e3d3dbb;
}

/* Assay facts data */

.mavedb-assay-facts-label {
  font-weight: bold;
  flex: 1;
}

.mavedb-assay-facts-value {
  flex: 1;
  text-align: left;
}

.mavedb-assay-facts-value.yellow {
  background: #fef3c7;
  padding: 2px 4px;
  border-radius: 4px;
}

/* Specific fields */

.mavedb-assay-facts-author {
  font-size: 21px;
}

/* Variant classification */

.mavedb-classification-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-left: 4px;
}

.mavedb-classification-badge.mavedb-blue {
  background: #1e40af;
  color: white;
}

.mavedb-classification-badge.mavedb-red {
  background: #991b1b;
  color: white;
}
</style>
