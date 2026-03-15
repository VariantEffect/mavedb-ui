<template>
  <div class="mv-empty-state">
    <div aria-hidden="true" class="mv-empty-state-bars">
      <div class="mv-empty-state-bar" style="background: var(--color-sage); height: 20px" />
      <div class="mv-empty-state-bar" style="background: var(--color-mint); height: 32px" />
      <div class="mv-empty-state-bar" style="background: var(--color-sage); height: 44px" />
      <div class="mv-empty-state-bar" style="background: var(--color-orange-cta); height: 36px; opacity: 0.7" />
      <div class="mv-empty-state-bar" style="background: #bbb; height: 24px; opacity: 0.6" />
      <div class="mv-empty-state-bar" style="background: #ccc; height: 40px; opacity: 0.5" />
      <div class="mv-empty-state-bar" style="background: #ddd; height: 28px; opacity: 0.4" />
      <div class="mv-empty-state-bar" style="background: #e0e0e0; height: 18px; opacity: 0.3" />
    </div>
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'MvEmptyState',
  props: {
    title: {type: String, required: true},
    description: {type: String, default: null}
  }
})
</script>

<style scoped>
.mv-empty-state {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 52px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.mv-empty-state-bars {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 56px;
  margin-bottom: 20px;
  opacity: 0.45;
}

.mv-empty-state-bar {
  width: 6px;
  border-radius: 3px 3px 0 0;
}

.mv-empty-state h3 {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.mv-empty-state p {
  font-size: 13px;
  color: var(--color-text-muted);
  margin-bottom: 20px;
  line-height: 1.6;
  max-width: 400px;
}
</style>
