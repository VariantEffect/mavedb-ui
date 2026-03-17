<template>
  <a
    class="inline-flex items-center gap-1.5 align-middle font-medium no-underline"
    :class="sizeClass"
    :href="`https://orcid.org/${orcidId}`"
    rel="noopener noreferrer"
    target="_blank"
  >
    <img alt="ORCID iD" :class="iconClass" src="@/assets/ORCIDiD_icon.png" />
    <slot>{{ label }}</slot>
  </a>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

export default defineComponent({
  name: 'MvOrcidLink',

  props: {
    orcidId: {type: String, required: true},
    firstName: {type: String as PropType<string | null>, default: null},
    lastName: {type: String as PropType<string | null>, default: null},
    size: {type: String as () => 'sm' | 'md', default: 'md'}
  },

  computed: {
    label(): string {
      if (this.firstName || this.lastName) {
        return `${this.firstName ?? ''} ${this.lastName ?? ''}`.trim()
      }
      return this.orcidId
    },
    iconClass(): string {
      return this.size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
    },
    sizeClass(): string {
      return this.size === 'sm' ? 'text-xs' : 'text-sm'
    }
  }
})
</script>
