<template>
  <DefaultLayout height="full" overflow-y="hidden" width="full">
    <ItemsView entityTypeName="user" />
  </DefaultLayout>
</template>

<script>

import ItemsView from '@/components/common/ItemsView'
import DefaultLayout from '@/components/layout/DefaultLayout'

export default {
  name: 'HomeView',
  components: {DefaultLayout, ItemsView}
}

</script>
