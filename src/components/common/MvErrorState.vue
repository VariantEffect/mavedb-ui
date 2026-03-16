<template>
  <div class="flex flex-col items-center rounded-md border-2 border-dashed border-border bg-chip px-6 py-13 text-center">
    <MvDecorativeBars class="mb-5" variant="trailing" />

    <h3 class="mb-1.5 text-base font-bold text-text-secondary">{{ title }}</h3>
    <p v-if="description" class="mb-5 max-w-sm text-[13px] leading-relaxed text-text-muted">{{ description }}</p>
    <button
      class="cursor-pointer border-none bg-transparent text-[13px] font-semibold text-sage hover:underline"
      type="button"
      @click="$emit('retry')"
    >
      Try again
    </button>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import MvDecorativeBars from '@/components/common/MvDecorativeBars.vue'

export default defineComponent({
  name: 'MvErrorState',

  components: {MvDecorativeBars},

  props: {
    title: {type: String, default: 'Something went wrong'},
    description: {type: String, default: null}
  },

  emits: ['retry']
})
</script>
