<template>
  <!-- Hidden rather than unmounted during maintenance, so in-progress work survives until the site is back. -->
  <div v-show="!showMaintenanceScreen" class="contents">
    <router-view :key="$route.path" />
  </div>
  <MaintenanceScreen v-if="showMaintenanceScreen" />
  <ConfirmDialog></ConfirmDialog>
  <Toast position="bottom-right" />
</template>

<script>
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import {mapActions, mapState} from 'vuex'

import MaintenanceScreen from '@/components/screens/MaintenanceScreen.vue'
import {useMaintenance} from '@/composables/use-maintenance'

export default {
  components: {ConfirmDialog, MaintenanceScreen, Toast},

  setup() {
    const {showMaintenanceScreen} = useMaintenance()
    return {showMaintenanceScreen}
  },

  computed: mapState('toast', ['toasts']),

  watch: {
    toasts: {
      deep: true,
      handler: function (newValue) {
        if (newValue.length > 0) {
          this.$toast.add(newValue[0])
          this.removeDequeuedToasts(1)
        }
      }
    }
  },

  methods: mapActions('toast', ['removeDequeuedToasts'])
}
</script>
