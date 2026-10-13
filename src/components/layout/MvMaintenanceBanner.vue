<template>
  <div
    v-if="isScheduled && notice"
    class="border-b border-info-border bg-info-light px-4 py-1.5 text-center text-sm text-text-dark"
    role="status"
  >
    <FontAwesomeIcon class="mr-1.5 text-info" icon="fa-solid fa-wrench" />
    {{ windowText }}
    <template v-if="notice.message">{{ notice.message }}</template>
  </div>
  <div
    v-else-if="isActive && bypassed"
    class="border-b border-danger-border bg-danger-light px-4 py-1.5 text-center text-sm text-text-dark"
    role="status"
  >
    Maintenance mode is on. You are bypassing the maintenance screen for this browser session.
    <a class="text-text-dark underline" href="?maintenance=off">Stop bypassing</a>
  </div>
</template>

<script lang="ts">
import {computed, defineComponent} from 'vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'

import {useMaintenance} from '@/composables/use-maintenance'
import {describeScheduledWindow} from '@/lib/maintenance'

export default defineComponent({
  name: 'MvMaintenanceBanner',

  components: {FontAwesomeIcon},

  setup() {
    const {notice, bypassed, isScheduled, isActive} = useMaintenance()
    const windowText = computed(() => (notice.value ? describeScheduledWindow(notice.value) : ''))
    return {notice, bypassed, isScheduled, isActive, windowText}
  }
})
</script>
