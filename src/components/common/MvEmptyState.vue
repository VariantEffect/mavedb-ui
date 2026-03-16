<template>
  <component
    :is="to ? 'router-link' : 'div'"
    class="mv-empty-state"
    :class="{interactive: isInteractive}"
    :role="!to && isInteractive ? 'button' : undefined"
    :tabindex="!to && isInteractive ? 0 : undefined"
    :to="to || undefined"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <MvDecorativeBars class="mb-5" variant="trailing" />
    <h3>{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <span v-if="actionLabel" class="mv-empty-state-action">{{ actionLabel }}</span>
    <slot />
  </component>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import type {RouteLocationRaw} from 'vue-router'
import MvDecorativeBars from '@/components/common/MvDecorativeBars.vue'

export default defineComponent({
  name: 'MvEmptyState',
  components: {MvDecorativeBars},
  props: {
    title: {type: String, required: true},
    description: {type: String, default: null},
    actionLabel: {type: String, default: null},
    to: {type: [String, Object] as unknown as () => RouteLocationRaw | null, default: null}
  },
  emits: ['action'],
  computed: {
    isInteractive(): boolean {
      return !!(this.to || this.actionLabel)
    }
  },
  methods: {
    handleClick() {
      if (!this.to && this.isInteractive) {
        this.$emit('action')
      }
    }
  }
})
</script>

<style scoped>
.mv-empty-state {
  border: 2px dashed var(--color-border);
  border-radius: 6px;
  padding: 52px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-chip);
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.mv-empty-state.interactive {
  cursor: pointer;
}

.mv-empty-state.interactive:hover {
  border-color: var(--color-mint);
  background: var(--color-mint-light);
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

.mv-empty-state-action {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-sage);
}
</style>
