<template>
  <MvLayout>
    <template v-if="itemStatus === 'Loaded' && item" #header>
      <MvPageHeader
        :eyebrow="`${item.dbName} · ${item.identifier}`"
        max-width="850px"
        :title="item.title || 'Untitled publication'"
      >
        <template #subtitle>
          <div class="-mt-2 flex flex-wrap items-center gap-x-3 text-sm text-text-secondary">
            <span v-if="item.publicationJournal">
              {{ item.publicationYear }} · <span class="italic">{{ item.publicationJournal }}</span>
            </span>
            <a
              v-if="item.url"
              class="inline-flex items-center gap-1 text-link no-underline"
              :href="item.url"
              rel="noopener noreferrer"
              target="_blank"
            >
              <i class="pi pi-external-link text-[10px]" />
              View article on the web
            </a>
          </div>
        </template>
      </MvPageHeader>
    </template>

    <!-- Loading -->
    <MvPageLoading v-if="itemStatus === 'Loading' || itemStatus === 'NotLoaded'" />

    <!-- Not found -->
    <MvItemNotFound v-else-if="itemStatus === 'Failed'" :item-id="itemId" model="publication" />

    <!-- Loaded -->
    <div
      v-else-if="itemStatus === 'Loaded' && item"
      class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8"
      style="max-width: 850px"
    >
      <!-- Reference -->
      <div v-if="item.referenceHtml" class="mb-6 rounded-lg border border-border bg-white p-5">
        <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-dark">Citation</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="text-sm leading-relaxed text-text-secondary" v-html="item.referenceHtml"></div>
      </div>

      <!-- Abstract -->
      <div
        v-if="item.abstract"
        class="mave-gradient-bar relative mb-6 overflow-hidden rounded-lg border border-border bg-white p-6"
      >
        <h3 class="mb-3 text-[15px] font-bold text-text-dark">Abstract</h3>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="pl-4 text-sm leading-relaxed text-text-secondary" v-html="markdownToHtml(item.abstract)"></div>
      </div>

      <!-- Linked score sets -->
      <div class="overflow-hidden rounded-lg border border-border bg-white">
        <div class="border-b border-border-light px-5 py-3.5">
          <span class="text-sm font-bold text-text-dark">Linked Score Sets</span>
        </div>
        <MvLoader v-if="linkedScoreSetsLoading" text="Loading linked score sets..." />
        <template v-else-if="linkedScoreSets.length > 0">
          <div v-for="ss in linkedScoreSets" :key="ss.urn" class="border-b border-border-light last:border-b-0">
            <MvScoreSetRow :score-set="ss" />
          </div>
        </template>
        <div v-else class="px-5 py-6 text-center text-sm italic text-text-muted">
          No published score sets are linked to this publication.
        </div>
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {marked} from 'marked'
import {useHead} from '@unhead/vue'

import {searchScoreSetsByPublication} from '@/api/mavedb'
import type {components} from '@/schema/openapi'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvScoreSetRow from '@/components/common/MvScoreSetRow.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import useItem from '@/composition/item.ts'
import MvLoader from '@/components/common/MvLoader.vue'

type ShortScoreSet = components['schemas']['ShortScoreSet']
type PublicationIdentifier = components['schemas']['PublicationIdentifier']

export default defineComponent({
  name: 'PublicationIdentifierView',

  components: {MvItemNotFound, MvLayout, MvPageHeader, MvScoreSetRow, MvPageLoading, MvLoader},

  props: {
    itemId: {type: String, required: true},
    name: {type: String, required: true},
    dbId: {type: String, required: true}
  },

  setup(props) {
    useHead({title: 'Publication details'})
    return {
      ...useItem<PublicationIdentifier>({itemTypeName: props.name})
    }
  },

  data() {
    return {
      linkedScoreSets: [] as ShortScoreSet[],
      linkedScoreSetsLoading: true
    }
  },

  watch: {
    itemId: {
      handler(newValue: string, oldValue: string) {
        if (newValue !== oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    },
    item(newValue: Record<string, unknown> | null) {
      if (newValue) this.fetchLinkedScoreSets()
    }
  },

  methods: {
    markdownToHtml(markdown: string): string {
      return marked(markdown) as string
    },
    async fetchLinkedScoreSets() {
      this.linkedScoreSetsLoading = true
      try {
        const results = await searchScoreSetsByPublication(this.itemId, this.dbId)
        this.linkedScoreSets = results.filter((ss: ShortScoreSet) => ss.publishedDate != null)
      } catch {
        this.linkedScoreSets = []
      } finally {
        this.linkedScoreSetsLoading = false
      }
    }
  }
})
</script>
