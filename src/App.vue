<template>
  <router-view :key="$route.path" />
  <ConfirmDialog></ConfirmDialog>
  <Toast position="bottom-right" />
</template>

<script>
import 'primeflex/primeflex.css'
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import {mapActions, mapState} from 'vuex'

export default {
  components: {ConfirmDialog, Toast},
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

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}
</style>
