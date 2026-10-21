<template>
  <div v-if="accessKey">
    <div class="flex items-center gap-2">
      <span
        aria-label="API key"
        class="flex max-w-[450px] flex-1 items-center overflow-hidden rounded-md border border-border py-1.5 pl-3 pr-3 font-mono text-sm tracking-wide text-text-secondary"
        :class="keyDisplayClass"
        role="status"
      >
        <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ newKey ?? maskedKey }}</span>
      </span>
      <PButton
        v-if="newKey"
        aria-label="Copy API key to clipboard"
        class="key-copy-btn"
        :icon="copySuccess ? 'pi pi-check' : 'pi pi-copy'"
        rounded
        severity="secondary"
        text
        @click="copyToClipboard"
      />
      <PButton
        aria-label="Delete API key"
        class="key-delete-btn"
        icon="pi pi-trash"
        rounded
        severity="danger"
        text
        @click="$emit('delete', accessKey.id)"
      />
    </div>
    <p v-if="newKey" class="mt-1.5 text-xs text-text-muted">
      Copy this key now. It won't be shown again; if you lose it, delete it and generate a new one.
    </p>
  </div>
  <div v-else>
    <p class="text-xs italic text-text-muted">{{ emptyMessage }}</p>
    <PButton class="mt-2" label="Generate API key" severity="warn" size="small" @click="$emit('generate')" />
  </div>
</template>

<script lang="ts">
import PButton from 'primevue/button'
import {defineComponent, type PropType} from 'vue'

import type {components} from '@/schema/openapi'

type AccessKey = components['schemas']['AccessKey']

export default defineComponent({
  name: 'MvAccessKeyRow',

  components: {PButton},

  props: {
    accessKey: {type: Object as PropType<AccessKey | null>, default: null},
    // The full key, available only in the session that generated it; the API returns it once.
    newKey: {type: String as PropType<string | null>, default: null},
    emptyMessage: {type: String, default: 'You have not created an API key.'},
    keyDisplayClass: {type: String, default: 'bg-bg'}
  },

  emits: ['delete', 'generate'],

  data() {
    return {
      copySuccess: false
    }
  },

  computed: {
    maskedKey(): string {
      return `${'•'.repeat(8)}${this.accessKey?.keyHint ?? ''}`
    }
  },

  watch: {
    newKey() {
      this.copySuccess = false
    }
  },

  methods: {
    async copyToClipboard() {
      if (!this.newKey) return
      await navigator.clipboard.writeText(this.newKey)
      this.copySuccess = true
      setTimeout(() => (this.copySuccess = false), 1500)
    }
  }
})
</script>

<style scoped>
/* PrimeVue button hover overrides — !important needed to beat PrimeVue's inline styles */
.key-copy-btn:hover {
  border-color: var(--color-sage) !important;
  color: var(--color-sage) !important;
}

.key-delete-btn:hover {
  background-color: var(--color-danger-light) !important;
  border-color: var(--color-danger) !important;
  color: var(--color-danger) !important;
}
</style>
