<template>
  <div class="rounded-lg border border-border bg-white p-5">
    <h3 class="mave-section-title">Download files</h3>
    <div class="flex flex-wrap gap-2">
      <PButton
        :disabled="fileDownloadInProgress"
        icon="pi pi-download"
        label="Scores"
        severity="secondary"
        size="small"
        @click="reportingFailure('scores', () => downloadFile('scores'))" />
      <PButton
        v-if="hasCounts"
        :disabled="fileDownloadInProgress"
        icon="pi pi-download"
        label="Counts"
        severity="secondary"
        size="small"
        @click="reportingFailure('counts', () => downloadFile('counts'))" />
      <PButton
        v-if="!isMetaDataEmpty"
        icon="pi pi-download"
        label="Metadata"
        severity="secondary"
        size="small"
        @click="downloadMetadata" />
      <PButton
        :disabled="fileDownloadInProgress"
        icon="pi pi-download"
        label="Mapped Variants"
        severity="secondary"
        size="small"
        @click="reportingFailure('mapped variants', downloadMappedVariantsFile)" />

      <SplitButton
        :button-props="{class: 'p-button-sm p-button-secondary'}"
        :disabled="fileDownloadInProgress"
        label="Annotated Variants"
        :menu-button-props="{class: 'p-button-sm p-button-secondary'}"
        :model="annotatedVariantDownloadOptions"
        @click="
          annotatedVariantDownloadOptions[0]?.command?.({
            originalEvent: $event,
            item: annotatedVariantDownloadOptions[0]
          })
        " />

      <PButton
        :disabled="fileDownloadInProgress"
        icon="pi pi-sliders-h"
        label="Custom Data"
        severity="secondary"
        size="small"
        @click="customDialogVisible = true" />
    </div>

    <!-- One bar for every download on this panel. Determinate only for the VA-Spec streams, which can
         count records; see `fileDownloadProgress` in use-score-set-downloads. -->
    <div v-if="fileDownloadInProgress" aria-live="polite" class="mt-3 flex items-center gap-2">
      <ProgressBar
        class="grow"
        :mode="fileDownloadProgress === null ? 'indeterminate' : 'determinate'"
        style="height: 1.2em"
        :value="fileDownloadProgress ?? 0" />
      <span class="whitespace-nowrap text-xs text-text-muted">
        Preparing {{ fileDownloadLabel }}…
        <template v-if="fileDownloadProgress !== null">{{ fileDownloadProgress }}%</template>
      </span>
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

    <MvCsvColumnDialog
      v-model:visible="customDialogVisible"
      :extra-options="extraDownloadOptions"
      header="Custom data download"
      kind="scoreSet"
      :urn="scoreSet.urn"
      @confirm="handleCustomDownload" />
  </div>
</template>

<script lang="ts">
import {defineComponent, toRef, type PropType} from 'vue'
import PButton from 'primevue/button'
import type {MenuItem} from 'primevue/menuitem'
import ProgressBar from 'primevue/progressbar'
import SplitButton from 'primevue/splitbutton'

import MvCsvColumnDialog from '@/components/common/MvCsvColumnDialog.vue'
import {useScoreSetDownloads} from '@/composables/use-score-set-downloads'
import config from '@/config'
import type {components} from '@/schema/openapi'
import store from '@/store'

type ScoreSet = components['schemas']['ScoreSet']

export default defineComponent({
  name: 'ScoreSetDownloads',

  components: {MvCsvColumnDialog, PButton, ProgressBar, SplitButton},

  props: {
    hasCounts: {type: Boolean, default: false},
    hasPathogenicityCalibrations: {type: Boolean, default: false},
    hasFunctionalImpactCalibrations: {type: Boolean, default: false},
    isMetaDataEmpty: {type: Boolean, default: true},
    scoreSet: {type: Object as PropType<ScoreSet>, required: true}
  },

  setup(props) {
    const downloads = useScoreSetDownloads({scoreSet: toRef(props, 'scoreSet')})

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
          command: () =>
            this.reportingFailure('Pathogenicity Statement', () =>
              this.streamVariantAnnotations('pathogenicity-statement', 'Pathogenicity Statement')
            )
        })
      }
      if (this.hasFunctionalImpactCalibrations) {
        options.push({
          label: 'Functional Impact Statement',
          command: () =>
            this.reportingFailure('Functional Impact Statement', () =>
              this.streamVariantAnnotations('functional-statement', 'Functional Impact Statement')
            )
        })
      }

      options.push({
        label: 'Functional Study Result',
        command: () =>
          this.reportingFailure('Functional Study Result', () =>
            this.streamVariantAnnotations('study-result', 'Functional Study Result')
          )
      })

      return options
    }
  },

  beforeUnmount() {
    this.abortStream()
  },

  methods: {
    /**
     * Run a download, reporting any failure as a toast.
     *
     * Without this a rejection from a template `@click` is an unhandled promise, which is how a truncated
     * or out-of-memory annotation download used to surface: a console error and nothing in the UI.
     */
    async reportingFailure(what: string, download: () => Promise<unknown>) {
      try {
        await download()
      } catch (error: unknown) {
        this.$toast.add({
          severity: 'error',
          summary: `Could not download ${what}`,
          detail: error instanceof Error ? error.message : undefined,
          life: 6000
        })
      }
    },

    async handleCustomDownload(selection: {namespaces: string[]; extras: string[]}) {
      await this.reportingFailure('custom data', () => this.downloadMultipleData(selection))
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

<style scoped>
/*
 * PrimeVue animates the determinate fill with `transition: width 1s ease-in-out` from 0%. A download that
 * finishes quickly reaches 100% and unmounts the bar before the animation lands, leaving a fifth-full bar
 * beside a label reading 100% — and each new value restarts the animation, so the fill lags throughout.
 * Progress arrives in jumps of a whole chunk anyway, so track the value exactly rather than easing to it.
 */
:deep(.p-progressbar-determinate .p-progressbar-value) {
  transition: none;
}
</style>
