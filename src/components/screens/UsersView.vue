<template>
  <DefaultLayout height="full" overflow-y="hidden" width="full">
    <ItemsView entity-type-name="user" />
  </DefaultLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import ItemsView from '@/components/common/ItemsView.vue'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'

export default defineComponent({
  name: 'HomeView',

  components: {DefaultLayout, ItemsView},

  setup: () => {
    useHead({title: 'User administration'})
  }
})
</script>
