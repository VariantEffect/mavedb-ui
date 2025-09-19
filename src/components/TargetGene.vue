<template>
  <div v-if="targetGene.name"><strong>Name:</strong> {{ targetGene.name }}</div>
  <div v-if="targetGene.category"><strong>Type:</strong> {{ textForTargetGeneCategory(targetGene.category) }}</div>

  <div v-if="targetGene.targetAccession?.accession" style="word-break: break-word">
    <div v-if="targetGene.targetAccession?.assembly">
      <strong>Assembly:</strong> {{ targetGene.targetAccession.assembly }}
    </div>
    <div v-if="targetGene.targetAccession?.gene"><strong>HGNC:</strong> {{ targetGene.targetAccession.gene }}</div>
    <strong>Accession Number: </strong>
    {{ targetGene.targetAccession.accession }}
  </div>

  <div v-if="targetGene.targetSequence?.taxonomy?.code">
    <div v-if="targetGene.targetSequence.taxonomy?.url">
      <strong>Taxonomy ID:</strong> &nbsp;<a :href="`${targetGene.targetSequence.taxonomy.url}`" target="blank">{{
        targetGene.targetSequence.taxonomy.code
      }}</a>
    </div>
  </div>
  <div v-if="targetGene.targetSequence?.sequence" style="word-break: break-word">
    <div v-if="targetGene.targetSequence.taxonomy?.organismName">
      <strong>Organism:</strong> {{ targetGene.targetSequence.taxonomy.organismName }}
    </div>
    <div v-if="targetGene.targetSequence.taxonomy?.commonName">
      <strong>Common Name:</strong> {{ targetGene.targetSequence.taxonomy.commonName }}
    </div>
    <div v-if="targetGene.id"><strong>Target ID:</strong> {{ targetGene.id }}</div>
    <strong>Reference sequence: </strong>
    <template v-if="targetGene.targetSequence.sequence.length >= 500">
      <template v-if="showingFullSequence">{{ targetGene.targetSequence.sequence }}</template>
      <template v-else>{{ targetGene.targetSequence.sequence.substring(0, 500) + '....' }} </template>
      <Button
        v-if="showingFullSequence"
        class="p-button-text p-button-sm p-button-info"
        @click="showFullSequence(false)"
        >Show less</Button
      >
      <Button v-else class="p-button-text p-button-sm p-button-info" @click="showFullSequence(true)"
        >Show more</Button
      > </template
    ><template v-else>{{ targetGene.targetSequence.sequence }}</template>
  </div>
  <!--One for loop can't handle the order so separating them into three parts.-->
  <div v-if="targetGene.externalIdentifiers?.[0]?.identifier">
    <div v-for="i in targetGene.externalIdentifiers" :key="i">
      <div v-if="i.identifier.dbName === 'UniProt'">
        <strong>UniProt:</strong> {{ i.identifier.identifier }}
        <span v-if="i.offset != 0"> with offset {{ i.offset }}</span>
      </div>
    </div>
    <div v-for="i in targetGene.externalIdentifiers" :key="i">
      <div v-if="i.identifier.dbName === 'RefSeq'">
        <strong>RefSeq:</strong> {{ i.identifier.identifier }}
        <span v-if="i.offset != 0"> with offset {{ i.offset }}</span>
      </div>
    </div>
    <div v-for="i in targetGene.externalIdentifiers" :key="i">
      <div v-if="i.identifier.dbName === 'Ensembl'">
        <strong>Ensembl:</strong> {{ i.identifier.identifier }}
        <span v-if="i.offset != 0"> with offset {{ i.offset }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Button from 'primevue/button'
import {PropType, ref} from 'vue'

import {textForTargetGeneCategory} from '@/lib/target-genes'
import type {components} from '@/schema/openapi'

defineProps({
  targetGene: {
    type: Object as PropType<components['schemas']['ScoreSet']['targetGenes'][number]>,
    required: true
  }
})

const showingFullSequence = ref(false)

function showFullSequence(visible: boolean) {
  showingFullSequence.value = visible
}
</script>
