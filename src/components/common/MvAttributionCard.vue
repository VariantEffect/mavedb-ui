<template>
  <div class="mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-white p-5">
    <h3 v-if="title" class="mave-section-title">{{ title }}</h3>
    <div class="flex flex-col">
      <MvDetailRow v-if="creationDate" label="Created">
        <span class="inline-flex flex-wrap items-center gap-1">
          <span>{{ formatDate(creationDate) }}</span>
          <template v-if="createdBy">
            <span class="text-text-muted">by</span>
            <MvOrcidLink
              :first-name="createdBy.firstName"
              :last-name="createdBy.lastName"
              :orcid-id="createdBy.orcidId"
              size="sm"
            />
          </template>
        </span>
      </MvDetailRow>
      <MvDetailRow v-if="modificationDate" label="Updated">
        <span class="inline-flex flex-wrap items-center gap-1">
          <span>{{ formatDate(modificationDate) }}</span>
          <template v-if="modifiedBy">
            <span class="text-text-muted">by</span>
            <MvOrcidLink
              :first-name="modifiedBy.firstName"
              :last-name="modifiedBy.lastName"
              :orcid-id="modifiedBy.orcidId"
              size="sm"
            />
          </template>
        </span>
      </MvDetailRow>
      <MvDetailRow v-if="publishedDate" label="Published">
        {{ formatDate(publishedDate) }}
      </MvDetailRow>
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
        <MvEntityLink entity-type="scoreSet" :urn="supersedingUrn" :use-cache="true" />
      </MvDetailRow>
      <MvDetailRow v-else-if="supersededUrn || !supersedingUrn" label="Version" value="Current version" />
      <MvDetailRow v-if="supersededUrn" label="Supersedes">
        <MvEntityLink entity-type="scoreSet" :urn="supersededUrn" :use-cache="true" />
      </MvDetailRow>
      <MvDetailRow v-if="metaAnalyzesUrns && metaAnalyzesUrns.length > 0" label="Meta-analysis for">
        <div class="flex flex-col gap-1">
          <MvEntityLink
            v-for="urn in displayedMetaAnalyzesUrns"
            :key="urn"
            entity-type="scoreSet"
            :urn="urn"
            :use-cache="true"
          />
          <button
            v-if="hasCollapsedMetaAnalyzesUrns"
            class="mt-1 w-fit text-left text-sm text-link hover:underline flex items-center gap-1"
            type="button"
            @click="metaAnalyzesExpanded = !metaAnalyzesExpanded"
          >
            <FontAwesomeIcon
              aria-hidden="true"
              class="transition-transform duration-200 w-4 h-4"
              :icon="'fa-solid fa-chevron-down'"
              :style="{transform: metaAnalyzesExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}"
            />
            <span>
              {{
                metaAnalyzesExpanded
                  ? 'Show fewer'
                  : `Show ${metaAnalyzesUrns.length - META_ANALYZES_VISIBLE_COUNT} more`
              }}
            </span>
          </button>
        </div>
      </MvDetailRow>
      <MvDetailRow v-if="parentUrn" :label="parentLabel">
        <MvEntityLink :entity-type="parentRouteName" :urn="parentUrn" :use-cache="true" />
      </MvDetailRow>
      <MvDetailRow v-if="externalLinks && externalLinks.igvf && externalLinks.igvf.url" label="External data">
        <a
          class="inline-flex items-center gap-1.5 text-link no-underline"
          :href="externalLinks.igvf.url"
          rel="noopener noreferrer"
          target="_blank"
        >
          <img alt="IGVF" class="h-4" :src="igvfLogo" />
          View in IGVF Portal
        </a>
      </MvDetailRow>
      <MvDetailRow v-if="externalLinks && externalLinks.ucsc && externalLinks.ucsc.url" label="Genome browser">
        <a
          class="inline-flex items-center gap-1.5 text-link no-underline"
          :href="externalLinks.ucsc.url"
          rel="noopener noreferrer"
          target="_blank"
        >
          <img alt="UCSC" class="h-4" :src="ucscLogo" />
          View in UCSC Browser
        </a>
      </MvDetailRow>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import igvfLogo from '@/assets/igvf-tag.png'
import ucscLogo from '@/assets/logo-ucsc-genome-browser.png'
import MvDetailRow from '@/components/common/MvDetailRow.vue'
import MvEntityLink from '@/components/common/MvEntityLink.vue'
import MvOrcidLink from '@/components/common/MvOrcidLink.vue'
import {components} from '@/schema/openapi'
import {formatDate} from '@/lib/formats'

type Contributor = components['schemas']['Contributor']
type License = components['schemas']['ShortLicense']
type User = components['schemas']['User']
type ExternalLinks = Record<string, components['schemas']['ExternalLink'] | undefined>
const META_ANALYZES_VISIBLE_COUNT = 3

export default defineComponent({
  name: 'MvAttributionCard',
  components: {FontAwesomeIcon, MvDetailRow, MvEntityLink, MvOrcidLink},

  props: {
    title: {type: String as PropType<string | null>, default: null},
    createdBy: {type: Object as PropType<User | null>, default: null},
    creationDate: {type: String as PropType<string | null>, default: null},
    modificationDate: {type: String as PropType<string | null>, default: null},
    modifiedBy: {type: Object as PropType<User | null>, default: null},
    publishedDate: {type: String as PropType<string | null>, default: null},
    contributors: {type: Array as PropType<Contributor[]>, default: () => []},
    dataUsagePolicy: {type: String as PropType<string | null>, default: null},
    externalLinks: {type: Object as PropType<ExternalLinks | null>, default: null},
    license: {type: Object as PropType<License | null>, default: null},
    parentLabel: {type: String, default: 'Parent'},
    parentRouteName: {type: String, default: 'experimentSet'},
    parentUrn: {type: String as PropType<string | null>, default: null},
    metaAnalyzesUrns: {type: Array as PropType<string[]>, default: () => []},
    supersededUrn: {type: String as PropType<string | null>, default: null},
    supersedingUrn: {type: String as PropType<string | null>, default: null}
  },

  data() {
    return {
      igvfLogo,
      ucscLogo,
      metaAnalyzesExpanded: false,
      META_ANALYZES_VISIBLE_COUNT
    }
  },

  computed: {
    displayedMetaAnalyzesUrns() {
      if (this.metaAnalyzesExpanded || this.metaAnalyzesUrns.length <= this.META_ANALYZES_VISIBLE_COUNT) {
        return this.metaAnalyzesUrns
      }

      return this.metaAnalyzesUrns.slice(0, this.META_ANALYZES_VISIBLE_COUNT)
    },

    hasCollapsedMetaAnalyzesUrns() {
      return this.metaAnalyzesUrns.length > this.META_ANALYZES_VISIBLE_COUNT
    }
  },

  methods: {
    formatDate
  }
})
</script>
