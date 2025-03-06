<template>
  <DefaultLayout>
    <div v-if="alleleTitle && variants.length > 1" class="mavedb-variant-title">Variant: {{ alleleTitle }}</div>
    <ErrorView v-if="variantsStatus == 'Error'" />
    <PageLoading v-else-if="variantsStatus == 'Loading'" />
    <Message v-else-if="variants.length == 0">No variants found in MaveDB</Message>
    <div v-else :class="singleOrMultipleVariantsClassName">
      <TabView
        class="mavedb-variants-tabview"
        :lazy="true"
      >
        <TabPanel
          v-for="(variant, variantIndex) in variants"
          v-model:activeIndex="activeVariantIndex"
          :header="variant.url"
          :key="variant.urn"
        >
          <template #header>
            <div v-if="variants.length > 1">
              <div style="color: #000; font-weight: bold;">Measurement {{ variantIndex + 1 }}</div>
              <div>{{ variantName(variant) }}</div>
              <div>{{ variant.scoreSet.title }}</div>
            </div>
          </template>
          <VariantMeasurementView :variantUrn="variant.urn" />
        </TabPanel>
      </TabView>
    </div>
  </DefaultLayout>
</template>

<script lang="ts">
import axios from 'axios'
import Button from 'primevue/button'
import Message from 'primevue/message'
import TabPanel from 'primevue/tabpanel'
import TabView from 'primevue/tabview'

import ErrorView from '@/components/common/ErrorView.vue'
import PageLoading from '@/components/common/PageLoading.vue'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import VariantMeasurementView from '@/components/VariantMeasurementView.vue'
import config from '@/config'

export default {
  name: 'VariantMeasurementScreen',
  components: {Button, DefaultLayout, ErrorView, Message, PageLoading, TabPanel, TabView, VariantMeasurementView},

  props: {
    clingenAlleleId: {
      type: String,
      required: true
    }
  },

  data: () => ({
    activeVariantIndex: 0,
    clingenAllele: undefined as any,
    variants: [] as any[],
    variantsStatus: 'NotLoaded'
  }),

  computed: {
    alleleTitle: function() {
      if (this.clingenAlleleName) {
        return this.clingenAlleleName
      }
      if (this.variants.length == 1) {
        return this.variantName(this.variants[0])
      }
      return undefined
    },
    clingenAlleleName: function() {
      console.log(this.clingenAllele)
      return this.clingenAllele?.communityStandardTitle?.[0] || undefined
    },
    singleOrMultipleVariantsClassName: function() {
      if (this.variants.length > 1) {
        return 'mavedb-multiple-variants'
      } else if (this.variants.length == 1) {
        return 'mavedb-single-variant'
      } else {
        return 'mavedb-no-variants'
      }
    }
  },

  watch: {
    clingenAlleleId: {
      handler: async function(newValue, oldValue) {
        if (newValue != oldValue) {
          await this.fetchVariants()
          await this.fetchClingenAllele()
        }
      },
      immediate: true
    }
  },

  methods: {
    currentMappedVariant: function(variant: any) {
      return (variant.mappedVariants || []).find((mappedVariant: any) => mappedVariant.current)
    },

    fetchClingenAllele: async function() {
      this.clingenAllele = undefined
      try {
        const response = await axios.get(`https://reg.genome.network/allele/${this.clingenAlleleId}`)
        this.clingenAllele = response.data
      } catch (error) {
        console.log(`Error while fetching ClinGen allele "${this.clingenAlleleId}"`, error)
        return undefined
      }
    },

    fetchVariants: async function() {
      this.variants = []
      this.variantsStatus = 'Loading'
      try {
        const response = await axios.post(`${config.apiBaseUrl}/variants/clingen-allele-id-lookups`, {
          clingenAlleleIds: [this.clingenAlleleId]
        })

        this.variants = response.data?.[0] || []
        this.variantsStatus = 'Loaded'
      } catch (error) {
        console.log('Error while loading variants', error)
        this.variantsStatus = 'Error'
      }
    },

    variantName: function(variant: any) {
      return this.currentMappedVariant(variant)?.postMapped?.expressions?.[0]?.value
          || variant.hgvs_nt
          || variant.hgvs_pro
          || variant.hgvs_splice
          || undefined
    }
  }
}
</script>

<style scoped>
.mavedb-single-variant:deep(.p-tabview-nav-container) {
  display: none;
}
.mavedb-variant-title {
  font-size: 30px;
  font-weight: bold;
}
.mavedb-variants-tabview:deep(.p-tabview-panels) {
  background: transparent;
}
</style>
