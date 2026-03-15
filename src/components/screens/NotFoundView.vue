<template>
  <MvLayout>
    <ItemNotFound />
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import ItemNotFound from '@/components/common/ItemNotFound.vue'
import MvLayout from '@/components/layout/MvLayout.vue'

export default defineComponent({
  name: 'NotFoundView',

  components: {ItemNotFound, MvLayout},

  setup() {
    useHead({title: 'Page Not Found'})
  }
})
</script>
