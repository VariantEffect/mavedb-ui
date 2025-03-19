<template>
  <DefaultLayout>
    <VariantMeasurementView :variant-urn="variantUrn" />
  </DefaultLayout>
</template>

<script lang="ts">
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import VariantMeasurementView from '@/components/VariantMeasurementView.vue'

export default {
  name: 'VariantMeasurementScreen',
  components: {DefaultLayout, VariantMeasurementView},

  props: {
    variantUrn: {
      type: String,
      required: true
    }
  }
}
</script>
