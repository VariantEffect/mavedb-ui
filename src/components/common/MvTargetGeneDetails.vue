<template>
  <div class="flex flex-col">
    <!-- Accession fields -->
    <MvDetailRow v-if="gene.targetAccession?.accession" label="Accession" :value="gene.targetAccession.accession" />
    <MvDetailRow v-if="gene.targetAccession?.assembly" label="Assembly" :value="gene.targetAccession.assembly" />
    <MvDetailRow v-if="gene.targetAccession?.gene" label="HGNC" :value="gene.targetAccession.gene" />

    <!-- Taxonomy group -->
    <template v-if="hasTaxonomy">
      <MvDetailRow label="Taxonomy">
        <a
          v-if="gene.targetSequence.taxonomy.url"
          :href="gene.targetSequence.taxonomy.url"
          rel="noopener noreferrer"
          target="_blank"
        >
          {{ gene.targetSequence.taxonomy.code }}
        </a>
        <template v-else>{{ gene.targetSequence.taxonomy.code }}</template>
        <template v-if="gene.targetSequence.taxonomy.organismName">
          &mdash; {{ gene.targetSequence.taxonomy.organismName }}
          <span v-if="gene.targetSequence.taxonomy.commonName" class="text-text-muted">
            ({{ gene.targetSequence.taxonomy.commonName }})
          </span>
        </template>
      </MvDetailRow>
    </template>

    <!-- External identifiers group -->
    <MvDetailRow v-if="gene.externalIdentifiers?.length" align="flex-start" label="External IDs">
      <div class="flex flex-col gap-0.5">
        <div v-for="ext in gene.externalIdentifiers" :key="ext.identifier?.identifier" class="text-text-primary">
          <span class="font-medium text-text-muted">{{ ext.identifier?.dbName }}:</span>
          {{ ext.identifier?.identifier
          }}<span v-if="ext.offset" class="text-text-muted"> (offset {{ ext.offset }})</span>
        </div>
      </div>
    </MvDetailRow>

    <!-- Sequence viewer -->
    <MvDetailRow v-if="gene.targetSequence?.sequence" align="flex-start" label="Sequence">
      <div class="w-full overflow-hidden rounded border border-border">
        <div class="flex items-center justify-between border-b border-border-light bg-surface px-3 py-1.5">
          <span class="text-xs-plus text-text-muted">
            {{ gene.targetSequence.sequence.length.toLocaleString() }} residues
          </span>
          <button
            class="inline-flex cursor-pointer items-center gap-1 text-xs-plus font-medium text-sage hover:text-sage-dark"
            @click="copySequence"
          >
            <i class="pi text-[10px]" :class="copied ? 'pi-check' : 'pi-copy'" />
            {{ copied ? 'Copied' : 'Copy' }}
          </button>
        </div>
        <pre
          class="max-h-[120px] overflow-auto whitespace-pre-wrap break-all px-3 py-2 font-mono text-xs-minus leading-relaxed text-text-secondary"
          >{{ gene.targetSequence.sequence }}</pre
        >
      </div>
    </MvDetailRow>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue'

import MvDetailRow from '@/components/common/MvDetailRow.vue'

export default defineComponent({
  name: 'MvTargetGeneDetails',

  components: {MvDetailRow},

  props: {
    gene: {type: Object, required: true}
  },

  data() {
    return {
      copied: false
    }
  },

  computed: {
    hasTaxonomy(): boolean {
      return !!(this.gene.targetSequence?.taxonomy?.code || this.gene.targetSequence?.taxonomy?.organismName)
    }
  },

  methods: {
    async copySequence() {
      const seq = this.gene.targetSequence?.sequence
      if (!seq) return
      await navigator.clipboard.writeText(seq)
      this.copied = true
      setTimeout(() => {
        this.copied = false
      }, 1500)
    }
  }
})
</script>
