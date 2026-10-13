<template>
  <MvLayout :with-email-prompt="false" :with-nav="false">
    <template #header>
      <header class="border-b border-border bg-white">
        <div class="mx-auto flex h-[58px] max-w-screen-xl items-center px-6">
          <img alt="MaveDB" class="block h-[42px]" src="@/assets/logo-mavedb.png" />
        </div>
      </header>
    </template>

    <div class="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <MvDecorativeBars class="mb-7" variant="trailing" />

      <h1 class="mb-3 font-display text-2xl font-bold text-text-primary">MaveDB is down for maintenance</h1>

      <p v-if="notice?.message" class="mb-3 max-w-md text-sm leading-relaxed text-text-secondary">
        {{ notice.message }}
      </p>
      <p class="max-w-md text-sm leading-relaxed text-text-secondary">
        {{ expectedReturn }} This page will update on its own when the site is back.
      </p>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {computed, defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvDecorativeBars from '@/components/common/MvDecorativeBars.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import {useMaintenance} from '@/composables/use-maintenance'
import {describeExpectedReturn} from '@/lib/maintenance'

export default defineComponent({
  name: 'MaintenanceScreen',

  components: {MvDecorativeBars, MvLayout},

  setup() {
    useHead({title: 'Down for Maintenance'})
    const {notice} = useMaintenance()
    const expectedReturn = computed(() => (notice.value ? describeExpectedReturn(notice.value) : ''))
    return {notice, expectedReturn}
  }
})
</script>
