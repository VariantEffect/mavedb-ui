<template>
  <MvLayout>
    <template v-if="itemStatus === 'Loaded' && item" #header>
      <MvPageHeader eyebrow="Experiment" max-width="1000px" :title="item.title || 'Untitled experiment'">
        <template #subtitle>
          <div class="-mt-2 text-sm text-text-muted">{{ item.urn }}</div>
          <div v-if="item.shortDescription" class="mt-2 text-sm leading-snug text-text-secondary">
            {{ item.shortDescription }}
          </div>
        </template>
        <template #actions>
          <div class="hidden items-center gap-1 tablet:flex">
            <PButton
              v-if="permissions.add_score_set"
              icon="pi pi-plus"
              label="Add Score Set"
              size="small"
              @click="addScoreSet"
            />
            <PButton v-if="permissions.update" label="Edit" severity="warn" size="small" @click="editItem" />
            <PButton v-if="permissions.delete" label="Delete" severity="danger" size="small" @click="deleteItem" />
          </div>
          <MvRowActionMenu :actions="headerActions" class="tablet:hidden" />
        </template>
        <template #metadata>
          <MvMetadataLine
            class="mt-3"
            :created-by="item.createdBy"
            :creation-date="item.creationDate"
            jump-to-id="detailed-metadata"
            :modification-date="item.modificationDate"
            :modified-by="item.modifiedBy"
            :published-date="item.publishedDate"
          />
        </template>
      </MvPageHeader>
    </template>

    <!-- Loading -->
    <MvPageLoading v-if="itemStatus === 'Loading' || itemStatus === 'NotLoaded'" text="Loading experiment..." />

    <!-- Not found -->
    <MvItemNotFound v-else-if="itemStatus === 'Failed'" :item-id="itemId" model="experiment" />

    <!-- Loaded -->
    <template v-else-if="itemStatus === 'Loaded' && item">
      <MvCollectionStrip
        data-set-type="experiment"
        :data-set-urn="item.urn"
        :official-collections="item.officialCollections"
      />

      <div class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8" style="max-width: 1000px">
        <!-- Score Sets -->
        <MvLoader v-if="scoreSetsLoading" text="Loading score sets..." />
        <div
          v-else-if="associatedScoreSets.length > 0"
          class="overflow-hidden rounded-lg border border-border bg-white"
        >
          <div class="border-b border-border-light px-5 py-3.5">
            <span class="text-sm font-bold text-text-dark">Score Sets ({{ associatedScoreSets.length }})</span>
          </div>
          <div v-for="ss in associatedScoreSets" :key="ss.urn" class="border-b border-border-light last:border-b-0">
            <MvScoreSetRow :score-set="ss" show-collections />
          </div>
        </div>
        <MvEmptyState
          v-else
          :action-label="permissions.add_score_set ? 'Add a score set' : undefined"
          description="No score sets have been added to this experiment yet."
          title="No score sets"
          @action="addScoreSet"
        />

        <!-- Details and Metadata -->
        <h2 id="detailed-metadata" class="mb-4 mt-8 text-base font-bold text-text-dark">Details and Metadata</h2>

        <MvProvenanceCard
          :contributors="contributors"
          :external-links="item.externalLinks"
          parent-label="Parent experiment set"
          :parent-urn="item.experimentSetUrn"
        />

        <!-- Keywords -->
        <div class="mave-gradient-bar relative mt-4 overflow-hidden rounded-lg border border-border bg-white p-5">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wider text-text-dark">Keywords</h3>
          <template v-if="item.keywords && item.keywords.length > 0">
            <div v-for="(kw, i) in item.keywords" :key="i" class="border-b border-border-light py-2.5 last:border-b-0">
              <div class="flex items-center gap-1.5 text-sm">
                <span
                  v-if="kw.keyword.description"
                  v-tooltip.top="kw.keyword.description"
                  class="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full bg-sage text-[10px] font-bold text-white"
                  >?</span
                >
                <span class="font-bold text-text-primary">{{ kw.keyword.key }}</span>
                <span class="text-text-muted">:</span>
                <router-link
                  class="font-medium text-link"
                  :to="{name: 'search', query: {keywords: kw.keyword.label}}"
                  >{{ kw.keyword.label }}</router-link
                >
              </div>
              <div
                v-if="kw.description"
                class="mt-1 text-sm leading-relaxed text-text-secondary"
                style="margin-left: 22px"
              >
                {{ kw.description }}
              </div>
            </div>
          </template>
          <p v-else class="pl-4 text-sm italic text-text-muted">No keywords were provided.</p>
        </div>

        <!-- Metadata card (abstract, method, publications) -->
        <div class="mave-gradient-bar relative mt-4 overflow-hidden rounded-lg border border-border bg-white p-6">
          <div class="border-b border-border-light pb-4">
            <h3 class="mb-3 text-[15px] font-bold text-text-dark">Abstract</h3>
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="item.abstractText"
              class="pl-4 text-sm leading-relaxed text-text-secondary"
              v-html="markdownToHtml(item.abstractText)"
            />
            <!-- eslint-enable vue/no-v-html -->
            <p v-else class="pl-4 text-sm italic text-text-muted">Not provided.</p>
          </div>
          <div class="border-b border-border-light py-4">
            <h3 class="mb-3 text-[15px] font-bold text-text-dark">Method</h3>
            <!-- eslint-disable vue/no-v-html -->
            <div
              v-if="item.methodText"
              class="pl-4 text-sm leading-relaxed text-text-secondary"
              v-html="markdownToHtml(item.methodText)"
            />
            <!-- eslint-enable vue/no-v-html -->
            <p v-else class="pl-4 text-sm italic text-text-muted">Not provided.</p>
          </div>
          <div class="border-b border-border-light py-4">
            <MvPublicationsSection :publications="item.primaryPublicationIdentifiers" title="Primary References" />
          </div>
          <div class="py-4">
            <MvPublicationsSection :publications="item.secondaryPublicationIdentifiers" title="Secondary References" />
          </div>
        </div>

        <!-- Targets -->
        <div class="mt-4">
          <MvTargetsAccordion :score-sets="associatedScoreSets" />
        </div>

        <!-- External Identifiers -->
        <div class="mt-4">
          <MvExternalIdentifiersCard
            :doi-identifiers="item.doiIdentifiers"
            :raw-read-identifiers="item.rawReadIdentifiers"
          />
        </div>
      </div>
    </template>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent, toRef} from 'vue'
