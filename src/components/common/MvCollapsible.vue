<template>
  <div class="border-b border-gray-100 last:border-b-0">
    <div v-if="$slots['inline-link']" class="flex items-center hover:bg-gray-50">
      <div class="flex items-center px-4 py-2.5">
        <slot name="inline-link" />
      </div>
      <button
        :aria-label="buttonLabel || undefined"
        :aria-controls="panelId"
        :aria-expanded="isOpen"
        class="flex flex-1 cursor-pointer items-center justify-between gap-2 py-2.5 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-500"
        type="button"
        @click="toggle"
      >
        <span class="min-w-0 flex-1">
          <slot name="header">
            {{ title }}
          </slot>
        </span>
        <i
          aria-hidden="true"
          class="pi pi-chevron-down text-xs text-gray-400 transition-transform duration-150"
          :class="{'rotate-180': isOpen}"
        />
      </button>
    </div>
    <button
      v-else
      :aria-label="buttonLabel || undefined"
      :aria-controls="panelId"
      :aria-expanded="isOpen"
      class="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hover:bg-gray-50"
      type="button"
      @click="toggle"
    >
      <slot name="header">
        {{ title }}
      </slot>
      <i
        aria-hidden="true"
        class="pi pi-chevron-down text-xs text-gray-400 transition-transform duration-150"
        :class="{'rotate-180': isOpen}"
      />
    </button>
    <div v-show="isOpen" :id="panelId" class="pb-3 pl-8 pr-4">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, useId} from 'vue'

export default defineComponent({
  name: 'MvCollapsible',

  props: {
    title: {
      type: String,
      default: ''
    },
    open: {
      type: Boolean,
      default: true
    },
    buttonLabel: {
      type: String,
      default: ''
    }
  },

  emits: ['update:open'],

  setup() {
    return {panelId: `mv-collapsible-${useId()}`}
  },

  data() {
    return {
      isOpen: this.open
    }
  },

  watch: {
    open(val: boolean) {
      this.isOpen = val
    }
  },

  methods: {
    toggle() {
      this.isOpen = !this.isOpen
      this.$emit('update:open', this.isOpen)
    }
  }
})
</script>
