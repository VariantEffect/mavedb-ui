<template>
  <div>
    <DataTable
      v-if="items.length > 0"
      data-key="urn"
      :reorderable-rows="canUpdate"
      :value="items"
      @row-reorder="$emit('reorder', $event)"
    >
      <Column v-if="canUpdate" row-reorder style="width: 2.25rem" />
      <Column field="urn">
        <template #body="{data}">
          <MvEntityLink display="title" :entity-type="entityType" :urn="data.urn" use-cache />
        </template>
      </Column>
      <Column v-if="canUpdate" style="width: 4rem">
        <template #body="{data}">
          <PButton
            aria-label="Remove item"
            icon="pi pi-trash"
            rounded
            severity="danger"
            size="small"
            text
            @click="$emit('remove', data.urn)"
          />
        </template>
      </Column>
    </DataTable>
    <div v-else>
      <MvEmptyState
        v-if="permissions[entityTypeLabel === 'score set' ? 'add_score_set' : 'add_experiment']"
        :action-label="`Add ${entityTypeLabel}s`"
        :description="`This collection doesn't have any ${entityTypeLabel}s yet.`"
        :title="`No ${entityTypeLabel}s yet`"
        @action="$emit('add')"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, toRef} from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import {DATA_SET_TYPE_LABELS} from '@/lib/collections'
import MvEntityLink from '@/components/common/MvEntityLink.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'

const ACTIONS = ['add_experiment', 'add_score_set'] as const


export default defineComponent({
  name: 'CollectionItemsTable',
  components: {
    PButton: Button,
    Column,
    DataTable,
    MvEntityLink,
    MvEmptyState
  },
  props: {
    items: {
      type: Array,
      required: true
    },
    itemId: {
      type: String,
      required: true
    },
    entityType: {
      type: String,
      required: true,
      validator: (value: string) => ['scoreSet', 'experiment'].includes(value)
    },
    canUpdate: {
      type: Boolean,
      default: false
    },
    canAdd: {
      type: Boolean,
      default: false
    }
  },
  emits: ['reorder', 'remove', 'add'],
  setup(props) {
    const urnRef = toRef(props, 'itemId')
    const {permissions} = useDatasetPermissions('collection', urnRef, ACTIONS)

    return {
      permissions
    }
  },
  
  computed: {
    entityTypeLabel() {
      return DATA_SET_TYPE_LABELS[this.entityType as keyof typeof DATA_SET_TYPE_LABELS] ?? this.entityType
    }
  }
})
</script>

<style scoped>
:deep(.p-datatable-thead) {
  display: none;
}

:deep(.p-datatable-reorderable-row-handle) {
  font-size: 0.875rem;
}

:deep(.p-datatable-tbody > tr > td) {
  padding-top: 0.45rem;
  padding-bottom: 0.45rem;
}
</style>
