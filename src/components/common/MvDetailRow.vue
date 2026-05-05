<template>
  <div class="detail-row flex flex-col sm:flex-row text-xs-plus py-[5px] gap-0.5 sm:gap-4" :style="{alignItems: align}">
    <span class="font-semibold text-text-muted sm:min-w-[160px] shrink-0">{{ label }}</span>
    <span class="detail-value text-text-primary leading-normal">
      <slot v-if="hasSlotContent" />
      <template v-else-if="value != null">{{ value }}</template>
      <span v-else class="text-sm italic text-text-muted">{{ fallback }}</span>
    </span>
  </div>
</template>

<script lang="ts">
import {Comment, defineComponent} from 'vue'

export default defineComponent({
  name: 'MvDetailRow',

  props: {
    label: {type: String, required: true},
    value: {type: [String, Number, null], default: null},
    fallback: {type: String, default: 'N/A'},
    align: {type: String, default: 'baseline'}
  },

  computed: {
    /**
     * Checks whether the default slot contains visible content. When slot children are hidden
     * by v-if, Vue emits Comment vnodes instead of real elements. This computed detects that
     * case so the component can fall through to the `value` prop or `fallback` text rather
     * than rendering an empty slot. This keeps the layout consistent whether slot content is
     * present or not, and allows parent components to conditionally show/hide slot content
     * without maintaining their own v-if checks for whether to render MvDetailRow at all.
     */
    hasSlotContent(): boolean {
      const slot = this.$slots.default
      if (!slot) return false
      const vnodes = slot()
      return vnodes.some((vnode) => {
        if (vnode.type === Comment) return false
        if (typeof vnode.children === 'string') return vnode.children.trim().length > 0
        // Element or component vnodes are real content regardless of their own children
        return true
      })
    }
  }
})
</script>

<style scoped>
/* Sibling combinator — no Tailwind equivalent without restructuring the parent */
.detail-row + .detail-row {
  border-top: 1px solid var(--color-border-light);
}

/* Descendant selector for slotted <a> elements — can't add classes from this component */
.detail-value a {
  color: var(--color-link);
}
</style>
