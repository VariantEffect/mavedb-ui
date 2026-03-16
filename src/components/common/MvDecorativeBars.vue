<template>
  <div aria-hidden="true" class="flex items-end justify-center gap-1" style="height: 48px">
    <div v-for="(bar, i) in bars" :key="i" class="w-1.5 rounded-t" :class="bar.color" :style="{height: bar.height}" />
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

const HEIGHTS = ['18px', '30px', '42px', '34px', '24px', '38px', '26px', '16px']

const COLORS: Record<string, string[]> = {
  full: ['bg-sage', 'bg-mint', 'bg-sage', 'bg-orange-cta', 'bg-sage', 'bg-mint', 'bg-sage', 'bg-mint'],
  leading: [
    'bg-gray-200/30',
    'bg-gray-200/40',
    'bg-gray-300/50',
    'bg-sage/50',
    'bg-orange-cta/70',
    'bg-sage',
    'bg-mint',
    'bg-sage'
  ],
  trailing: [
    'bg-sage',
    'bg-mint',
    'bg-sage',
    'bg-orange-cta/70',
    'bg-sage/50',
    'bg-gray-300/50',
    'bg-gray-200/40',
    'bg-gray-200/30'
  ]
}

export default defineComponent({
  name: 'MvDecorativeBars',

  props: {
    variant: {type: String as PropType<'full' | 'leading' | 'trailing'>, default: 'full'}
  },

  computed: {
    bars() {
      const colors = COLORS[this.variant]
      return HEIGHTS.map((height, i) => ({color: colors[i], height}))
    }
  }
})
</script>
