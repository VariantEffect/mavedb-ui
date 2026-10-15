<template>
  <div>
    <!-- Column headers (tablet+). A source release is stated here once when every row shares it; otherwise
         each cell keeps its own, since one page can mix releases. -->
    <div class="ledger-grid mave-label hidden tablet:grid border-b border-border-light px-5 py-2">
      <span>Variant</span>
      <span>
        <span v-key-term="'consequence'">Molecular consequence</span>
        <span v-if="sharedReleases.vep" class="block font-normal normal-case tracking-normal"
          >VEP {{ sharedReleases.vep }}</span
        >
      </span>
      <span>
        <span v-key-term="'population'">Population frequency</span>
        <span v-if="sharedReleases.gnomad" class="block font-normal normal-case tracking-normal"
          >gnomAD {{ sharedReleases.gnomad }}</span
        >
      </span>
      <span>
        <span v-key-term="'clinical'">Clinical significance</span>
        <span v-if="sharedReleases.clinvar" class="block font-normal normal-case tracking-normal"
          >ClinVar {{ formatClinvarVersion(sharedReleases.clinvar) }}</span
        >
      </span>
    </div>

    <!-- A protein-level selection assayed none of these rows but the protein change they all encode, so the
         selection's highlight and tag sit on a band above them rather than on any one row. -->
    <div
      v-if="proteinSelected"
      class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border-light bg-sage-light/60 px-4 py-2 text-xs-plus text-text-secondary shadow-[inset_3px_0_0_var(--color-sage)] tablet:px-5"
    >
      <span v-key-term="'relationship'" class="mave-tag" :class="selectedMeasurement.class">{{
        selectedMeasurement.label
      }}</span>
      <span v-if="anchorIsProtein" v-key-term="'relationship'"
        >This protein change, encoded by every variant below</span
      >
      <span v-else
        ><span class="font-mono text-xs text-text-primary">{{ protein?.hgvs ?? 'The protein change' }}</span
        >, <span v-key-term="'relationship'">the protein change every variant below encodes</span></span
      >
    </div>

    <!-- Nucleotide-level rows only: gnomAD, ClinVar and VEP never annotate protein alleles, so a protein row could
         only repeat the rows below it. Your variant first; the row the selected measurement assayed is highlighted. -->
    <template v-for="group in rows" :key="group.key">
      <h4
        v-if="group === firstSibling && subject"
        class="border-b border-border-light bg-bg px-4 py-2 text-xs-plus text-text-secondary tablet:px-5"
      >
        <span v-key-term="'relationship'" class="font-semibold text-text-primary"
          >Other nucleotide changes that encode the same protein change</span
        ><template v-if="protein"
          >,
          <router-link
            v-if="protein.clingenAlleleId"
            class="font-mono text-xs text-link hover:underline"
            :to="variantRoute(protein.clingenAlleleId)"
            >{{ protein.hgvs }}</router-link
          ><span v-else class="font-mono text-xs text-text-primary">{{ protein.hgvs }}</span></template
        >
      </h4>
      <div
        class="ledger-grid block border-b border-border-light px-4 py-3 last:border-b-0 tablet:grid tablet:px-5"
        :class="group.measured ? 'bg-sage-light/60 shadow-[inset_3px_0_0_var(--color-sage)]' : ''"
      >
        <div class="min-w-0">
          <!-- Your variant (X) is the page you're already on; a related variant's HGVS links to its own page. -->
          <router-link
            v-if="group !== subject && group.clingenLinks.length > 0"
            class="break-all font-mono text-xs-plus font-semibold text-link hover:underline"
            :title="allHgvsTitle(group)"
            :to="variantRoute(group.clingenLinks[0])"
            >{{ titleMember(group)?.hgvs || group.clingenLinks[0] }}</router-link
          >
          <div
            v-else
            class="break-all font-mono text-xs-plus font-semibold text-text-primary"
            :title="allHgvsTitle(group)"
          >
            {{ titleMember(group)?.hgvs || '—' }}
          </div>
          <div v-if="group === subject || group.measured" class="mt-1 flex flex-wrap items-center gap-1">
            <span v-if="group === subject" v-key-term="'relationship'" class="mave-tag" :class="yourVariant.class">{{
              yourVariant.label
            }}</span>
            <span
              v-if="group.measured"
              v-key-term="'relationship'"
              class="mave-tag"
              :class="selectedMeasurement.class"
              >{{ selectedMeasurement.label }}</span
            >
          </div>
        </div>
        <VariantConsequenceStat
          class="mt-2 tablet:mt-0"
          plain
          :show-release="!sharedReleases.vep"
          :vep="group.coalescedAnnotations?.vep ?? null"
        >
          <template #label
            ><span :class="mobileLabelClass"
              >Molecular consequence<template v-if="sharedReleases.vep">
                · <span class="normal-case tracking-normal">VEP {{ sharedReleases.vep }}</span></template
              ></span
            ></template
          >
        </VariantConsequenceStat>
        <MvGnomadCell
          class="mt-2 tablet:mt-0"
          :gnomad="group.coalescedAnnotations?.gnomad ?? null"
          :show-release="!sharedReleases.gnomad"
        >
          <template #label
            ><span :class="mobileLabelClass"
              >Population frequency<template v-if="sharedReleases.gnomad">
                · <span class="normal-case tracking-normal">gnomAD {{ sharedReleases.gnomad }}</span></template
              ></span
            ></template
          >
        </MvGnomadCell>
        <VariantClinvarStat
          :alleles="alleles"
          :annotations="annotations"
          :assay-level="groupLevel(group)"
          :assay-level-digest="digestsOf(group)"
          class="mt-2 tablet:mt-0"
          :clinvar-version="clinvarVersion"
          plain
          :show-release="!sharedReleases.clinvar"
          :show-underlying-popover="false"
        >
          <template #label
            ><span :class="mobileLabelClass"
              >Clinical significance<template v-if="sharedReleases.clinvar">
                ·
                <span class="normal-case tracking-normal"
                  >ClinVar {{ formatClinvarVersion(sharedReleases.clinvar) }}</span
                ></template
              ></span
            ></template
          >
        </VariantClinvarStat>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvGnomadCell from '@/components/variant/MvGnomadCell.vue'
