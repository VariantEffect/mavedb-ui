<template>
  <MvLayout>
    <MvItemNotFound />
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvLayout from '@/components/layout/MvLayout.vue'

export default defineComponent({
  name: 'NotFoundView',

  components: {MvItemNotFound, MvLayout},

  setup() {
    useHead({title: 'Page Not Found'})
  }
})
</script>
