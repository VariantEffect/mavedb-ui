<template>
  <div class="nutrition-card">
    <div class="nutrition-card-header">
      <span class="nutrition-author">{{ authorLine }}</span>
    </div>
    <div class="nutrition-section bottom-line">
      <div class="nutrition-row">
        <div class="nutrition-label">Gene (HGNC symbol)</div>
        <div class="nutrition-value">{{ scoreSet.targetGenes[0]?.name }}</div>
      </div>
    </div>
    <div class="nutrition-section">
      <div class="nutrition-row">
        <div class="nutrition-label">Assay Type</div>
        <div class="nutrition-value">
          <div v-if="scoreSet.experiment.keywords?.some((k) => k.keyword.key === 'Phenotypic Assay Method')">
            {{ scoreSet.experiment.keywords.find((k) => k.keyword.key === "Phenotypic Assay Method").keyword.label}}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="nutrition-row">
        <div class="nutrition-label">Molecular Mechanism Assessed</div>
        <div class="nutrition-value">
          <div v-if="scoreSet.experiment.keywords?.some((k) => k.keyword.key === 'Phenotypic Assay Mechanism')">
            {{ scoreSet.experiment.keywords.find((k) => k.keyword.key === "Phenotypic Assay Mechanism").keyword.label }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="nutrition-row">
        <div class="nutrition-label">Model System</div>
        <div class="nutrition-value">
          <div
            v-if="scoreSet.experiment.keywords?.some((k) => k.keyword.key === 'Phenotypic Assay Model System')">
            {{ scoreSet.experiment.keywords.find((k) => k.keyword.key === "Phenotypic Assay Model System").keyword.label }}
          </div>
          <div v-else>Not specified</div>
        </div>
      </div>
      <div class="nutrition-row">
        <div class="nutrition-label">Detects Splicing Variants?</div>
        <div class="nutrition-value" :class="{ yellow: scoreSet.detectsSplicing === 'No' }">
          {{ scoreSet.detectsSplicing || "Yes" }}
        </div>
      </div>
      <div class="nutrition-row">
        <div class="nutrition-label">Detects NMD Variants?</div>
        <div class="nutrition-value" :class="{ yellow: scoreSet.detectsNmd === 'No' }">
          {{ scoreSet.detectsNmd || "Yes" }}
        </div>
      </div>
      <div class="nutrition-row">
        <div class="nutrition-label">Number of Variants</div>
        <div class="nutrition-value">
          <div>{{ scoreSet.numVariants }}</div>
        </div>
      </div>
    </div>
    <div class="nutrition-section-title">Clinical Performance</div>
    <div class="nutrition-section">
      <div v-if="scoreSet.scoreRanges?.investigatorProvided?.ranges[0]?.oddsPath?.ratio">
        <div class="nutrition-row">
          <div class="nutrition-label">OddsPath – Normal</div>
            <div class="nutrition-value" v-if="scoreSet.scoreRanges?.investigatorProvided?.ranges?.some((r) => r.classification === 'normal')">
              {{ scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === "normal").oddsPath?.ratio }}
              <span class="badge blue">
                {{ scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === "normal").oddsPath?.evidence }}
              </span>
            </div>
        </div>
        <div class="nutrition-row">
          <div class="nutrition-label">OddsPath – Abnormal</div>
            <div class="nutrition-value" v-if="scoreSet.scoreRanges?.investigatorProvided?.ranges?.some((r) => r.classification === 'abnormal')">
              {{ scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === "abnormal").oddsPath?.ratio }}
              <span class="badge strong red">
                {{ scoreSet.scoreRanges.investigatorProvided.ranges.find((r) => r.classification === "abnormal").oddsPath?.evidence }}
              </span>
            </div>
        </div>
      </div>
      <div v-else>
        OddsPath values are not provided for this score set.
      </div>
    </div>
  </div>
</template>

<script>

import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'AssayFactSheet',

  props: {
    scoreSet: {
      type: Object,
      required: true
    },
  },

  computed: {
    authorLine: function(){
      const author = this.scoreSet.primaryPublicationIdentifiers[0]?.authors[0].name
      const gene = this.scoreSet.targetGenes?.[0]?.name || ""
      const year = this.scoreSet.primaryPublicationIdentifiers[0]?.publicationYear || ""

      if (author && author.length > 0) {
        return `${author} et al. ${gene} ${year}`
      }
      return `${gene} ${year}`
    }
  }
})


</script>

<style scoped>

/* Nutrition label */

.nutrition-author {
  font-size: 21px;
}

.nutrition-card {
  width: 580px;   /* fixed size */
  border: 1px solid #000;
  padding: 12px;
  font-family: sans-serif;
  font-size: 14px;
  line-height: 1.4;
}

.nutrition-card-header {
  font-weight: bold;
  border-bottom: 3px solid #000;
  padding-bottom: 4px;
  margin-bottom: 8px;
}

.nutrition-section {
  margin-bottom: 12px;
}

.nutrition-section-title {
  font-weight: bold;
  margin: 6px 0;
  border-top: 1.0px solid #3e3d3dbb;
  padding-top: 4px;
  font-size: 16px;
  font-weight: bold;
}

.nutrition-row {
  display: flex;
  justify-content: space-between;
  margin: 2px 0;
}

.nutrition-label {
  font-weight: bold;
  flex: 1;
}

.nutrition-value {
  flex: 1;
  text-align: left;
}

.nutrition-value.yellow {
  background: #fef3c7;
  padding: 2px 4px;
  border-radius: 4px;
}

.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  margin-left: 4px;
}

.badge.blue {
  background: #1e40af;
  color: white;
}

.badge.red {
  background: #991b1b;
  color: white;
}

.bottom-line{
  border-bottom: 1px solid #3e3d3dbb;
}

</style>