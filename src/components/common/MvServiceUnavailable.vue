<template>
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
    <MvDecorativeBars class="mb-7" variant="trailing" />

    <h2 class="mb-3 font-display text-2xl font-bold text-text-primary">
      {{ title }}
    </h2>

    <p class="mb-8 max-w-md text-sm leading-relaxed text-text-secondary">
      {{ description }}
    </p>

    <div class="flex flex-wrap justify-center gap-3">
      <button
        v-if="retryLabel"
        class="inline-flex items-center gap-1.5 rounded-md bg-orange-cta px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-90"
        type="button"
        @click="$emit('retry')"
      >
        {{ retryLabel }}
      </button>
      <router-link
        class="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-secondary no-underline transition-colors hover:bg-neutral-100"
        to="/"
      >
        Back to home
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import MvDecorativeBars from '@/components/common/MvDecorativeBars.vue'

export default defineComponent({
  name: 'MvServiceUnavailable',

  components: {MvDecorativeBars},

  props: {
    title: {type: String, default: 'Service temporarily unavailable'},
    description: {
      type: String,
      default: "We're having trouble fetching the requested information. Please try again in a moment."
    },
    retryLabel: {type: String, default: null}
  },

  emits: ['retry']
})
</script>
