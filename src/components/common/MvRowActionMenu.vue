<template>
  <div class="relative inline-block">
    <!--
      Don't use @click.stop on this button — it prevents PrimeVue's outside-click
      detection, so other open popovers won't dismiss. If this component is ever
      used inside a row with a click handler, use @click.stop on the parent wrapper instead.
    -->
    <button
      :aria-expanded="menuOpen"
      aria-haspopup="true"
      aria-label="Actions"
      class="flex size-[30px] items-center justify-center rounded-md border border-transparent text-text-muted transition-all hover:border-border hover:bg-white hover:text-text-secondary hover:cursor-pointer"
      type="button"
      @click="toggle"
    >
      <i class="pi pi-ellipsis-v text-xs" />
    </button>

    <Popover ref="popoverRef" class="row-action-popover" @hide="menuOpen = false" @show="menuOpen = true">
      <div role="menu">
        <template v-for="(action, i) in actions" :key="i">
          <div v-if="action.separator" class="my-1 h-px bg-border-light" role="separator" />
          <component
            :is="actionTag(action)"
            v-else
            :aria-disabled="action.disabled || undefined"
            class="group/action block w-full px-3.5 py-2 text-left !no-underline transition-colors"
            :class="actionClass(action)"
            :disabled="action.disabled || undefined"
            role="menuitem"
            :to="action.disabled ? undefined : action.to"
            :type="action.to ? undefined : 'button'"
            @click="handleAction(action)"
          >
            <div class="flex items-center gap-1.5 text-xs font-semibold" :class="actionLabelClass(action)">
              {{ action.label }}
            </div>
            <div v-if="action.description" class="mt-0.5 text-xs leading-snug text-text-muted">
              {{ action.description }}
            </div>
          </component>
        </template>
      </div>
    </Popover>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import type {RouteLocationRaw} from 'vue-router'
import Popover from 'primevue/popover'

export interface RowAction {
  label?: string
  description?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
  to?: RouteLocationRaw
  handler?: () => void
}

export default defineComponent({
  name: 'MvRowActionMenu',

  components: {Popover},

  props: {
    actions: {type: Array as PropType<RowAction[]>, required: true}
  },

  data() {
    return {
      menuOpen: false
    }
  },

  methods: {
    toggle(event: Event) {
      ;(this.$refs.popoverRef as InstanceType<typeof Popover>)?.toggle(event)
    },
    handleAction(action: RowAction) {
      if (action.disabled) return
      ;(this.$refs.popoverRef as InstanceType<typeof Popover>)?.hide()
      if (action.handler) action.handler()
    },
    actionTag(action: RowAction): string {
      return action.to && !action.disabled ? 'router-link' : 'button'
    },
    actionClass(action: RowAction): string {
      if (action.disabled) return 'cursor-not-allowed opacity-50'
      return action.danger ? 'cursor-pointer hover:bg-red-50' : 'cursor-pointer hover:bg-bg'
    },
    actionLabelClass(action: RowAction): string {
      const color = action.danger ? 'text-red-600' : 'text-text-primary'
      return action.disabled ? color : `${color} group-hover/action:underline`
    }
  }
})
</script>

<!-- Unscoped: Popover teleports to body, outside component DOM -->
<style>
.row-action-popover.p-popover {
  min-width: 230px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 0;
}

.row-action-popover .p-popover-content {
  padding: 4px 0;
}

.row-action-popover.p-popover::before,
.row-action-popover.p-popover::after {
  display: none;
}
</style>
