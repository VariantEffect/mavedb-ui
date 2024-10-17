<template>
  <div class="mave-statistics">
    <div v-if="scoreSet.numVariants" class="mave-statistics-group">
      <div class="mave-statistic">
        <label>Total number of variants:</label>
        {{ formatCount(scoreSet.numVariants) }}
      </div>
    </div>
    <div v-if="scoreSet.statistics?.targetLength" class="mave-statistics-group">
      <div class="mave-statistic">
        <label>Target length:</label>
        <label class="mave-statistic-sublabel">DNA</label>
        {{ formatCount(scoreSet.statistics.targetLength.dna) }}
        <label class="mave-statistic-sublabel">Protein</label>
        {{ formatCount(scoreSet.statistics.targetLength.protein) }}
      </div>
    </div>
    <div v-if="scoreSet.statistics?.meanNumMutationsPerPosition?.dna || scoreSet.statistics?.meanNumMutationsPerPosition?.protein" class="mave-statistics-group">
      <div class="mave-statistic">
        <label>Avg. # mutations per position:</label>
        <span v-if="scoreSet.statistics.meanNumMutationsPerPosition.dna">
          <label class="mave-statistic-sublabel">DNA</label>
          {{ formatFloat(scoreSet.statistics.meanNumMutationsPerPosition.dna) }}
        </span>
        <span v-if="scoreSet.statistics.meanNumMutationsPerPosition.protein">
          <label class="mave-statistic-sublabel">Protein</label>
          {{ formatFloat(scoreSet.statistics.meanNumMutationsPerPosition.protein) }}
        </span>
      </div>
    </div>
    <div v-if="scoreSet.statistics?.numSpliceVariants != null && scoreSet.statistics?.numSpliceVariants > 0" class="mave-statistics-group">
      <div class="mave-statistic">
        <label># splice variants:</label>
        {{ formatCount(scoreSet.statistics.numSpliceVariants) }}
      </div>
    </div>
    <div v-if="scoreSet.statistics?.numVariantsByMutationCount?.pro" class="mave-statistics-group">
      <div class="mave-statistic">
        <label>Variants by number of protein sequence mutations:</label>
        <label class="mave-statistic-sublabel">Single</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationCount.pro.single) }}
        <label class="mave-statistic-sublabel">Double</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationCount.pro.double) }}
        <label class="mave-statistic-sublabel">Triple+</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationCount.pro.tripleOrMore) }}
      </div>
    </div>
    <div v-if="scoreSet.statistics?.numVariantsByMutationCount?.nt" class="mave-statistics-group">
      <div class="mave-statistic">
        <label>Variants by number of NT sequence mutations:</label>
        <label class="mave-statistic-sublabel">Single</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationCount.nt.single) }}
        <label class="mave-statistic-sublabel">Double</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationCount.nt.double) }}
        <label class="mave-statistic-sublabel">Triple+</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationCount.nt.tripleOrMore) }}
      </div>
    </div>
    <div v-if="scoreSet.statistics?.numVariantsByMutationType" class="mave-statistics-group">
      <div class="mave-statistic">
        <label>Variants by type:</label>
        <label class="mave-statistic-sublabel">Nonsense</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationType.nonsense) }}
        <label class="mave-statistic-sublabel">Missense</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationType.missense) }}
        <label class="mave-statistic-sublabel">Synonymous</label>
        {{ formatCount(scoreSet.statistics.numVariantsByMutationType.synonymous) }}
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'ScoreSetStatistics',

  props: {
    scoreSet: {
      type: Object,
      required: true
    }
  },

  methods: {
    formatCount: (n) => n == null ? '' : n.toLocaleString(),
    formatFloat: (x) => x == null ? '' : x.toFixed(2)
  }
}

</script>

<style scoped>

.mave-statistics {
  margin: 1em 0;
}

.mave-statistics-group {
  clear: both;
}

.mave-statistic {
  clear: both;
}

.mave-statistic::after {
  content: "";
  clear: both;
  display: table;
}

.mave-statistic label {
  padding: 0 0.5em 0 0;
}

.mave-statistic label.mave-statistic-sublabel {
  float: none;
  background-color: #666;
  color: #fff;
  padding: 0 4px;
  border-radius: 3px;
  margin-left: 1em;
  font-weight: normal;
}

</style>
