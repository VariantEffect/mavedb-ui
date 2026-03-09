<template>
  <div>
    <MvCollapsible title="Gene">
      <MvSelectList
        :loading="loading"
        :model-value="targetNames"
        :options="targetNameOptions"
        title="Search genes..."
        @update:model-value="$emit('update:targetNames', $event)"
      />
    </MvCollapsible>
    <MvCollapsible title="Organism">
      <MvSelectList
        :loading="loading"
        :model-value="targetOrganismNames"
        option-class="italic"
        :options="targetOrganismNameOptions"
        title="Search organisms..."
        @update:model-value="$emit('update:targetOrganismNames', $event)"
      />
    </MvCollapsible>
    <MvCollapsible :open="false" title="Target type">
      <MvSelectList
        :loading="loading"
        :model-value="targetTypes"
        :option-label="targetTypeLabelFn"
        :options="targetTypeOptions"
        title="Search target types..."
        @update:model-value="$emit('update:targetTypes', $event)"
      />
    </MvCollapsible>
    <MvCollapsible :open="false" title="Target accession">
      <MvSelectList
        :loading="loading"
        :model-value="targetAccession"
        :options="targetAccessionOptions"
        title="e.g. P38398, NM_007294..."
        @update:model-value="$emit('update:targetAccession', $event)"
      />
    </MvCollapsible>
    <MvCollapsible :open="false" title="Author">
      <MvSelectList
        :loading="loading"
        :model-value="publicationAuthors"
        :options="publicationAuthorOptions"
        title="Search authors..."
        @update:model-value="$emit('update:publicationAuthors', $event)"
      />
    </MvCollapsible>
    <MvCollapsible :open="false" title="Journal">
      <MvSelectList
        :loading="loading"
        :model-value="publicationJournals"
        :options="publicationJournalOptions"
        title="Search journals..."
        @update:model-value="$emit('update:publicationJournals', $event)"
      />
    </MvCollapsible>
    <MvCollapsible :open="false" title="Publication database">
      <MvSelectList
        :loading="loading"
        :model-value="publicationDatabases"
        :options="publicationDatabaseOptions"
        title="Search publication databases..."
        @update:model-value="$emit('update:publicationDatabases', $event)"
      />
    </MvCollapsible>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import MvCollapsible from '@/components/common/MvCollapsible.vue'
import MvSelectList from '@/components/common/MvSelectList.vue'

interface FilterOption {
  value: string
  badge?: number
}

export default defineComponent({
  name: 'MvSearchFilters',

  components: {MvCollapsible, MvSelectList},

  props: {
    targetNames: {type: Array as PropType<string[]>, default: () => []},
    targetOrganismNames: {type: Array as PropType<string[]>, default: () => []},
    targetTypes: {type: Array as PropType<string[]>, default: () => []},
    targetAccession: {type: Array as PropType<string[]>, default: () => []},
    publicationAuthors: {type: Array as PropType<string[]>, default: () => []},
    publicationJournals: {type: Array as PropType<string[]>, default: () => []},
    publicationDatabases: {type: Array as PropType<string[]>, default: () => []},
    targetNameOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    targetOrganismNameOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    targetTypeOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    targetAccessionOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    publicationAuthorOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    publicationJournalOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    publicationDatabaseOptions: {type: Array as PropType<FilterOption[]>, default: () => []},
    targetTypeLabelFn: {type: Function as PropType<(v: string) => string>, default: null},
    loading: {type: Boolean, default: false}
  },

  emits: [
    'update:targetNames',
    'update:targetOrganismNames',
    'update:targetTypes',
    'update:targetAccession',
    'update:publicationAuthors',
    'update:publicationJournals',
    'update:publicationDatabases'
  ]
})
</script>
