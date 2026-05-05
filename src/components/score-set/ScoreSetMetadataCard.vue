<template>
  <div class="mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-white p-6">
    <h3 class="mave-section-title">Metadata</h3>
    <div class="border-b border-border-light pb-4">
      <h3 class="mb-3 text-[15px] font-bold text-text-dark">Abstract</h3>
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="item.abstractText"
        class="pl-4 text-sm leading-relaxed text-text-secondary"
        v-html="markdownToHtml(item.abstractText)"
      ></div>
      <p v-else class="pl-4 text-sm italic text-text-muted">Not provided.</p>
      <!-- eslint-enable vue/no-v-html -->
    </div>

    <div class="border-b border-border-light py-4">
      <h3 class="mb-3 text-[15px] font-bold text-text-dark">Method</h3>
      <!-- eslint-disable vue/no-v-html -->
      <div
        v-if="item.methodText"
        class="pl-4 text-sm leading-relaxed text-text-secondary"
        v-html="markdownToHtml(item.methodText)"
      ></div>
      <p v-else class="pl-4 text-sm italic text-text-muted">Not provided.</p>
      <!-- eslint-enable vue/no-v-html -->
    </div>

    <div class="border-b border-border-light py-4">
      <MvPublicationsSection :publications="item.primaryPublicationIdentifiers" title="Primary References" />
    </div>

    <div class="py-4">
      <MvPublicationsSection :publications="item.secondaryPublicationIdentifiers" title="Secondary References" />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

import MvPublicationsSection from '@/components/common/MvPublicationsSection.vue'
import {markdownToHtml} from '@/lib/form-helpers'

export default defineComponent({
  name: 'ScoreSetMetadataCard',

  components: {MvPublicationsSection},

  props: {
    item: {type: Object, required: true}
  },

  methods: {
    markdownToHtml
  }
})
</script>
