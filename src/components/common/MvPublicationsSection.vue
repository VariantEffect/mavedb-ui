<template>
  <div>
    <h3 class="mb-3 text-[15px] font-bold text-text-dark">{{ title }}</h3>
    <div v-if="publications && publications.length > 0">
      <div v-for="(pub, i) in publications" :key="i" class="mb-4 pl-4 text-sm last:mb-0">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="leading-relaxed text-text-secondary" v-html="pub.referenceHtml"></div>
        <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <a class="text-link" :href="`${appBaseUrl}/publication-identifiers/${pub.dbName}/${encodeURIComponent(pub.identifier)}`">{{
            pub.identifier
          }}</a>
          <template v-if="pub.url">
            <span class="text-border">&middot;</span>
            <a class="text-link" :href="pub.url" rel="noopener noreferrer" target="_blank">View article on the web</a>
          </template>
        </div>
      </div>
    </div>
    <p v-else class="pl-4 text-sm italic text-text-muted">No associated {{ title.toLowerCase() }}.</p>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import config from '@/config'
import {components} from '@/schema/openapi'

type PublicationIdentifier = components['schemas']['PublicationIdentifier']

export default defineComponent({
  name: 'MvPublicationsSection',

  props: {
    publications: {type: Array as PropType<PublicationIdentifier[]>, default: () => []},
    title: {type: String, required: true}
  },

  computed: {
    appBaseUrl(): string {
      return config.appBaseUrl
    }
  }
})
</script>
