<template>
  <div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
    <!-- Decorative bars -->
    <div class="mb-7 flex items-end justify-center gap-1" style="height: 48px">
      <div class="w-1.5 rounded-t bg-sage" style="height: 18px" />
      <div class="w-1.5 rounded-t bg-mint" style="height: 30px" />
      <div class="w-1.5 rounded-t bg-sage" style="height: 42px" />
      <div class="w-1.5 rounded-t bg-orange-cta/70" style="height: 34px" />
      <div class="w-1.5 rounded-t bg-gray-400/60" style="height: 24px" />
      <div class="w-1.5 rounded-t bg-gray-300/50" style="height: 38px" />
      <div class="w-1.5 rounded-t bg-gray-200/40" style="height: 26px" />
      <div class="w-1.5 rounded-t bg-gray-200/30" style="height: 16px" />
    </div>

    <h2 class="mb-3 font-display text-2xl font-bold text-text-primary">
      404 &mdash; {{ modelNameForDisplay ? `${modelNameForDisplay} not found` : 'Page not found' }}
    </h2>

    <p class="mb-8 max-w-md text-sm leading-relaxed text-text-secondary">
      <template v-if="itemId">
        The {{ modelNameForDisplay || 'item' }} with identifier
        <code class="rounded bg-gray-100 px-1 py-0.5 text-sm">{{ itemId }}</code>
        does not exist, or you do not have permission to view it.
      </template>
      <template v-else>
        This page doesn't exist or may have been moved. Check the URL, or try searching for a
        {{ modelNameForDisplay || 'dataset' }}.
      </template>
    </p>

    <div class="flex flex-wrap justify-center gap-3">
      <router-link
        class="inline-flex items-center gap-1.5 rounded-md bg-orange-cta px-5 py-2.5 text-sm font-semibold text-white no-underline transition-colors hover:brightness-90"
        to="/search"
      >
        Search MaveDB
      </router-link>
      <router-link
        class="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text-secondary no-underline transition-colors hover:bg-[#f5f5f5]"
        to="/"
      >
        Back to home
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'ItemNotFound',

  props: {
    model: {type: String, default: null},
    itemId: {type: String, default: null}
  },

  computed: {
    /** Model name with proper capitalization for display (e.g. "Experiment" instead of "experiment") */
    modelNameForDisplay(): string | null {
      if (!this.model) return null
      return this.model
        .split(/(?=[A-Z])/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }
  }
})
</script>
