<template>
  <div class="flex min-w-0 flex-col gap-1.5 px-5 py-3 hover:bg-gray-50">
    <router-link class="block text-link no-underline" :to="{name: 'experiment', params: {urn: experiment.urn}}">
      <div class="text-xs-minus font-medium">{{ experiment.urn }}</div>
      <div class="text-md font-semibold leading-snug">{{ experiment.title || 'Untitled experiment' }}</div>
    </router-link>
    <p v-if="experiment.shortDescription && showDescription" class="text-sm leading-snug text-text-secondary">
      {{ experiment.shortDescription }}
    </p>
    <div v-if="showMeta" class="mt-2 flex flex-wrap items-center gap-1.5">
      <span v-if="numScoreSets != null" class="whitespace-nowrap text-xs text-text-muted">
        {{ numScoreSets }} score {{ numScoreSets === 1 ? 'set' : 'sets' }}
      </span>
      <span v-if="experiment.publishedDate" class="ml-auto whitespace-nowrap text-xs text-text-muted">
        Published {{ formattedDate }}
      </span>
      <span v-else class="ml-auto whitespace-nowrap text-xs text-text-muted"> Unpublished </span>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import {components} from '@/schema/openapi'

type FullExperiment = components['schemas']['Experiment']
type ShortExperiment = components['schemas']['ShortExperiment']
type Experiment = FullExperiment | ShortExperiment

export default defineComponent({
  name: 'MvExperimentRow',

  props: {
    experiment: {
      type: Object as PropType<Experiment>,
      required: true
    },
    showDescription: {
      type: Boolean,
      default: true
    },
    showMeta: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    numScoreSets(): number | null {
      return 'numScoreSets' in this.experiment ? ((this.experiment as FullExperiment).numScoreSets ?? null) : null
    },
    formattedDate(): string {
      if (!this.experiment.publishedDate) return ''
      const date = new Date(this.experiment.publishedDate)
      return date.toLocaleDateString('en-US', {month: 'short', year: 'numeric'})
    }
  }
})
</script>
