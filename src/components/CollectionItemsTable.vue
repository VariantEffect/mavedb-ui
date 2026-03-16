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
          <EntityLink display="title" :entity-type="entityType" :urn="data.urn" use-cache />
        </template>
      </Column>
      <Column v-if="canUpdate" style="width: 4rem">
        <template #body="{data}">
          <PButton icon="pi pi-trash" severity="danger" size="small" text @click="$emit('remove', data.urn)" />
        </template>
      </Column>
      <template v-if="canAdd" #footer>
        <div class="table-footer-actions">
          <PButton :label="`Add ${entityTypeLabel}`" severity="success" size="small" @click="$emit('add')" />
        </div>
      </template>
    </DataTable>
    <div v-else>
      <MvEmptyState
        :action-label="`Add ${entityTypeLabel}`"
        :description="`This collection doesn't have any ${entityTypeLabel}s yet.`"
        :title="`No ${entityTypeLabel}s yet`"
        @action="$emit('add')"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import EntityLink from '@/components/common/EntityLink.vue'
import MvEmptyState from './common/MvEmptyState.vue'

export default {
  name: 'CollectionItemsTable',
  components: {
    PButton: Button,
    Column,
    DataTable,
    EntityLink,
    MvEmptyState
  },
  props: {
    items: {
      type: Array,
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
  computed: {
    entityTypeLabel() {
      return this.entityType === 'scoreSet' ? 'score set' : 'experiment'
    }
  }
}
</script>

<style scoped>
.empty-state {
  padding: 2rem;
  text-align: center;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px dashed #d1d5db;
}

.table-footer-actions {
  display: flex;
  justify-content: flex-end;
}

.add-items-link {
  margin-top: 0.5rem;
  color: #2563eb;
  cursor: pointer;
  font-size: 0.875rem;
}

.add-items-link:hover {
  text-decoration: underline;
  color: #1d4ed8;
}

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
