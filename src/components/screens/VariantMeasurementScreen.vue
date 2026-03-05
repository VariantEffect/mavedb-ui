<template>
  <MvLayout>
    <VariantMeasurementView :variant-urn="variantUrn" />
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvLayout from '@/components/layout/MvLayout.vue'
import VariantMeasurementView from '@/components/VariantMeasurementView.vue'

export default defineComponent({
  name: 'VariantMeasurementScreen',
  components: {MvLayout, VariantMeasurementView},

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
