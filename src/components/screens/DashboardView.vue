<template>
  <MvLayout :require-auth="true">
    <template #header>
      <MvPageHeader max-width="1200px" title="My Dashboard">
        <template #subtitle>
          <p class="mb-5 text-sm text-text-muted">Manage your uploaded datasets, collections, and calibrations</p>
        </template>
      </MvPageHeader>
      <div class="border-b border-border bg-white px-4 tablet:px-6">
        <div class="mx-auto" style="max-width: 1200px">
          <!-- Mobile: dropdown tab switcher -->
          <div class="py-2.5 tablet:hidden">
            <PSelect
              class="w-full"
              :model-value="activeTab"
              option-label="label"
              option-value="value"
              :options="tabOptions"
              @update:model-value="activeTab = $event"
            />
          </div>

          <!-- Desktop: tab bar -->
          <div class="hidden tablet:flex">
            <Tabs v-model:value="activeTab">
              <TabList>
                <Tab value="score-sets">
                  Score Sets
                  <span
                    class="ml-1.5 rounded-[10px] px-[7px] py-px text-xs font-bold"
                    :class="activeTab === 'score-sets' ? 'bg-sage text-text-dark' : 'bg-chip text-sage'"
                  >
                    {{ tabCounts.scoreSets }}
                  </span>
                </Tab>
                <Tab value="experiments">
                  Experiments
                  <span
                    class="ml-1.5 rounded-[10px] px-[7px] py-px text-xs font-bold"
                    :class="activeTab === 'experiments' ? 'bg-sage text-text-dark' : 'bg-chip text-sage'"
                  >
                    {{ tabCounts.experiments }}
                  </span>
                </Tab>
                <Tab value="collections">
                  Collections
                  <span
                    class="ml-1.5 rounded-[10px] px-[7px] py-px text-xs font-bold"
                    :class="activeTab === 'collections' ? 'bg-sage text-text-dark' : 'bg-chip text-sage'"
                  >
                    {{ tabCounts.collections }}
                  </span>
                </Tab>
                <Tab value="calibrations">
                  Calibrations
                  <span
                    class="ml-1.5 rounded-[10px] px-[7px] py-px text-xs font-bold"
                    :class="activeTab === 'calibrations' ? 'bg-sage text-text-dark' : 'bg-chip text-sage'"
                  >
                    {{ tabCounts.calibrations }}
                  </span>
                </Tab>
              </TabList>
            </Tabs>
          </div>
        </div>
      </div>
    </template>

    <div class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8" style="max-width: 1200px">
      <MvDashboardScoreSets
        v-if="activeTab === 'score-sets'"
        v-model:score-set-filter="scoreSetFilter"
        v-model:score-set-search="scoreSetSearch"
        :cross-tab-filter="crossTabFilter"
        :error="error"
        :filtered-score-sets="filteredScoreSets"
        :has-data="hasScoreSets"
        :loading="loading"
        @clear-cross-tab-filter="setCrossTabFilter(null)"
        @delete-score-set="onDeleteScoreSet"
        @retry="fetchScoreSets"
      />

      <MvDashboardExperiments
        v-else-if="activeTab === 'experiments'"
        v-model:experiment-filter="experimentFilter"
        v-model:experiment-search="experimentSearch"
        :error="error"
        :filtered-experiments="filteredExperiments"
        :has-data="hasExperiments"
        :loading="loading"
        @delete-experiment="onDeleteExperiment"
        @retry="fetchExperiments"
        @view-score-sets="onViewScoreSets"
      />

      <MvDashboardCollections
        v-else-if="activeTab === 'collections'"
        v-model:collection-filter="collectionFilter"
        v-model:collection-search="collectionSearch"
        :error="error"
        :filtered-collections="filteredCollections"
        :has-data="hasCollections"
        :loading="loading"
        @create-collection="creatorVisible = true"
        @delete-collection="onDeleteCollection"
        @retry="fetchCollections"
      />

      <MvDashboardCalibrations
        v-else-if="activeTab === 'calibrations'"
        v-model:calibration-filter="calibrationFilter"
        v-model:calibration-search="calibrationSearch"
        :error="error"
        :filtered-calibrations="filteredCalibrations"
        :has-data="hasCalibrations"
        :loading="loading"
        @create-calibration="openCalibrationEditor()"
        @retry="fetchCalibrations"
      />
    </div>

    <PDialog v-model:visible="creatorVisible" header="New Collection" modal :style="{width: '600px'}">
      <CollectionCreator @collection-created="onCollectionCreated" />
    </PDialog>

    <PDialog
      v-model:visible="editorVisible"
      :close-on-escape="false"
      :header="editorDialogHeader"
      modal
      :style="{maxWidth: '90%', width: '75rem'}"
      @hide="closeCalibrationEditor"
    >
      <CalibrationEditor
        ref="calibrationEditorRef"
        :calibration-urn="editingCalibrationUrn"
        :score-set-urn="editingScoreSetUrn"
        :show-score-set-selector="true"
        @canceled="closeCalibrationEditor"
        @saved="onCalibrationSaved"
      />
      <template #footer>
        <PButton icon="pi pi-times" label="Close" severity="secondary" @click="closeCalibrationEditor" />
        <PButton icon="pi pi-save" label="Save Changes" severity="success" @click="saveChildCalibration" />
      </template>
    </PDialog>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import PButton from 'primevue/button'
