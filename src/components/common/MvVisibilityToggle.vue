<template>
  <div>
    <PButton
      v-if="interactive"
      :aria-label="ariaDescription"
      :aria-pressed="!isPrivate"
      class="!inline-flex cursor-pointer items-center gap-1.5 !rounded-xl !border !px-3 !py-1 !text-xs !font-bold transition-colors"
      :class="
        isPrivate
          ? '!border-orange-border !bg-orange-light !text-orange-cta-dark'
          : '!border-sage !bg-sage-light !text-sage-dark'
      "
      :disabled="disabled"
      severity="secondary"
      text
      @click="handleClick"
    >
      <i :class="isPrivate ? 'pi pi-lock' : 'pi pi-lock-open'" style="font-size: 11px" />
      {{ isPrivate ? 'Private' : 'Public' }}
    </PButton>
    <span
      v-else
      class="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold"
      :class="
        isPrivate
          ? 'border-orange-border bg-orange-light text-orange-cta-dark'
          : 'border-sage bg-sage-light text-sage-dark'
      "
    >
      <i :class="isPrivate ? 'pi pi-lock' : 'pi pi-lock-open'" style="font-size: 11px" />
      {{ isPrivate ? 'Private' : 'Public' }}
    </span>
    <p v-if="description" class="mt-1.5 text-xs text-text-muted">{{ description }}</p>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import PButton from 'primevue/button'

export default defineComponent({
  name: 'MvVisibilityToggle',
  components: {PButton},

  props: {
    modelValue: {type: Boolean, required: true},
    disabled: {type: Boolean, default: false},
    interactive: {type: Boolean, default: true},
    description: {type: String, default: undefined}
  },

  emits: ['update:modelValue', 'click'],

  computed: {
    isPrivate(): boolean {
      return this.modelValue
    },
    ariaDescription(): string {
      return this.isPrivate
        ? 'Collection is private. Click to make public.'
        : 'Collection is public. Click to make private.'
    }
  },

  methods: {
    handleClick() {
      this.$emit('click')
      this.$emit('update:modelValue', !this.modelValue)
    }
  }
})
</script>
