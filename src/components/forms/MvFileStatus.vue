<template>
  <div class="mv-file-status">
    <span class="mv-file-status-icon">
      <i class="pi pi-check" />
    </span>
    <span class="mv-file-status-name">{{ label }} uploaded successfully</span>
    <div class="mv-file-status-actions">
      <PButton
        v-if="viewable"
        label="View"
        severity="secondary"
        size="small"
        type="button"
        @click="$emit('view')"
      />
      <PButton label="Delete" severity="danger" size="small" type="button" @click="$emit('delete')" />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import Button from 'primevue/button'

export default defineComponent({
  name: 'MvFileStatus',

  components: {PButton: Button},

  props: {
    label: {type: String, required: true},
    viewable: {type: Boolean, default: true}
  },

  emits: ['view', 'delete']
})
</script>

<style scoped>
.mv-file-status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-mint-light);
  border: 1px solid var(--color-mint);
  border-radius: 6px;
  font-size: 13px;
}

.mv-file-status-icon {
  color: var(--color-sage-dark);
  flex-shrink: 0;
}

.mv-file-status-name {
  font-weight: 600;
  color: var(--color-text-primary);
  flex: 1;
}

.mv-file-status-actions {
  display: flex;
  gap: 6px;
}
</style>
