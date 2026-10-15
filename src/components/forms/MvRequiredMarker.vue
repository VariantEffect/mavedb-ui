<template>
  <span class="text-xl text-danger">
    <span aria-hidden="true">*</span>
    <span class="sr-only">(required)</span>
  </span>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

export default defineComponent({
  name: 'MvRequiredMarker'
})
</script>
