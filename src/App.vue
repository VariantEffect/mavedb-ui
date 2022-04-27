<template>
  <router-view :key="$route.path" />
  <ConfirmDialog></ConfirmDialog>
  <Toast position="bottom-right" />
</template>

<script>

import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import 'primeflex/primeflex.css'

export default {
  components: {ConfirmDialog, Toast},
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
