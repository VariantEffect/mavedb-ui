<template>
  <div v-if="scoreSet.creationDate">
    Created {{ formatDate(scoreSet.creationDate) }}
    <span v-if="scoreSet.createdBy">
      <a class="flex items-center gap-1" :href="`https://orcid.org/${scoreSet.createdBy.orcidId}`" target="blank"
        ><img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />{{ scoreSet.createdBy.firstName }}
        {{ scoreSet.createdBy.lastName }}</a
      ></span
    >
  </div>
  <div v-if="scoreSet.modificationDate">
    Last updated {{ formatDate(scoreSet.modificationDate) }}
    <span v-if="scoreSet.modifiedBy">
      <a class="flex items-center gap-1" :href="`https://orcid.org/${scoreSet.modifiedBy.orcidId}`" target="blank"
        ><img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />{{ scoreSet.modifiedBy.firstName }}
        {{ scoreSet.modifiedBy.lastName }}</a
      ></span
    >
  </div>
  <div v-if="contributors.length > 0">
    Contributors
    <a
      v-for="contributor in contributors"
      :key="contributor.orcidId"
      class="mavedb-contributor flex items-center gap-1"
      :href="`https://orcid.org/${contributor.orcidId}`"
      target="blank"
    >
      <img alt="ORCIDiD" src="@/assets/ORCIDiD_icon.png" />
      {{ contributor.givenName }} {{ contributor.familyName }}
    </a>
  </div>
  <div v-if="scoreSet.publishedDate">Published {{ formatDate(scoreSet.publishedDate) }}</div>
  <div v-if="scoreSet.license">
    License:
    <a v-if="scoreSet.license.link" :href="scoreSet.license.link">{{
      scoreSet.license.longName || scoreSet.license.shortName
    }}</a>
    <span v-else>{{ scoreSet.license.longName || scoreSet.license.shortName }}</span>
  </div>
  <div v-if="scoreSet.dataUsagePolicy">Data usage policy: {{ scoreSet.dataUsagePolicy }}</div>
  <div v-if="scoreSet.experiment">
    Member of:
    <router-link :to="{name: 'experiment', params: {urn: scoreSet.experiment.urn}}">{{
      scoreSet.experiment.urn
    }}</router-link>
  </div>
  <div v-if="scoreSet.supersedingScoreSet">
    Current version:
    <router-link :to="{name: 'scoreSet', params: {urn: scoreSet.supersedingScoreSet.urn}}">{{
      scoreSet.supersedingScoreSet.urn
    }}</router-link>
  </div>
  <div v-else>
    Current version:
    <router-link :to="{name: 'scoreSet', params: {urn: scoreSet.urn}}">{{ scoreSet.urn }}</router-link>
  </div>
  <div v-if="sortedMetaAnalyzedByScoreSetUrns.length > 0">
    Meta-analyzed by:
    <template v-for="(urn, index) of sortedMetaAnalyzedByScoreSetUrns" :key="urn">
      <template v-if="index > 0"> · </template>
      <EntityLink entity-type="scoreSet" :urn="urn" />
    </template>
  </div>
  <div v-if="sortedMetaAnalyzesScoreSetUrns.length > 0">
    Meta-analyzes:
    <template v-for="(urn, index) of sortedMetaAnalyzesScoreSetUrns" :key="urn">
      <template v-if="index > 0"> · </template>
      <EntityLink entity-type="scoreSet" :urn="urn" />
    </template>
  </div>
  <div v-if="scoreSet.externalLinks?.ucscGenomeBrowser?.url">
    <a :href="scoreSet.externalLinks.ucscGenomeBrowser.url" target="blank">
      <img alt="UCSC Genome Browser" src="@/assets/logo-ucsc-genome-browser.png" style="height: 20px" />
      View in the UCSC Genome Browser
    </a>
  </div>
</template>

<script lang="ts" setup>
import _ from 'lodash'
import {computed, PropType} from 'vue'

import EntityLink from '@/components/common/EntityLink.vue'
import useFormatters from '@/composition/formatters'
import type {components} from '@/schema/openapi'

const {formatDate} = useFormatters()

const props = defineProps({
  scoreSet: {
    type: Object as PropType<components['schemas']['ScoreSet']>,
    required: true
  }
})

const contributors = computed(() => {
  return _.sortBy(
    (props.scoreSet?.contributors || []).filter((c) => c.orcidId != props.scoreSet.createdBy?.orcidId),
    ['familyName', 'givenName', 'orcidId']
  )
})

const sortedMetaAnalyzesScoreSetUrns = computed(() => _.sortBy(props.scoreSet.metaAnalyzesScoreSetUrns || []))
const sortedMetaAnalyzedByScoreSetUrns = computed(() => _.sortBy(props.scoreSet.metaAnalyzedByScoreSetUrns || []))
</script>

<style scoped>
.mavedb-contributor {
  margin: 0 0.5em;
}
</style>