import VariantConsequenceStat from '@/components/variant/VariantConsequenceStat.vue'
import VariantClinvarStat from '@/components/variant/VariantClinvarStat.vue'
import {type AlleleGroup, sharedReleases, titleMember} from '@/lib/allele-grouping'
import {formatClinvarVersion} from '@/lib/clinvar-controls'
import {shortHgvs} from '@/lib/measurement-groups'
import {assayLevelDisplay, SELECTED_MEASUREMENT_TAG, YOUR_VARIANT_TAG} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']
type SequenceLevel = components['schemas']['SequenceLevel']

/**
 * Clinical/population table over the page variant's nucleotide-level family across all of its measurements: your
 * variant's row, then other nucleotide changes that encode the same protein change (or, on a protein-change page, every
 * nucleotide change that encodes it). Rows never change with the selection; the one the selected measurement assayed
 * takes the measurement table's sage accent and a Selected measurement tag. Cells are molecular consequence, then
 * {@link MvGnomadCell}/{@link VariantClinvarStat} keyed to that group's own digests.
 */
export default defineComponent({
  name: 'MvAlleleLedger',

  components: {
    MvGnomadCell,
    VariantConsequenceStat,
    VariantClinvarStat
  },

  props: {
    // Every allele group across the page's loaded measurements.
    groups: {type: Array as PropType<AlleleGroup[]>, default: () => []},
    // Raw alleles/annotations merged across the page's loaded measurement details — the stat components resolve
    // each group's subject out of these maps by digest.
    alleles: {type: Object as PropType<Record<string, AlleleIdentity>>, default: () => ({})},
    annotations: {type: Object as PropType<Record<string, AlleleAnnotations>>, default: () => ({})},
    clinvarVersion: {type: [String, null] as PropType<string | null>, default: null},
    // Whether the page's variant is a protein change (a `PA` anchor), in which case every row encodes it.
    anchorIsProtein: {type: Boolean, default: false},
    // The selected measurement's URN. Carried as the `?variant=` highlight on each allele's link-out.
    variantUrn: {type: [String, null] as PropType<string | null>, default: null}
  },

  data() {
    return {
      yourVariant: YOUR_VARIANT_TAG,
      selectedMeasurement: SELECTED_MEASUREMENT_TAG,
      // Per-cell labels (with any shared release) for the stacked mobile layout; tablet+ column headers carry
      // them instead.
      mobileLabelClass: 'mave-label w-fit tablet:hidden'
    }
  },

  computed: {
    // Rows in a fixed order that never depends on the selection: your variant, then the other nucleotide changes.
    // Never collapsed: the genetic code caps a protein change at six codons, so the list stays short.
    rows(): AlleleGroup[] {
      return this.groups
        .filter((group) => !this.isProtein(group))
        .sort((a, b) => Number(b.pageRoot) - Number(a.pageRoot))
    },
    // The selected measurement assayed the protein change, which has no row of its own here.
    proteinSelected(): boolean {
      return this.groups.some((group) => this.isProtein(group) && group.measured)
    },
    subject(): AlleleGroup | null {
      return this.rows.find((group) => group.pageRoot) ?? null
    },
    firstSibling(): AlleleGroup | null {
      return this.rows.find((group) => group !== this.subject) ?? null
    },
    // The protein change shared by every row, linked to its own page.
    protein(): {hgvs: string; clingenAlleleId: string | null} | null {
      const member = this.groups.find((group) => this.isProtein(group))?.members[0]
      if (!member?.hgvs) return null
      return {hgvs: shortHgvs(member.hgvs), clingenAlleleId: member.clingenAlleleId ?? null}
    },
    // Each source's release, when every row that has a record agrees on one; null when rows differ (or none
    // has a record), in which case cells keep their own "As of" lines.
    sharedReleases(): ReturnType<typeof sharedReleases> {
      return sharedReleases(this.rows, this.clinvarVersion)
    }
  },

  methods: {
    formatClinvarVersion,
    variantRoute(clingenAlleleId: string) {
      return {
        name: 'variant',
        params: {clingenAlleleId},
        query: this.variantUrn ? {variant: this.variantUrn} : {}
      }
    },
    // String-only members have no allele, so no records to resolve.
    digestsOf(group: AlleleGroup): string[] {
      return group.members.flatMap((m) => (m.digest != null ? [m.digest] : []))
    },
    // The representative level for a group's stat resolution — the title allele's level (cDNA-preferred).
    groupLevel(group: AlleleGroup): SequenceLevel | null {
      const members = group.members.filter((m) => m.digest != null)
      return (titleMember({members})?.level ?? null) as SequenceLevel | null
    },
    titleMember,
    allHgvsTitle(group: AlleleGroup): string {
      return group.members.map((m) => `${this.levelLabel(m.level)}: ${m.hgvs || '—'}`).join('  ·  ')
    },
    // Protein alleles carry no gnomAD, ClinVar or VEP records of their own; see the worker's annotation jobs.
    isProtein(group: AlleleGroup): boolean {
      return group.members.every((m) => m.level === 'protein')
    },
    levelLabel(level: string | null | undefined): string {
      return level ? assayLevelDisplay(level).label : '—'
    }
  }
})
</script>

<style>
/* Unscoped so the header and every row share one grid. Tablet+ only; rows stack below that. */
.ledger-grid {
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.1fr);
  column-gap: 1.25rem;
}
</style>
