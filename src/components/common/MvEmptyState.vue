<template>
  <component
    :is="to ? 'router-link' : 'div'"
    class="mv-empty-state flex flex-col items-center rounded-md border-2 border-dashed border-border bg-chip px-6 py-13 text-center no-underline text-inherit transition-[border-color,background] duration-150"
    :class="{interactive: isInteractive}"
    :role="!to && isInteractive ? 'button' : undefined"
    :tabindex="!to && isInteractive ? 0 : undefined"
    :to="to || undefined"
    @click="handleClick"
    @keydown.enter="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <MvDecorativeBars class="mb-5" variant="trailing" />
    <h3 class="text-base font-bold text-text-secondary mb-1.5">{{ title }}</h3>
    <p v-if="description" class="text-xs-plus text-text-muted mb-5 leading-relaxed max-w-[400px]">{{ description }}</p>
    <span v-if="actionLabel" class="text-xs-plus font-semibold text-sage">{{ actionLabel }}</span>
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
/* Conditional state + hover combo — cleaner as scoped CSS than dynamic class binding */
.mv-empty-state.interactive {
  cursor: pointer;
}

.mv-empty-state.interactive:hover {
  border-color: var(--color-mint);
  background: var(--color-mint-light);
}
</style>
