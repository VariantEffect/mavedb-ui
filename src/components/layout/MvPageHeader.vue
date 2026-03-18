<template>
  <header class="border-b border-border bg-white px-4 tablet:px-6" :class="paddingClass">
    <div class="mx-auto" :style="{maxWidth}">
      <div v-if="eyebrow || $slots.eyebrow" class="mb-1 text-sm font-semibold uppercase tracking-wider text-text-muted">
        <slot name="eyebrow">{{ eyebrow }}</slot>
      </div>

      <div
        v-if="$slots.actions"
        class="flex flex-row justify-between gap-4 tablet:gap-5"
        :class="variant === 'toolbar' ? 'items-center' : 'items-start'"
      >
        <div class="min-w-0 flex-1">
          <h1 :class="titleClasses">{{ title }}</h1>
          <slot name="subtitle" />
          <slot />
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <slot name="actions" />
        </div>
      </div>

      <template v-else>
        <h1 :class="titleClasses">{{ title }}</h1>
        <slot name="subtitle" />
        <div v-if="$slots.default" class="text-base leading-relaxed text-text-secondary">
          <slot />
        </div>
      </template>
    </div>
  </header>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

type HeaderVariant = 'page' | 'editor' | 'toolbar'

export default defineComponent({
  name: 'MvPageHeader',

  props: {
    title: {type: String, required: true},
    eyebrow: {type: String, default: null},
    maxWidth: {type: String, default: '850px'},
    variant: {type: String as PropType<HeaderVariant>, default: 'page'}
  },

  computed: {
    paddingClass(): string {
      switch (this.variant) {
        case 'toolbar':
          return 'py-3.5'
        case 'editor':
          return 'py-5 tablet:py-8'
        default:
          return 'pb-6 pt-7 tablet:pb-9 tablet:pt-10'
      }
    },
    titleClasses(): string {
      switch (this.variant) {
        case 'toolbar':
          return 'font-display text-xl font-extrabold text-text-dark'
        case 'editor':
          return 'font-display text-xl tablet:text-3xl font-bold leading-snug text-text-dark'
        default:
          return 'mb-1.5 tablet:mb-2.5 font-display text-xl tablet:text-3xl font-bold text-text-dark'
      }
    }
  }
})
</script>
