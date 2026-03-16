<template>
  <div v-if="keyId" class="flex items-center gap-2">
    <span
      aria-label="API key"
      class="relative max-w-[450px] flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-border py-1.5 pl-3 pr-8 font-mono text-sm tracking-wide text-text-secondary"
      :class="keyDisplayClass"
      role="status"
    >
      <span :aria-hidden="!revealed" aria-live="polite">{{ revealed ? keyId : maskedKey }}</span>
      <span v-if="!revealed" class="sr-only">Key hidden. Use the reveal button to show it.</span>
      <PButton
        :aria-label="revealed ? 'Hide API key' : 'Reveal API key'"
        :aria-pressed="revealed"
        class="key-reveal-btn hover:bg-transparent hover:!text-sage hover:opacity-100"
        :class="revealed ? '!text-sage opacity-100' : ''"
        :icon="revealed ? 'pi pi-eye-slash' : 'pi pi-eye'"
        rounded
        severity="secondary"
        size="small"
        text
        @click="revealed = !revealed"
      />
    </span>
    <PButton
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
      @click="$emit('delete', keyId)"
    />
  </div>
  <div v-else>
    <p class="text-xs italic text-text-muted">{{ emptyMessage }}</p>
    <PButton class="mt-2" label="Generate API key" severity="warn" size="small" @click="$emit('generate')" />
  </div>
</template>

<script lang="ts">
import PButton from 'primevue/button'
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'MvAccessKeyRow',

  components: {PButton},

  props: {
    keyId: {type: String, default: null},
    emptyMessage: {type: String, default: 'You have not created an API key.'},
    keyDisplayClass: {type: String, default: 'bg-bg'}
  },

  emits: ['delete', 'generate'],

  data() {
    return {
      copySuccess: false,
      revealed: false
    }
  },

  watch: {
    keyId() {
      this.revealed = false
      this.copySuccess = false
    }
  },

  computed: {
    maskedKey(): string {
      if (!this.keyId) return ''
      const suffix = this.keyId.slice(-4)
      return `${'•'.repeat(8)}${suffix}`
    }
  },

  methods: {
    async copyToClipboard() {
      if (!this.keyId) return
      await navigator.clipboard.writeText(this.keyId)
      this.copySuccess = true
      setTimeout(() => (this.copySuccess = false), 1500)
    }
  }
})
</script>

<style scoped>
.key-reveal-btn {
  position: absolute;
  right: 2px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.5;
  transition: opacity 0.15s;
}

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
