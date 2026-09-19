<template>
  <div>
    <div class="mb-1 flex flex-wrap items-baseline gap-x-2">
      <h3 class="mave-section-title !mb-0">Clinical &amp; population data</h3>
    </div>
    <!-- Frame heading: this block is anchored on the *measured* allele, not the page header's looked-up
         variant — two reference points, one screen. Naming it here keeps the per-row badges short instead
         of each spelling out "…than the measured allele" (mirrors the measurement carousel's own anchor
         heading). -->
    <p class="mb-3 text-xs-minus text-text-muted">How each allele relates to what this result measured:</p>

    <!-- One card per allele group, uniform except for role badge and emphasis: this variant (X) leads, the
         measured allele (Y) follows, everything else collapses underneath. -->
    <div class="flex flex-col gap-2">
      <div
        v-for="entry in entries"
        v-show="entry.role !== 'other' || expanded || !hasPinnedEntry"
        :key="entry.group.key"
        class="rounded-md px-3.5 py-3"
        :class="cardClass(entry.role)"
      >
        <div class="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            v-key-term="entry.role === 'page' ? 'this-variant' : 'confidence'"
            class="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.3px]"
            :class="roleBadge(entry).class"
            >{{ roleBadge(entry).label }}</span
          >
          <span
            v-key-term="'assay-level'"
            class="inline-block rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.3px]"
            :class="levelClass(titleMember(entry.group)?.level)"
            >{{ levelLabel(titleMember(entry.group)?.level) }}</span
          >
          <span class="font-mono text-xs-plus font-semibold text-text-primary" :title="allHgvsTitle(entry.group)">{{
            titleMember(entry.group)?.hgvs || '—'
          }}</span>
          <!-- This variant (X) is the page you're already on — no link out. Related alleles link to their
               own variant page. -->
          <router-link
            v-for="caid in entry.role === 'page' ? [] : entry.group.clingenLinks"
            :key="caid"
            class="ml-auto inline-flex items-center gap-0.5 font-mono text-xs font-semibold text-link hover:underline"
            :to="{name: 'variant', params: {clingenAlleleId: caid}, query: variantUrn ? {variant: variantUrn} : {}}"
          >
            {{ caid }}<i class="pi pi-arrow-up-right text-xs" />
          </router-link>
        </div>

        <div class="grid grid-cols-1 gap-x-8 gap-y-4 tablet:grid-cols-3">
          <VariantConsequenceStat plain :vep="entry.group.coalescedAnnotations?.vep ?? null">
            <template #label>
              <span
                v-key-term="'consequence'"
                class="w-fit text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]"
                >Molecular consequence</span
              >
            </template>
          </VariantConsequenceStat>
          <VariantGnomadStat
            :alleles="alleles"
            :annotations="annotations"
            :assay-gnomad="entry.group.coalescedAnnotations?.gnomad ?? null"
            :assay-level="groupLevel(entry.group)"
            :assay-level-digest="digestsOf(entry.group)"
            plain
            :show-underlying-popover="false"
          >
            <template #label>
              <span
                v-key-term="'population'"
                class="w-fit text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]"
                >Population frequency</span
              >
            </template>
          </VariantGnomadStat>
          <VariantClinvarStat
            :alleles="alleles"
            :annotations="annotations"
            :assay-level="groupLevel(entry.group)"
            :assay-level-digest="digestsOf(entry.group)"
            :clinvar-version="clinvarVersion"
            plain
            :show-underlying-popover="false"
          >
            <template #label>
              <span
                v-key-term="'clinical'"
                class="w-fit text-[10px] font-semibold uppercase tracking-[0.3px] text-[#aaa]"
                >Clinical significance</span
              >
            </template>
          </VariantClinvarStat>
        </div>
      </div>
    </div>

    <button
      v-if="otherGroups.length"
      class="mt-2 cursor-pointer border-none bg-transparent text-xs font-semibold text-link hover:underline"
      type="button"
      @click="expanded = !expanded"
    >
      {{
        expanded
          ? 'Hide other related alleles'
          : `Show ${otherGroups.length} other related ${otherGroups.length === 1 ? 'allele' : 'alleles'}`
      }}
    </button>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import VariantConsequenceStat from '@/components/variant/VariantConsequenceStat.vue'
import VariantGnomadStat from '@/components/variant/VariantGnomadStat.vue'
import VariantClinvarStat from '@/components/variant/VariantClinvarStat.vue'
import {type AlleleGroup, type AlleleMember, confidenceBadge} from '@/lib/allele-grouping'
import {assayLevelDisplay} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']
type SequenceLevel = components['schemas']['SequenceLevel']

type LedgerRole = 'page' | 'measured' | 'other'
type LedgerEntry = {group: AlleleGroup; role: LedgerRole}

/**
 * Combined clinical/population + related-alleles ledger. Presents the whole equivalence class in one
 * place, at every level, with a *uniform* card per allele group: this variant (X) leads, the measured
 * allele (Y) follows when the selection assayed a different allele, and the rest collapse underneath.
 * Every card renders the same three-cell facts grid — molecular consequence, then
 * {@link VariantGnomadStat}/{@link VariantClinvarStat} keyed to that group's own digests — mirroring
 * {@link VariantDetailPanel}'s facts grid on the score-set page, so the only thing split out elsewhere on
 * this page is the functional evidence itself.
 */
