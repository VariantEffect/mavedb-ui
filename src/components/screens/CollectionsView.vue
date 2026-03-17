<template>
  <MvLayout :require-auth="true">
    <template #header>
      <MvPageHeader max-width="1200px" title="Collections have moved">
        <template #subtitle>
          <p class="text-sm text-text-muted">Collections are now managed from the dashboard</p>
        </template>
      </MvPageHeader>
    </template>

    <div class="mx-auto w-full px-4 py-6 tablet:px-6 tablet:py-8" style="max-width: 1200px">
      <div class="flex flex-col items-center rounded-lg border border-border bg-white px-6 py-16 text-center">
        <MvDecorativeBars class="mb-5" variant="trailing" />
        <h2 class="mb-2 text-lg font-bold text-text-secondary">This page has moved</h2>
        <p class="mb-6 max-w-md text-sm leading-relaxed text-text-muted">
          Collections are now part of your dashboard. If you have this page bookmarked, please update your bookmark.
        </p>
        <PButton
          label="Go to Dashboard"
          severity="success"
          @click="$router.push({name: 'dashboard', query: {tab: 'collections'}})"
        />
      </div>
    </div>
  </MvLayout>
</template>

<!-- TODO: Remove this page and its route once enough time has passed for users to update bookmarks. -->
<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'
import PButton from 'primevue/button'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import MvDecorativeBars from '@/components/common/MvDecorativeBars.vue'

export default defineComponent({
  name: 'CollectionsView',

  components: {MvDecorativeBars, MvLayout, MvPageHeader, PButton},

  setup() {
    useHead({title: 'Collections have moved'})
  }
})
</script>
