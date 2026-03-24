<template>
  <div
    :aria-label="text || 'Loading'"
    aria-live="polite"
    class="flex flex-col items-center justify-center gap-5 py-14"
    role="status"
  >
    <div aria-hidden="true" class="flex items-end gap-1" style="height: 48px">
      <div
        v-for="(bar, i) in bars"
        :key="i"
        class="bar-pulse w-1.5 rounded-t-sm"
        :style="{background: bar.color, height: bar.height + 'px', animationDelay: i * 0.1 + 's'}"
      />
    </div>
    <span v-if="text" class="text-sm font-medium tracking-wide text-gray-400">{{ text }}</span>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

const BARS = [
  {color: 'var(--color-sage)', height: 20},
  {color: 'var(--color-mint)', height: 32},
  {color: 'var(--color-sage)', height: 44},
  {color: 'var(--color-orange-cta)', height: 36},
  {color: 'var(--color-yellow-accent)', height: 24},
  {color: 'var(--color-sage)', height: 40},
  {color: 'var(--color-mint)', height: 28},
  {color: 'var(--color-orange-cta)', height: 18}
]

export default defineComponent({
  name: 'MvLoader',

  props: {
    text: {
      type: String,
      default: ''
    }
  },

  data() {
    return {bars: BARS}
  }
})
</script>

<style scoped>
@keyframes barPulse {
  0%,
  100% {
    transform: scaleY(1);
    opacity: 0.6;
  }
  50% {
    transform: scaleY(1.5);
    opacity: 1;
  }
}

.bar-pulse {
  animation: barPulse 1.2s ease-in-out infinite;
}
</style>
