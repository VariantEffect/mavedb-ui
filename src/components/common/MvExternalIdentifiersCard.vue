<template>
  <div class="mave-gradient-bar relative overflow-hidden rounded-lg border border-border bg-white p-5">
    <h3 class="mave-section-title">External Identifiers</h3>
    <div class="flex flex-col gap-3">
      <div>
        <div class="mb-1 text-sm font-bold text-text-secondary">DOIs</div>
        <ul v-if="doiIdentifiers && doiIdentifiers.length > 0" class="list-inside list-disc text-sm">
          <li v-for="(doi, i) in doiIdentifiers" :key="i" class="py-0.5 pl-4">
            <a class="text-link" :href="doi.url" rel="noopener noreferrer" target="_blank">{{ doi.identifier }}</a>
          </li>
        </ul>
        <p v-else class="pl-4 text-sm italic text-text-muted">No associated DOIs</p>
      </div>
      <div>
        <div class="mb-1 text-sm font-bold text-text-secondary">Raw reads</div>
        <ul v-if="rawReadIdentifiers && rawReadIdentifiers.length > 0" class="list-inside list-disc text-sm">
          <li v-for="(read, i) in rawReadIdentifiers" :key="i" class="py-0.5 pl-4">
            <a class="text-link" :href="read.url" rel="noopener noreferrer" target="_blank">{{ read.identifier }}</a>
          </li>
        </ul>
        <p v-else class="pl-4 text-sm italic text-text-muted">No associated raw reads</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

interface Identifier {
  identifier: string
  url: string
}

export default defineComponent({
  name: 'MvExternalIdentifiersCard',

  props: {
    doiIdentifiers: {type: Array as PropType<Identifier[]>, default: () => []},
    rawReadIdentifiers: {type: Array as PropType<Identifier[]>, default: () => []}
  }
})
</script>
