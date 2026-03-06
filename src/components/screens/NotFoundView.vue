<template>
  <MvLayout>
    <div class="flex flex-1 flex-col items-center justify-center text-center">
      <!-- Decorative bars -->
      <div class="flex items-end justify-center gap-[4px]">
        <div class="w-[7px] rounded-t bg-sage" style="height: 18px" />
        <div class="w-[7px] rounded-t bg-mint" style="height: 30px" />
        <div class="w-[7px] rounded-t bg-sage" style="height: 42px" />
        <div class="w-[7px] rounded-t bg-orange-cta opacity-70" style="height: 34px" />
        <div class="w-[7px] rounded-t bg-[#bbb] opacity-60" style="height: 24px" />
        <div class="w-[7px] rounded-t bg-[#ccc] opacity-50" style="height: 38px" />
        <div class="w-[7px] rounded-t bg-[#ddd] opacity-40" style="height: 26px" />
        <div class="w-[7px] rounded-t bg-[#e0e0e0] opacity-30" style="height: 16px" />
      </div>

      <h2 class="mb-3 font-display text-2xl font-bold text-text-primary">404 &mdash; Page not found</h2>
      <p class="mb-8 max-w-lg text-center text-sm text-text-secondary">
        This page doesn't exist or may have been moved. Check the URL, or try searching for a dataset.
      </p>
      <div class="flex gap-3">
        <router-link
          class="inline-block rounded-md bg-orange-cta px-4.5 py-2.5 text-xs font-semibold text-white no-underline hover:brightness-90"
          to="/search"
          >Search MaveDB</router-link
        >
        <router-link
          class="inline-block rounded-md border border-border bg-white px-4.5 py-2.5 text-xs font-semibold text-text-secondary no-underline hover:bg-[#f5f5f5]"
          to="/"
          >Back to home</router-link
        >
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvLayout from '@/components/layout/MvLayout.vue'

export default defineComponent({
  name: 'NotFoundView',

  components: {MvLayout},

  setup() {
    useHead({title: 'Page Not Found'})
  }
})
</script>
