<template>
  <DefaultLayout>
    <h1 v-if="alleleTitle && variants.length > 1" class="mavedb-variant-title">Variant: {{ alleleTitle }}</h1>
    <ErrorView v-if="variantsStatus == 'Error'" />
    <PageLoading v-else-if="variantsStatus == 'Loading'" />
    <Message v-else-if="variants.length == 0">No variants found in MaveDB</Message>
    <div v-else :class="singleOrMultipleVariantsClassName">
      <TabView class="mavedb-variants-tabview" :lazy="true">
        <TabPanel
          v-for="(variant, variantIndex) in variants"
          :key="variant.content.urn"
          v-model:active-index="activeVariantIndex"
          :header="variant.content.url"
        >
          <template #header>
            <div v-if="variants.length > 1">
              <div class="mavedb-variants-tabview-header-text" style="color: #000; font-weight: bold">
                Measurement {{ variantIndex + 1 }}
              </div>
              <div
                v-if="variant.type == 'nucleotide'"
                class="mavedb-variants-tabview-header-text"
                style="color: #000; font-weight: bold"
              >
                Assayed at nucleotide level
              </div>
              <div
                v-else-if="variant.type == 'protein'"
                class="mavedb-variants-tabview-header-text"
                style="color: #000; font-weight: bold"
              >
                Assayed at protein level
              </div>
              <div
                v-else-if="variant.type == 'associatedNucleotide'"
                class="mavedb-variants-tabview-header-text"
                style="color: #000; font-weight: bold"
              >
                Other nucleotide-level variant with equivalent protein effect
              </div>
              <div class="mavedb-variants-tabview-header-text">{{ variantName(variant.content) }}</div>
              <div class="mavedb-variants-tabview-header-text">{{ variant.content.scoreSet.title }}</div>
            </div>
          </template>
          <VariantMeasurementView :variant-urn="variant.content.urn" />
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
import {defineComponent} from 'vue'

import ErrorView from '@/components/common/ErrorView.vue'
import PageLoading from '@/components/common/PageLoading.vue'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import VariantMeasurementView from '@/components/VariantMeasurementView.vue'
import config from '@/config'

export default defineComponent({
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
    alleleTitle: function () {
      if (this.clingenAlleleName) {
        return this.clingenAlleleName
      }
      if (this.variants.length == 1) {
        return this.variantName(this.variants[0])
      }
      return undefined
    },
    clingenAlleleName: function () {
      return this.clingenAllele?.communityStandardTitle?.[0] || undefined
    },
    singleOrMultipleVariantsClassName: function () {
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
      handler: async function (newValue, oldValue) {
        if (newValue != oldValue) {
          await this.fetchVariants()
          await this.fetchClingenAllele()
        }
      },
      immediate: true
    }
  },

  methods: {
    currentMappedVariant: function (variant: any) {
      return (variant.mappedVariants || []).find((mappedVariant: any) => mappedVariant.current)
    },

    fetchClingenAllele: async function () {
      this.clingenAllele = undefined
      try {
        const response = await axios.get(`https://reg.genome.network/allele/${this.clingenAlleleId}`)
        this.clingenAllele = response.data
      } catch (error) {
        console.log(`Error while fetching ClinGen allele "${this.clingenAlleleId}"`, error)
        return undefined
      }
    },

    fetchVariants: async function () {
      this.variants = []
      this.variantsStatus = 'Loading'
      try {
        const response = await axios.post(`${config.apiBaseUrl}/variants/clingen-allele-id-lookups`, {
          clingenAlleleIds: [this.clingenAlleleId]
        })
        if (this.clingenAlleleId.startsWith('CA')) {
          const nucleotideVariants = (response.data[0]?.exactMatch?.variantEffectMeasurements || []).map(
            (entry: any) => ({
              content: entry,
              type: 'nucleotide'
            })
          )
          const proteinVariants = (
            response.data[0]?.equivalentAa?.flatMap((entry: any) => entry.variantEffectMeasurements || []) || []
          ).map((entry: any) => ({
            content: entry,
            type: 'protein'
          }))
          const associatedNucleotideVariants = (
            response.data[0]?.equivalentNt?.flatMap((entry: any) => entry.variantEffectMeasurements || []) || []
          ).map((entry: any) => ({
            content: entry,
            type: 'associatedNucleotide'
          }))
          this.variants = [...nucleotideVariants, ...proteinVariants, ...associatedNucleotideVariants]
          console.log('Variants:')
          console.log(this.variants)
        } else if (this.clingenAlleleId.startsWith('PA')) {
          // do this separately because we want protein to show up first if protein page
          const proteinVariants = (response.data[0]?.exactMatch?.variantEffectMeasurements || []).map((entry: any) => ({
            content: entry,
            type: 'protein'
          }))
          // note: since we weren't able to resolve PA ID to a CA ID, we don't expect any results for nt
          const nucleotideVariants = (
            response.data[0]?.equivalentNt?.flatMap((entry: any) => entry.variantEffectMeasurements || []) || []
          ).map((entry: any) => ({
            content: entry,
            type: 'nucleotide'
          }))
          this.variants = [...proteinVariants, ...nucleotideVariants]
        }
        this.variantsStatus = 'Loaded'
      } catch (error) {
        console.log('Error while loading variants', error)
        this.variantsStatus = 'Error'
      }
    },

    variantName: function (variant: any) {
      return (
        this.currentMappedVariant(variant)?.postMapped?.expressions?.[0]?.value ||
        variant.hgvs_nt ||
        variant.hgvs_pro ||
        variant.hgvs_splice ||
        undefined
      )
    }
  }
})
</script>

<style scoped>
.mavedb-single-variant:deep(.p-tabview-nav-container) {
  display: none;
}
.mavedb-variant-title {
  font-weight: bold;
  font-size: 2em;
}
.mavedb-variants-tabview:deep(.p-tabview-panels) {
  background: transparent;
}
.mavedb-variants-tabview-header-text {
  color: #3f51b5;
}
</style>
