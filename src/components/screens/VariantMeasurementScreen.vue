<template>
  <DefaultLayout>
    <VariantMeasurementView :variant-urn="variantUrn" />
  </DefaultLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import VariantMeasurementView from '@/components/VariantMeasurementView.vue'

export default defineComponent({
  name: 'VariantMeasurementScreen',
  components: {DefaultLayout, VariantMeasurementView},

  props: {
    variantUrn: {
      type: String,
      required: true
    }
  },

  setup: () => {
    useHead({title: 'Variant'})
  }
})
</script>
