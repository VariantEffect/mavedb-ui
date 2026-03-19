<template>
  <div class="mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-white p-5">
    <h3 v-if="title" class="mave-section-title">{{ title }}</h3>
    <div class="flex flex-col">
      <MvDetailRow align="flex-start" label="Contributors">
        <div v-if="contributors && contributors.length > 0" class="flex flex-wrap gap-x-3 gap-y-1">
          <MvOrcidLink
            v-for="contributor in contributors"
            :key="contributor.orcidId"
            :first-name="contributor.givenName"
            :last-name="contributor.familyName"
            :orcid-id="contributor.orcidId"
            size="sm"
          />
        </div>
      </MvDetailRow>
      <MvDetailRow v-if="license" label="License">
        <a v-if="license.link" :href="license.link" rel="noopener noreferrer" target="_blank">{{
          license.longName || license.shortName
        }}</a>
        <template v-else>{{ license.longName || license.shortName }}</template>
      </MvDetailRow>
      <MvDetailRow label="Data policy">
        <span v-if="dataUsagePolicy">{{ dataUsagePolicy }}</span>
        <span v-else class="italic text-text-muted">No special data usage policies.</span>
      </MvDetailRow>
      <MvDetailRow v-if="supersedingUrn" label="Superseded by">
        <router-link class="text-link" :to="{name: 'scoreSet', params: {urn: supersedingUrn}}">{{
          supersedingUrn
        }}</router-link>
      </MvDetailRow>
      <MvDetailRow v-else-if="supersededUrn || !supersedingUrn" label="Version" value="Current version" />
      <MvDetailRow v-if="supersededUrn" label="Supersedes">
        <router-link class="text-link" :to="{name: 'scoreSet', params: {urn: supersededUrn}}">{{
          supersededUrn
        }}</router-link>
      </MvDetailRow>
      <MvDetailRow v-if="parentUrn" :label="parentLabel">
        <router-link class="text-link" :to="{name: parentRouteName, params: {urn: parentUrn}}">{{
          parentUrn
        }}</router-link>
      </MvDetailRow>
      <MvDetailRow v-if="externalLinks && externalLinks.igvf && externalLinks.igvf.url" label="External data">
        <a class="inline-flex items-center gap-1.5 text-link no-underline" :href="externalLinks.igvf.url" rel="noopener noreferrer" target="_blank">
          <img alt="IGVF" class="h-4" :src="igvfLogo" />
          View in IGVF Portal
        </a>
      </MvDetailRow>
      <MvDetailRow v-if="externalLinks && externalLinks.ucsc && externalLinks.ucsc.url" label="Genome browser">
        <a class="inline-flex items-center gap-1.5 text-link no-underline" :href="externalLinks.ucsc.url" rel="noopener noreferrer" target="_blank">
          <img alt="UCSC" class="h-4" :src="ucscLogo" />
          View in UCSC Browser
        </a>
      </MvDetailRow>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import igvfLogo from '@/assets/igvf-tag.png'
import ucscLogo from '@/assets/logo-ucsc-genome-browser.png'
import MvDetailRow from '@/components/common/MvDetailRow.vue'
import MvOrcidLink from '@/components/common/MvOrcidLink.vue'
import {components} from '@/schema/openapi'

type Contributor = components['schemas']['Contributor']
type License = components['schemas']['ShortLicense']
type ExternalLinks = Record<string, components['schemas']['ExternalLink'] | undefined>

export default defineComponent({
  name: 'MvProvenanceCard',

  components: {MvDetailRow, MvOrcidLink},

  props: {
    title: {type: String as PropType<string | null>, default: null},
    contributors: {type: Array as PropType<Contributor[]>, default: () => []},
    dataUsagePolicy: {type: String as PropType<string | null>, default: null},
    externalLinks: {type: Object as PropType<ExternalLinks | null>, default: null},
    license: {type: Object as PropType<License | null>, default: null},
    parentLabel: {type: String, default: 'Parent'},
    parentRouteName: {type: String, default: 'experimentSet'},
    parentUrn: {type: String as PropType<string | null>, default: null},
    supersededUrn: {type: String as PropType<string | null>, default: null},
    supersedingUrn: {type: String as PropType<string | null>, default: null}
  },

  data() {
    return {igvfLogo, ucscLogo}
  }
})
</script>
