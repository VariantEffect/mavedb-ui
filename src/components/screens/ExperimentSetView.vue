<template>
  <MvLayout>
    <template v-if="itemStatus === 'Loaded' && item" #header>
      <MvPageHeader eyebrow="Experiment Set" max-width="900px" :title="item.urn">
        <template v-if="permissions.add_experiment" #actions>
          <PButton icon="pi pi-plus" label="Add experiment" size="small" @click="addExperiment" />
        </template>
        <template #metadata>
          <MvMetadataLine
            :created-by="item.createdBy"
            :creation-date="item.creationDate"
            :modification-date="item.modificationDate"
            :modified-by="item.modifiedBy"
            :published-date="item.publishedDate"
          />
        </template>
      </MvPageHeader>
    </template>

    <!-- Loading -->
    <MvPageLoading v-if="itemStatus === 'Loading' || itemStatus === 'NotLoaded'" text="Loading experiment set..." />

    <!-- Not found -->
    <MvItemNotFound v-else-if="itemStatus === 'Failed'" :item-id="itemId" model="experiment set" />

    <!-- Loaded -->
    <div
      v-else-if="itemStatus === 'Loaded' && item"
      class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8"
      style="max-width: 900px"
    >
      <!-- Experiments list -->
      <div
        v-if="item.experiments && item.experiments.length > 0"
        class="mt-6 overflow-hidden rounded-lg border border-border bg-white"
      >
        <div class="border-b border-border-light px-5 py-3.5">
          <span class="text-sm font-bold text-text-dark">Experiments ({{ item.experiments.length }})</span>
        </div>
        <div v-for="ex in item.experiments" :key="ex.urn" class="border-b border-border-light last:border-b-0">
          <MvExperimentRow :experiment="ex" />
        </div>
      </div>

      <MvEmptyState
        v-else
        description="No experiments have been added to this experiment set yet."
        title="No experiments"
      />
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent, toRef} from 'vue'
import PButton from 'primevue/button'
import {useHead} from '@unhead/vue'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import MvExperimentRow from '@/components/common/MvExperimentRow.vue'
import MvMetadataLine from '@/components/common/MvMetadataLine.vue'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import useItem from '@/composition/item.ts'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'
import {components} from '@/schema/openapi'

type ExperimentSet = components['schemas']['ExperimentSet']
const ACTIONS = ['add_experiment'] as const

export default defineComponent({
  name: 'ExperimentSetView',

  components: {
    PButton,
    MvLayout,
    MvPageHeader,
    MvEmptyState,
    MvExperimentRow,
    MvMetadataLine,
    MvPageLoading,
    MvItemNotFound
  },

  props: {
    itemId: {type: String, required: true}
  },

  setup(props) {
    useHead({title: 'Experiment set'})
    const urnRef = toRef(props, 'itemId')
    const {permissions} = useDatasetPermissions('experiment-set', urnRef, ACTIONS)

    return {
      ...useItem<ExperimentSet>({itemTypeName: 'experimentSet'}),
      permissions
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
    }
  },

  methods: {
    addExperiment() {
      this.$router.push({name: 'createExperimentInExperimentSet', params: {urn: this.item?.urn}})
    }
  }
})
</script>
