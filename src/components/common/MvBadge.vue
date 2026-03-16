<template>
  <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-0.5 text-xs font-bold" :class="config.classes">
    <span class="inline-block size-1.5 rounded-full" :class="config.dotClass" />
    {{ config.label }}
  </span>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {getBadge} from '@/lib/badges'

export default defineComponent({
  name: 'MvBadge',

  props: {
    value: {type: String, required: true}
  },

  computed: {
    config() {
      return getBadge(this.value)
    }
  }
})
</script>
