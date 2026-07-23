<template>
  <div class="rounded-lg border border-border bg-white p-5">
    <h3 class="mave-section-title">Download files</h3>
    <div class="flex flex-wrap gap-2">
      <PButton icon="pi pi-download" label="Scores" severity="secondary" size="small" @click="downloadFile('scores')" />
      <PButton
        v-if="hasCounts"
        icon="pi pi-download"
        label="Counts"
        severity="secondary"
        size="small"
        @click="downloadFile('counts')"
      />
      <PButton
        v-if="!isMetaDataEmpty"
        icon="pi pi-download"
        label="Metadata"
        severity="secondary"
        size="small"
        @click="downloadMetadata"
      />
      <div class="relative inline-block">
        <PButton
          :disabled="streamDownloadInProgress"
          icon="pi pi-download"
          label="Variant Details"
          severity="secondary"
          size="small"
          @click="streamVariantDetails"
        />
        <div v-if="streamTarget === 'variantDetails'" class="absolute inset-x-0 top-full mt-1">
          <ProgressBar show-value style="height: 1.5em" :value="streamDownloadProgress" />
        </div>
      </div>

      <div class="relative inline-block">
        <SplitButton
          :button-props="{class: 'p-button-sm p-button-secondary'}"
          :disabled="streamDownloadInProgress"
          label="Annotated Variants"
          :menu-button-props="{class: 'p-button-sm p-button-secondary'}"
          :model="annotatedVariantDownloadOptions"
          @click="
            annotatedVariantDownloadOptions[0]?.command?.({
              originalEvent: $event,
              item: annotatedVariantDownloadOptions[0]
            })
          "
        />
        <div v-if="streamTarget === 'annotatedVariants'" class="absolute inset-x-0 top-full mt-1">
          <ProgressBar show-value style="height: 1.5em" :value="streamDownloadProgress" />
        </div>
      </div>

      <PButton
        icon="pi pi-sliders-h"
        label="Custom Data"
        severity="secondary"
        size="small"
        @click="customDialogVisible = true"
      />
    </div>

    <!-- Galaxy integration -->
    <div v-if="requestFromGalaxy === '1'" class="mt-3 border-t border-border-light pt-3">
      Send files to <a :href="galaxyUrl">Galaxy</a>
      <div class="mt-1.5 flex flex-wrap gap-2">
        <PButton label="Scores" severity="secondary" size="small" @click="sendToGalaxy('scores')" />
        <PButton v-if="hasCounts" label="Counts" severity="secondary" size="small" @click="sendToGalaxy('counts')" />
        <PButton label="Variant Details" severity="secondary" size="small" @click="sendToGalaxy('variantDetails')" />
      </div>
    </div>

    <!-- Custom data dialog -->
    <PDialog
      v-model:visible="customDialogVisible"
      :base-z-index="901"
      header="Custom Data Download"
      modal
      :style="{width: '28rem'}"
    >
      <div class="flex flex-col gap-3 py-2">
        <label v-for="opt in dataTypeOptions" :key="opt.value" class="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox v-model="selectedDataOptions" :value="opt.value" />
          {{ opt.label }}
        </label>
      </div>
      <template #footer>
        <PButton label="Cancel" severity="secondary" size="small" @click="customDialogVisible = false" />
        <PButton icon="pi pi-download" label="Download" size="small" @click="handleCustomDownload" />
      </template>
    </PDialog>
  </div>
</template>

<script lang="ts">
import {defineComponent, toRef, type PropType} from 'vue'
import PButton from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import PDialog from 'primevue/dialog'
import type {MenuItem} from 'primevue/menuitem'
import ProgressBar from 'primevue/progressbar'
import SplitButton from 'primevue/splitbutton'

import {useScoreSetDownloads} from '@/composables/use-score-set-downloads'
import config from '@/config'
import type {components} from '@/schema/openapi'
import store from '@/store'

type ScoreSet = components['schemas']['ScoreSet']

export default defineComponent({
  name: 'ScoreSetDownloads',

  components: {PButton, Checkbox, PDialog, ProgressBar, SplitButton},

  props: {
    hasCounts: {type: Boolean, default: false},
    hasPathogenicityCalibrations: {type: Boolean, default: false},
    hasFunctionalImpactCalibrations: {type: Boolean, default: false},
    isMetaDataEmpty: {type: Boolean, default: true},
    scoreSet: {type: Object as PropType<ScoreSet>, required: true},
    // The ClinVar control version the page resolved (histogram controlVersion), MM_YYYY form; enables
    // the ClinVar column in the custom CSV download.
    clinvarVersion: {type: String as PropType<string | null>, default: null}
  },

  setup(props) {
    const scoreSetRef = toRef(props, 'scoreSet')
    const hasCountsRef = toRef(props, 'hasCounts')
    const clinvarVersionRef = toRef(props, 'clinvarVersion')
    const downloads = useScoreSetDownloads({
      scoreSet: scoreSetRef,
      hasCounts: hasCountsRef,
      clinvarVersion: clinvarVersionRef
    })

    const routeProps = store.state.routeProps as {galaxyUrl: string; toolId: string; requestFromGalaxy: string}

    return {
      ...downloads,
      galaxyUrl: routeProps.galaxyUrl,
      toolId: routeProps.toolId,
      requestFromGalaxy: routeProps.requestFromGalaxy
    }
  },

  computed: {
    annotatedVariantDownloadOptions(): MenuItem[] {
      const options: MenuItem[] = []

      if (this.hasPathogenicityCalibrations) {
        options.push({
          label: 'Pathogenicity Statement',
          command: () => this.streamVariantAnnotations('pathogenicity-statement')
        })
      }
      if (this.hasFunctionalImpactCalibrations) {
        options.push({
          label: 'Functional Impact Statement',
          command: () => this.streamVariantAnnotations('functional-statement')
        })
      }

      options.push({
        label: 'Functional Study Result',
        command: () => this.streamVariantAnnotations('study-result')
      })

      return options
    }
  },

  beforeUnmount() {
    this.abortStream()
  },

  methods: {
    async handleCustomDownload() {
      try {
        await this.downloadMultipleData()
      } catch {
        this.$toast.add({severity: 'error', summary: 'Error downloading custom data', life: 3000})
      }
    },

    async sendToGalaxy(downloadType: string) {
      try {
        const baseApiUrl = `${config.apiBaseUrl}/score-sets/${this.scoreSet.urn}`
        let endpoint: string, outputType: string

        switch (downloadType) {
          case 'counts':
            endpoint = 'counts'
            outputType = 'table'
            break
          case 'scores':
            endpoint = 'scores'
            outputType = 'table'
            break
          case 'variantDetails':
            // /mapped-variants was retired in #743; /variant-details is the replacement (VRS pair + Cat-VRS + annotations),
            // streamed as NDJSON.
            endpoint = 'variant-details'
            outputType = 'json'
            break
          default:
            return
        }

        const apiUrl = `${baseApiUrl}/${endpoint}`
        const submitGalaxyUrl = `${this.galaxyUrl}?tool_id=${this.toolId}&maveData=${downloadType}&urn=${this.scoreSet.urn}&outputType=${outputType}&URL=${encodeURIComponent(apiUrl)}`
        window.location.href = submitGalaxyUrl
        localStorage.removeItem('galaxyUrl')
        localStorage.removeItem('toolId')
        localStorage.removeItem('requestFromGalaxy')
      } catch (error) {
        console.error('Error sending data:', error)
      }
    }
  }
})
</script>
