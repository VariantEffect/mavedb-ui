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
      <PButton
        icon="pi pi-download"
        label="Mapped Variants"
        severity="secondary"
        size="small"
        @click="downloadMappedVariantsFile"
      />

      <div class="relative inline-block">
        <SplitButton
          :button-props="{class: 'p-button-sm p-button-secondary'}"
          :disabled="annotatedDownloadInProgress"
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
        <div v-if="annotatedDownloadInProgress" class="absolute inset-x-0 top-full mt-1">
          <ProgressBar show-value style="height: 1.5em" :value="annotatedDownloadProgress" />
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
        <PButton label="Mapped Variants" severity="secondary" size="small" @click="sendToGalaxy('mappedVariants')" />
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
    hasPrimaryCalibration: {type: Boolean, default: false},
    isMetaDataEmpty: {type: Boolean, default: true},
    scoreSet: {type: Object as PropType<ScoreSet>, required: true}
  },

  setup(props) {
    const scoreSetRef = toRef(props, 'scoreSet')
    const hasCountsRef = toRef(props, 'hasCounts')
    const downloads = useScoreSetDownloads({scoreSet: scoreSetRef, hasCounts: hasCountsRef})

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

      if (this.hasPrimaryCalibration) {
        options.push({
          label: 'Pathogenicity Evidence Line',
          command: () => this.streamVariantAnnotations('pathogenicity-evidence-line')
        })
        options.push({
          label: 'Functional Impact Statement',
          command: () => this.streamVariantAnnotations('functional-impact-statement')
        })
      }

      options.push({
        label: 'Functional Impact Study Result',
        command: () => this.streamVariantAnnotations('functional-study-result')
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
          case 'mappedVariants':
            endpoint = 'mapped-variants'
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
