<template>
  <router-view :key="$route.path" />
  <ConfirmDialog></ConfirmDialog>
  <Toast position="bottom-right" />
  <MvKeyDrawer />
</template>

<script>
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import {mapActions, mapState} from 'vuex'

import MvKeyDrawer from '@/components/common/MvKeyDrawer.vue'

export default {
  components: {ConfirmDialog, MvKeyDrawer, Toast},

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
