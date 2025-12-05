<template>
  <DefaultLayout>
    <div class="variant-header-row">
      <h1 v-if="alleleTitle && variants.length > 1" class="mavedb-variant-title">Variant: {{ alleleTitle }}</h1>
      <div class="variant-header-download-btn-wrapper">
        <SplitButton
          :button-props="{class: 'p-button-sm'}"
          label="Download annotations for selected variant"
          :menu-button-props="{class: 'p-button-sm'}"
          :model="annotatedVariantDownloadOptions"
          @click="annotatedVariantDownloadOptions[0].command"
        ></SplitButton>
      </div>
    </div>
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
import SplitButton from 'primevue/splitbutton'
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
  components: {
    Button,
    DefaultLayout,
    ErrorView,
    Message,
    PageLoading,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    SplitButton,
    VariantMeasurementView
  },

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
    activeVariant: function () {
      return this.variants[this.activeVariantIndex]?.content
    },
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
    },
    annotatedVariantDownloadOptions: function () {
      const annotatedVariantOptions = []
      if (this.activeVariant?.scoreSet?.scoreCalibrations) {
        annotatedVariantOptions.push({
          label: 'Pathogenicity evidence line',
          command: () => {
            this.fetchVariantAnnotations('clinical-evidence')
          }
        })
      }

      if (this.activeVariant?.scoreSet?.scoreCalibrations) {
        annotatedVariantOptions.push({
          label: 'Functional impact statement',
          command: () => {
            this.fetchVariantAnnotations('functional-impact')
          }
        })
      }

      annotatedVariantOptions.push({
        label: 'Functional impact study result',
        command: () => {
          this.fetchVariantAnnotations('study-result')
        }
      })

      return annotatedVariantOptions
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

    fetchVariantAnnotations: async function (annotationType: string) {
      if (!this.activeVariant?.urn) {
        return null
      }

      try {
        const response = await axios.get(
          `${config.apiBaseUrl}/mapped-variants/${encodeURIComponent(this.activeVariant.urn)}/va/${annotationType}`,
          {
            responseType: 'json'
          }
        )

        //convert object to Json.
        const file = JSON.stringify(response.data)
        const anchor = document.createElement('a')

        anchor.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(file)
        anchor.target = '_blank'

        //file default name
        anchor.download = this.activeVariant.urn + '_' + annotationType + '.json'
        anchor.click()
      } catch (error) {
        console.log(
          `Error while fetching variant annotations of type "${annotationType}" for variant "${this.activeVariant.urn}"`,
          error
        )
        this.$toast?.add({
          severity: 'error',
          summary: 'Download failed',
          detail: `Could not fetch variant annotation. ${error.message}.`,
          life: 4000
        })
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
.variant-header-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-weight: bold;
  font-size: 1.5rem;
  margin: 1rem;
}
.variant-header-download-btn-wrapper {
  margin-left: auto;
}
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