import PDialog from 'primevue/dialog'
import Select from 'primevue/select'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import MvDashboardScoreSets from '@/components/dashboard/MvDashboardScoreSets.vue'
import MvDashboardExperiments from '@/components/dashboard/MvDashboardExperiments.vue'
import MvDashboardCollections from '@/components/dashboard/MvDashboardCollections.vue'
import MvDashboardCalibrations from '@/components/dashboard/MvDashboardCalibrations.vue'
import CollectionCreator from '@/components/CollectionCreator.vue'
import CalibrationEditor from '@/components/forms/CalibrationEditor.vue'
import {useDashboard} from '@/composables/use-dashboard'
import {useCalibrationDialog} from '@/composables/use-calibration-dialog'
import {deleteScoreSet} from '@/api/mavedb/score-sets'
import {deleteExperiment} from '@/api/mavedb/experiments'
import {deleteCollection} from '@/api/mavedb/collections'

export default defineComponent({
  name: 'DashboardView',

  components: {
    CalibrationEditor,
    CollectionCreator,
    PButton,
    PDialog,
    PSelect: Select,
    MvDashboardCalibrations,
    MvDashboardCollections,
    MvDashboardExperiments,
    MvDashboardScoreSets,
    MvLayout,
    MvPageHeader,
    Tab,
    TabList,
    Tabs
  },

  setup() {
    useHead({title: 'My dashboard'})

    // useDashboard: scoreSets, experiments, collections, calibrations, loading, error,
    //   *Filter, *Search, crossTabFilter, filtered*, has*, tabCounts, fetch*, setCrossTabFilter
    // useCalibrationDialog: editorVisible, editingCalibrationUrn, editingScoreSetUrn,
    //   editorDialogHeader, openCalibrationEditor, editCalibrationInEditor, closeCalibrationEditor
    const dashboard = useDashboard()
    const calibrationDialog = useCalibrationDialog()
    return {...dashboard, ...calibrationDialog}
  },

  data() {
    const validTabs = ['score-sets', 'experiments', 'collections', 'calibrations']
    const tab = this.$route.query.tab as string
    const filterParam = this.$route.query.filter as string
    const initialFilter = filterParam ? filterParam.split(',') : undefined
    const experimentParam = this.$route.query.experiment as string | undefined
    return {
      activeTab: validTabs.includes(tab) ? tab : 'score-sets',
      creatorVisible: false,
      validTabs,
      initialFilter,
      initialExperiment: experimentParam
    }
  },

  computed: {
    activeFilter: {
      get(): string[] {
        switch (this.activeTab) {
          case 'score-sets':
            return this.scoreSetFilter
          case 'experiments':
            return this.experimentFilter
          case 'collections':
            return this.collectionFilter
          case 'calibrations':
            return this.calibrationFilter
          default:
            return ['all']
        }
      },
      set(value: string[]) {
        switch (this.activeTab) {
          case 'score-sets':
            this.scoreSetFilter = value
            break
          case 'experiments':
            this.experimentFilter = value
            break
          case 'collections':
            this.collectionFilter = value
            break
          case 'calibrations':
            this.calibrationFilter = value
            break
        }
      }
    },
    tabOptions(): {label: string; value: string}[] {
      return [
        {label: `Score Sets (${this.tabCounts.scoreSets})`, value: 'score-sets'},
        {label: `Experiments (${this.tabCounts.experiments})`, value: 'experiments'},
        {label: `Collections (${this.tabCounts.collections})`, value: 'collections'},
        {label: `Calibrations (${this.tabCounts.calibrations})`, value: 'calibrations'}
      ]
    }
  },

  watch: {
    activeTab() {
      this.syncQuery()
    },
    scoreSetFilter() {
      if (this.activeTab === 'score-sets') this.syncQuery()
    },
    experimentFilter() {
      if (this.activeTab === 'experiments') this.syncQuery()
    },
    collectionFilter() {
      if (this.activeTab === 'collections') this.syncQuery()
    },
    calibrationFilter() {
      if (this.activeTab === 'calibrations') this.syncQuery()
    },
    crossTabFilter() {
      this.syncQuery()
    }
  },

  async mounted() {
    if (this.initialFilter) {
      this.activeFilter = this.initialFilter
    }
    await this.fetchAll()
    if (this.initialExperiment) {
      const exp = this.experiments.find((e) => e.urn === this.initialExperiment)
      if (exp) {
        this.setCrossTabFilter({
          type: 'experiment',
          experimentUrn: exp.urn,
          experimentTitle: exp.title
        })
      }
    }
  },

  methods: {
    syncQuery() {
      const query: Record<string, string> = {}
      if (this.activeTab !== 'score-sets') query.tab = this.activeTab
      if (!this.activeFilter.includes('all')) query.filter = this.activeFilter.join(',')
      if (this.crossTabFilter?.type === 'experiment') {
        query.experiment = this.crossTabFilter.experimentUrn
      }
      this.$router.replace({query})
    },
    onViewScoreSets(payload: {experimentUrn: string; experimentTitle: string}) {
      this.setCrossTabFilter({
        type: 'experiment',
        experimentUrn: payload.experimentUrn,
        experimentTitle: payload.experimentTitle
      })
      this.activeTab = 'score-sets'
    },
    onCollectionCreated() {
      this.creatorVisible = false
      this.fetchCollections()
    },
    async onDeleteScoreSet(urn: string) {
      try {
        await deleteScoreSet(urn)
        this.$toast.add({severity: 'success', summary: 'Score set deleted', life: 3000})
        this.fetchScoreSets()
      } catch {
        this.$toast.add({severity: 'error', summary: 'Failed to delete score set', life: 5000})
      }
    },
    async onDeleteExperiment(urn: string) {
      try {
        await deleteExperiment(urn)
        this.$toast.add({severity: 'success', summary: 'Experiment deleted', life: 3000})
        this.fetchExperiments()
      } catch {
        this.$toast.add({severity: 'error', summary: 'Failed to delete experiment', life: 5000})
      }
    },
    async onDeleteCollection(urn: string) {
      try {
        await deleteCollection(urn)
        this.$toast.add({severity: 'success', summary: 'Collection deleted', life: 3000})
        this.fetchCollections()
      } catch {
        this.$toast.add({severity: 'error', summary: 'Failed to delete collection', life: 5000})
      }
    },
    async saveChildCalibration() {
      const editor = this.$refs.calibrationEditorRef as InstanceType<typeof CalibrationEditor> | undefined
      if (!editor) return

      let result
      try {
        result = await editor.saveCalibration()
      } catch (err) {
        console.error('Error saving calibration:', err)
        this.$toast.add({
          severity: 'error',
          summary: 'Calibration Not Saved',
          detail: 'An unexpected error occurred while saving the calibration. Please try again later.',
          life: 4000
        })
        return
      }

      // Save succeeded — handled via @saved event / onCalibrationSaved.
      // Only error cases reach here.
      if (!result || result.success) return

      if (result.error === 'email_required') {
        this.$toast.add({
          severity: 'error',
          summary: 'Email Required',
          detail:
            'You must add an email address to your account to create or edit calibrations. Please update your email in Settings.',
          life: 6000
        })
      } else if (result.error === 'validation') {
        const count = Object.keys(result.validationErrors).length
        this.$toast.add({
          severity: 'error',
          summary: `Please fix ${count} validation ${count === 1 ? 'error' : 'errors'} before saving.`,
          life: 5000
        })
      } else if (result.error === 'generic') {
        this.$toast.add({
          severity: 'error',
          summary: `Encountered an error saving calibration: ${result.message}`,
          life: 4000
        })
      } else if (result.error === 'unknown') {
        console.error('Error saving calibration:', result.raw)
        this.$toast.add({
          severity: 'error',
          summary: 'Calibration Not Saved',
          detail: 'An error occurred while saving the calibration. Please try again later.',
          life: 4000
        })
      }
    },
    // TODO: Consolidate the dual save path (imperative saveChildCalibration + @saved event)
    // into a single flow. This pattern is shared with ScoreSetView and ScoreSetCalibrationsView.
    async onCalibrationSaved() {
      this.$toast.add({
        severity: 'success',
        summary: 'Calibration Saved',
        detail: 'Calibration saved successfully.',
        life: 4000
      })
      this.closeCalibrationEditor()
      await this.fetchCalibrations()
    }
  }
})
</script>
