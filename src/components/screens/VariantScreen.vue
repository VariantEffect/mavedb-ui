<template>
  <DefaultLayout>
    <div v-if="alleleTitle && variants.length > 1" class="font-bold text-2xl m-3">Variant: {{ alleleTitle }}</div>
    <ErrorView v-if="variantsStatus == 'Error'" />
    <PageLoading v-else-if="variantsStatus == 'Loading'" />
    <Message v-else-if="variants.length == 0">No variants found in MaveDB</Message>
    <div v-else :class="singleOrMultipleVariantsClassName">
      <Tabs :lazy="true" :value="0">
        <TabList>
          <Tab v-for="(variant, variantIndex) in variants" :key="variant.content.urn" :value="variantIndex">
              <div v-if="variants.length > 1" class="h-full">
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
          </Tab>
        </TabList>
        <TabPanels>
          <TabPanel
            v-for="(variant, variantIndex) in variants"
            :key="variant.content.urn"
            v-model:active-index="activeVariantIndex"
            :header="variant.content.url"
            :value="variantIndex"
          >
            <VariantMeasurementView :variant-urn="variant.content.urn" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </DefaultLayout>
</template>

<script lang="ts">
import axios from 'axios'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import ErrorView from '@/components/common/ErrorView.vue'
import PageLoading from '@/components/common/PageLoading.vue'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import VariantMeasurementView from '@/components/VariantMeasurementView.vue'
import config from '@/config'

export default defineComponent({
  name: 'VariantMeasurementScreen',
  components: {Button, DefaultLayout, ErrorView, Message, PageLoading, Tabs, TabList, Tab, TabPanels, TabPanel, VariantMeasurementView},

  props: {
    clingenAlleleId: {
      type: String,
      required: true
    }
  },

  setup: () => ({
    head: useHead({title: 'Variant search results'})
  }),

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
      const names = this.variants
        .map((v) => this.variantName(v.content))
        .filter((name) => name != null && name !== undefined)
      if (names.length > 0 && names.every((n) => n === names[0])) {
        return names[0]
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
    },
    clingenAlleleName: {
      handler: async function (newValue) {
        this.head.patch({
          title: newValue ? `Variant ${newValue}` : 'Variant'
        })
      }
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
.mavedb-variants-tabview:deep(.p-tabview-panels) {
  background: transparent;
}
.mavedb-variants-tabview-header-text {
  color: #3f51b5;
}
.mavedb-multiple-variants:deep(.p-tabview-header > a) {
  border: 0 none;
  background: transparent;
}
.mavedb-multiple-variants:deep(.p-tabview-header.p-highlight) {
  background-color: rgba(63, 81, 181, 0.12);
}
</style>
