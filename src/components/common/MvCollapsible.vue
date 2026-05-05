<template>
  <div class="border-b border-gray-100 last:border-b-0">
    <button
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
