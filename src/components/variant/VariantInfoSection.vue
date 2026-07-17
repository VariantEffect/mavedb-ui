<template>
  <div>
    <h3 class="mave-section-title">Variant Information</h3>
    <MvDetailRow label="ClinGen allele name" :value="alleleName" />
    <MvDetailRow label="ClinGen allele ID">
      <a
        v-if="clingenAlleleId"
        class="text-link"
        :href="`https://reg.clinicalgenome.org/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=${clingenAlleleId}`"
        target="_blank"
        >{{ clingenAlleleId }}</a
      >
    </MvDetailRow>
    <MvDetailRow :label="`ClinVar allele ${clinvarAlleleIds.length > 1 ? 'IDs' : 'ID'}`">
      <template v-for="(cvId, i) in clinvarAlleleIds" :key="cvId">
        <a class="text-link" :href="clinvarVariantUrl({clinvarAlleleId: cvId}) ?? undefined" target="_blank">{{
          cvId
        }}</a>
        <template v-if="i < clinvarAlleleIds.length - 1">, </template>
      </template>
      <template v-if="clinvarAlleleIds.length === 0"><span class="text-text-muted">—</span></template>
    </MvDetailRow>
    <MvDetailRow label="Molecular consequence" term="consequence">
      <span v-if="molecularConsequence">{{ formatConsequence(molecularConsequence) }}</span>
      <span v-else class="italic text-text-muted">—</span>
    </MvDetailRow>
    <MvDetailRow :align="'flex-start'" :label="`Genomic ${genomicLocations.length > 1 ? 'locations' : 'location'}`">
      <table v-if="genomicLocations.length > 0" class="border-collapse">
        <tr v-for="(loc, i) in genomicLocations" :key="i">
          <td class="py-px pr-2.5 text-xs-plus font-mono font-semibold">
            chr{{ loc.chromosome }}:{{ Number(loc.start).toLocaleString() }}
          </td>
          <td>&nbsp;</td>
          <td class="py-px text-xs text-text-muted">({{ loc.referenceGenome }})</td>
        </tr>
      </table>
    </MvDetailRow>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvDetailRow from '@/components/common/MvDetailRow.vue'
import {clinvarVariantUrl} from '@/lib/clinvar-controls'
import {formatConsequence} from '@/lib/formats'

type GenomicLocation = {chromosome: string; start: string | number; referenceGenome: string}

export default defineComponent({
  name: 'VariantInfoSection',

  components: {
    MvDetailRow
  },

  props: {
    alleleName: {type: [String, null] as PropType<string | null>, default: null},
    clingenAlleleId: {type: [String, null] as PropType<string | null>, default: null},
    clinvarAlleleIds: {type: Array as PropType<string[]>, default: () => []},
    molecularConsequence: {type: [String, null] as PropType<string | null>, default: null},
    genomicLocations: {type: Array as PropType<GenomicLocation[]>, default: () => []}
  },

  methods: {
    clinvarVariantUrl,
    formatConsequence
  }
})
</script>