export default defineComponent({
  name: 'MvAlleleLedger',

  components: {
    VariantConsequenceStat,
    VariantGnomadStat,
    VariantClinvarStat
  },

  props: {
    // Every allele group in the selected measurement's equivalence class.
    groups: {type: Array as PropType<AlleleGroup[]>, default: () => []},
    // Raw alleles/annotations from the selected measurement detail — the stat components resolve each
    // group's subject out of these maps by digest.
    alleles: {type: Object as PropType<Record<string, AlleleIdentity>>, default: () => ({})},
    annotations: {type: Object as PropType<Record<string, AlleleAnnotations>>, default: () => ({})},
    clinvarVersion: {type: [String, null] as PropType<string | null>, default: null},
    // The selected measurement's URN. Carried as the `?variant=` highlight on each allele's link-out.
    variantUrn: {type: [String, null] as PropType<string | null>, default: null}
  },

  data() {
    return {expanded: false}
  },

  computed: {
    // The page variant's own group, when the selected result's envelope carries it at all. Null is a real
    // state, not a defect: a result reached through the page's ClinGen id may not include that exact allele
    // among its own alleles.
    pageGroup(): AlleleGroup | null {
      return this.groups.find((g) => g.pageRoot) ?? null
    },
    // The measured allele's group, pinned only when it differs from the page variant's (otherwise the lead
    // card already is it).
    pinnedMeasured(): AlleleGroup | null {
      const measured = this.groups.find((g) => g.measured) ?? null
      return measured && measured !== this.pageGroup ? measured : null
    },
    // Everything that is neither the page variant nor the pinned measured allele.
    otherGroups(): AlleleGroup[] {
      return this.groups.filter((g) => g !== this.pageGroup && g !== this.pinnedMeasured)
    },
    // The ordered render list: page variant, then the measured allele, then the rest (collapsed). Roles
    // drive badge + emphasis, and are assigned from what a group *is* — a group is never given the `page`
    // role as a stand-in. When the page variant is absent the list simply leads with the measured allele
    // under its own badge, rather than labelling it "This variant" and asserting an identity it lacks.
    entries(): LedgerEntry[] {
      const list: LedgerEntry[] = []
      if (this.pageGroup) list.push({group: this.pageGroup, role: 'page'})
      if (this.pinnedMeasured) list.push({group: this.pinnedMeasured, role: 'measured'})
      for (const g of this.otherGroups) list.push({group: g, role: 'other'})
      return list
    },
    // Whether any entry is pinned. When nothing is (no page variant and no measured allele in this
    // envelope), the collapsed rows are all there is, so they must not start hidden behind the toggle.
    hasPinnedEntry(): boolean {
      return this.pageGroup != null || this.pinnedMeasured != null
    }
  },

  methods: {
    digestsOf(group: AlleleGroup): string[] {
      return group.members.map((m) => m.digest)
    },
    // The representative level for a group's stat resolution — the title member's level (cDNA-preferred).
    groupLevel(group: AlleleGroup): SequenceLevel | null {
      return (this.titleMember(group)?.level ?? null) as SequenceLevel | null
    },
    // The single member whose HGVS titles the card. A projection pair holds the same allele in two
    // coordinate frames (genomic + cDNA). Lead with cDNA (community-preferred), then protein, then genomic.
    titleMember(group: AlleleGroup): AlleleMember | null {
      return (
        group.members.find((m) => m.level === 'cdna') ??
        group.members.find((m) => m.level === 'protein') ??
        group.members[0] ??
        null
      )
    },
    allHgvsTitle(group: AlleleGroup): string {
      return group.members.map((m) => `${this.levelLabel(m.level)}: ${m.hgvs || '—'}`).join('  ·  ')
    },
    // "page" gets its own fixed subject badge — deliberately distinct from the confidence-axis colors used
    // everywhere else, so "This variant" (the page's subject) and "This measurement" (what was assayed) are
    // never confused. Every other role reads its label/class off the shared confidence axis, so those
    // badges match the same Key entry used throughout the app.
    roleBadge(entry: LedgerEntry): {label: string; class: string} {
      if (entry.role === 'page') return {label: 'This variant', class: 'bg-subject/15 text-subject'}
      const badge = confidenceBadge(entry.group)
      // No derivation and not measured: the API recorded no relationship (pre-reverse-translation data, or
      // a classification gap). "Unclassified" says so, rather than the old "Related" asserting one that wasn't.
      return badge
        ? {label: badge.label, class: badge.class}
        : {label: 'Unclassified', class: 'bg-border-light text-text-muted'}
    },
    cardClass(role: LedgerRole): string {
      if (role === 'page') return 'border-2 border-subject/40 bg-subject/[0.05]'
      if (role === 'measured') return 'border border-sage/30 bg-sage/[0.03]'
      return 'border border-border-light bg-surface'
    },
    levelLabel(level: string | null | undefined): string {
      return level ? assayLevelDisplay(level).label : '—'
    },
    levelClass(level: string | null | undefined): string {
      return level ? assayLevelDisplay(level).class : ''
    }
  }
})
</script>
