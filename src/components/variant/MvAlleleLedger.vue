<template>
  <div>
    <div class="mb-1 flex flex-wrap items-baseline gap-x-2">
      <h3 class="mave-section-title !mb-0">Clinical &amp; population data</h3>
    </div>
    <!-- Frame heading: "Measured" is a page-wide fact about a variant; only the derived labels (Resolved,
         Convergent, Candidate) are relative, and they are relative to the *selected* measurement — not the
         page variant. Saying so once keeps the per-row badges short. -->
    <p class="mb-3 text-xs-minus text-text-muted">
      Measured variants are marked. The rest are labeled relative to the selected measurement:
    </p>

    <!-- One card per allele group, uniform except for role badge and emphasis: your variant (X) leads, the
         selected measurement's variant (Y) follows, everything else collapses underneath. -->
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
            v-for="badge in roleBadges(entry)"
            :key="badge.label"
            v-key-term="badge.term"
            class="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.3px]"
            :class="badge.class"
            >{{ badge.label }}</span
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
          <!-- Your variant (X) is the page you're already on — no link out. Related variants link to their
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
          ? 'Hide other related variants'
          : `Show ${otherGroups.length} other related ${otherGroups.length === 1 ? 'variant' : 'variants'}`
      }}
    </button>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import VariantConsequenceStat from '@/components/variant/VariantConsequenceStat.vue'
import VariantGnomadStat from '@/components/variant/VariantGnomadStat.vue'
import VariantClinvarStat from '@/components/variant/VariantClinvarStat.vue'
import {type AlleleGroup, confidenceBadge, titleMember} from '@/lib/allele-grouping'
import {assayLevelDisplay} from '@/lib/measurement-types'
import type {components} from '@/schema/openapi'

type AlleleAnnotations = components['schemas']['AlleleAnnotations']
type AlleleIdentity = components['schemas']['AlleleIdentity']
type SequenceLevel = components['schemas']['SequenceLevel']

type LedgerRole = 'page' | 'selected' | 'other'
type LedgerEntry = {group: AlleleGroup; role: LedgerRole}

/**
 * Combined clinical/population + related-alleles ledger. Presents the whole equivalence class in one
 * place, at every level, with a *uniform* card per allele group: your variant (X) leads, the selected
 * measurement's variant (Y) follows when it differs, and the rest collapse underneath. Badges keep two
 * axes apart: "Measured" is a page-wide fact about a variant; only the derived labels are relative to the
 * selection.
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
    // Digests of every allele that has a measurement of its own on the page (see useVariantLookup).
    measuredDigests: {type: Array as PropType<string[]>, default: () => []},
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
    // Digests measured anywhere on the page, as a Set for lookup.
    measuredSet(): ReadonlySet<string> {
      return new Set(this.measuredDigests)
    },
    // The selected measurement's variant, pinned only when it differs from the page variant (otherwise the
    // lead card already is it).
    pinnedSelected(): AlleleGroup | null {
      const selected = this.groups.find((g) => g.measured) ?? null
      return selected && selected !== this.pageGroup ? selected : null
    },
    // Everything that is neither the page variant nor the selected measurement's variant. Variants with a
    // measurement of their own sort first (stable), so the collapsed remainder leads with what has a card above.
    otherGroups(): AlleleGroup[] {
      const others = this.groups.filter((g) => g !== this.pageGroup && g !== this.pinnedSelected)
      const isMeasured = (g: AlleleGroup) => g.members.some((m) => this.measuredSet.has(m.digest))
      return [...others.filter(isMeasured), ...others.filter((g) => !isMeasured(g))]
    },
    // The ordered render list: page variant, then the selected measurement's variant, then the rest
    // (collapsed). Roles drive emphasis, and are assigned from what a group *is* — a group is never given the
    // `page` role as a stand-in. When the page variant is absent the list simply leads with the selected
    // variant under its own badge, rather than labelling it "Your variant" and asserting an identity it lacks.
    entries(): LedgerEntry[] {
      const list: LedgerEntry[] = []
      if (this.pageGroup) list.push({group: this.pageGroup, role: 'page'})
      if (this.pinnedSelected) list.push({group: this.pinnedSelected, role: 'selected'})
      for (const g of this.otherGroups) list.push({group: g, role: 'other'})
      return list
    },
    // Whether any entry is pinned. When nothing is (no page variant and no selected variant in this
    // envelope), the collapsed rows are all there is, so they must not start hidden behind the toggle.
    hasPinnedEntry(): boolean {
      return this.pageGroup != null || this.pinnedSelected != null
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
    titleMember,
    allHgvsTitle(group: AlleleGroup): string {
      return group.members.map((m) => `${this.levelLabel(m.level)}: ${m.hgvs || '—'}`).join('  ·  ')
    },
    // The page variant leads with its fixed subject badge — deliberately distinct from the confidence-axis
    // colors, so "Your variant" (the page's subject) and "Measured" (what was assayed) are never confused —
    // followed by its standing on the measurement axis: Selected measurement, Measured (has a card of its own
    // above), or derived relative to the selection. Every other role gets that badge alone.
    roleBadges(entry: LedgerEntry): {label: string; class: string; term: string}[] {
      const confidence = confidenceBadge(entry.group, this.measuredSet)
      const confidenceEntry = confidence && {label: confidence.label, class: confidence.class, term: 'confidence'}
      if (entry.role === 'page') {
        const subject = {label: 'Your variant', class: 'bg-subject/15 text-subject', term: 'your-variant'}
        return confidenceEntry ? [subject, confidenceEntry] : [subject]
      }
      // No derivation and not measured: the API recorded no relationship (pre-reverse-translation data, or
      // a classification gap). "Unclassified" says so, rather than the old "Related" asserting one that wasn't.
      return [confidenceEntry ?? {label: 'Unclassified', class: 'bg-border-light text-text-muted', term: 'confidence'}]
    },
    cardClass(role: LedgerRole): string {
      if (role === 'page') return 'border-2 border-subject/40 bg-subject/[0.05]'
      // Echoes the selected measurement card's sage border above, tying the two together.
      if (role === 'selected') return 'border-2 border-sage/60 bg-sage/[0.04]'
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
