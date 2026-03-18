<template>
  <div aria-busy="true" aria-label="Page loading" role="status" style="height: 100vh">
    <MvLoader class="absolute top-[40%] left-1/2 -translate-x-1/2" :text="text" />
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

import MvLoader from '@/components/common/MvLoader.vue'

export default defineComponent({
  name: 'PageLoading',
  components: {MvLoader},

  props: {
    text: {type: String, default: 'Loading...'}
  }
})
</script>