import {marked} from 'marked'
import PButton from 'primevue/button'
import {useHead} from '@unhead/vue'

import {deleteExperiment, getExperimentScoreSets} from '@/api/mavedb'
import MvScoreSetRow from '@/components/common/MvScoreSetRow.vue'
import MvCollectionStrip from '@/components/common/MvCollectionStrip.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvExternalIdentifiersCard from '@/components/common/MvExternalIdentifiersCard.vue'
import MvMetadataLine from '@/components/common/MvMetadataLine.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvProvenanceCard from '@/components/common/MvProvenanceCard.vue'
import MvPublicationsSection from '@/components/common/MvPublicationsSection.vue'
import MvRowActionMenu from '@/components/common/MvRowActionMenu.vue'
import MvTargetsAccordion from '@/components/common/MvTargetsAccordion.vue'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import useItem from '@/composition/item.ts'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'
import {components} from '@/schema/openapi'
import type {RowAction} from '@/components/common/MvRowActionMenu.vue'
import MvLoader from '@/components/common/MvLoader.vue'

type ScoreSet = components['schemas']['ScoreSet']
type Experiment = components['schemas']['Experiment']
type Contributor = components['schemas']['Contributor']
const ACTIONS = ['add_score_set', 'update', 'delete'] as const

export default defineComponent({
  name: 'ExperimentView',

  components: {
    MvItemNotFound,
    MvCollectionStrip,
    MvEmptyState,
    MvExternalIdentifiersCard,
    MvLayout,
    MvMetadataLine,
    MvPageHeader,
    MvScoreSetRow,
    MvLoader,
    MvPageLoading,
    MvProvenanceCard,
    MvPublicationsSection,
    MvRowActionMenu,
    MvTargetsAccordion,
    PButton
  },

  props: {
    itemId: {type: String, required: true}
  },

  setup(props) {
    const head = useHead()
    const urnRef = toRef(props, 'itemId')
    const {permissions} = useDatasetPermissions('experiment', urnRef, ACTIONS)

    return {
      head,
      ...useItem<Experiment>({itemTypeName: 'experiment'}),
      permissions
    }
  },

  data() {
    return {
      associatedScoreSets: [] as ScoreSet[],
      scoreSetsLoading: true
    }
  },

  computed: {
    contributors(): Contributor[] {
      const creatorId = this.item?.createdBy?.orcidId
      return (this.item?.contributors || [])
        .filter((c) => c.orcidId !== creatorId)
        .sort((a, b) => (a.familyName ?? '').localeCompare(b.familyName ?? ''))
    },
    headerActions(): RowAction[] {
      const actions: RowAction[] = []
      if (this.permissions.add_score_set) {
        actions.push({label: 'Add Score Set', handler: () => this.addScoreSet()})
      }
      if (this.permissions.update) {
        actions.push({label: 'Edit', handler: () => this.editItem()})
      }
      if (this.permissions.delete) {
        actions.push({label: 'Delete', danger: true, handler: () => this.deleteItem()})
      }
      return actions
    }
  },

  watch: {
    item(newValue: Experiment | null) {
      this.head?.patch({title: newValue?.title ?? 'Untitled experiment'})
    },
    itemId: {
      handler(newValue: string, oldValue: string) {
        if (newValue !== oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  created() {
    this.fetchAssociatedScoreSets()
  },

  methods: {
    addScoreSet() {
      if (!this.item) return
      this.$router.push({name: 'createScoreSetInExperiment', params: {urn: this.item.urn}})
    },
    editItem() {
      if (this.item) {
        this.$router.replace({path: `/experiments/${this.item.urn}/edit`})
      }
    },
    async deleteItem() {
      // @ts-expect-error PrimeVue ConfirmationService plugin
      this.$confirm.require({
        message: 'Are you sure you want to proceed?',
        header: 'Confirmation',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          if (!this.item) return
          try {
            await deleteExperiment(this.item.urn)
            this.$toast.add({severity: 'success', summary: 'Your experiment was successfully deleted.', life: 3000})
            this.$router.replace({path: '/dashboard'})
          } catch {
            this.$toast.add({severity: 'error', summary: 'Failed to delete experiment.', life: 5000})
          }
        }
      })
    },
    async fetchAssociatedScoreSets() {
      this.scoreSetsLoading = true
      try {
        this.associatedScoreSets = await getExperimentScoreSets(this.itemId)
      } catch {
        this.associatedScoreSets = []
      } finally {
        this.scoreSetsLoading = false
      }
    },
    markdownToHtml(markdown: string): string {
      return marked(markdown) as string
    }
  }
})
</script>
