<template>
  <header class="border-b border-border bg-white px-6 pb-9 pt-10">
    <div class="mx-auto max-w-[850px]">
      <h1 class="mb-2.5 font-display text-3xl font-bold text-text-dark">{{ title }}</h1>
      <div class="text-base leading-relaxed text-text-secondary">
        <slot />
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'MvPageHeader',

  props: {
    title: {
      type: String,
      required: true
    }
  }
})
</script>
