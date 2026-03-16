<template>
  <div aria-busy="true" aria-label="Page loading" role="status" style="height: 100vh">
    <ProgressSpinner class="mave-page-loading" />
    <span class="sr-only">Loading page content</span>
  </div>
</template>

<script lang="ts">
import ProgressSpinner from 'primevue/progressspinner'

export default {
  name: 'PageLoading',
  components: {ProgressSpinner}
}
</script>

<style>
.mave-page-loading {
  position: absolute;
  top: 40%; /* leave 10% for menu bar */
  left: 50%;
}
</style>
