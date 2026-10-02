<template>
  <div class="relative min-w-0 flex-1">
    <MvFloatField label="Search variants">
      <template #default="{id}">
        <AutoComplete
          :id="id"
          v-model="localSelection"
          class="w-full"
          complete-on-focus
          :delay="300"
          dropdown
          fluid
          :input-style="hasSelection ? {paddingRight: '2.25rem'} : undefined"
          option-group-label="label"
          option-group-children="items"
          :option-label="variantOptionLabel"
          :scroll-height="variantSearchQuery ? '175px' : '320px'"
          select-on-focus
          :suggestions="variantSearchSuggestions"
          :virtual-scroller-options="variantSearchQuery ? {itemSize: 50} : undefined"
          @complete="variantSearch"
        >
          <!-- Group header: on the empty state each notable group names its rung; while typing the single
               group's label carries the match count. -->
          <!-- A standing note that the empty-box rows are a curated handful, not the whole set. -->
          <template #header>
            <div
              v-if="!variantSearchQuery && variantSearchSuggestions.length"
              class="border-b border-border-light px-3 py-1.5 text-xs text-text-muted"
            >
              Showing sample variants — type to search all {{ variants.length.toLocaleString() }}.
            </div>
          </template>
          <template #optiongroup="{option}">
            <div
              class="px-3 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-text-muted"
              :class="{'border-t border-border-light': !variantSearchQuery}"
            >
              {{ option.label }}
            </div>
          </template>
          <template #option="{option}">
            <div class="flex w-full items-center justify-between gap-2">
              <div class="flex min-w-0 items-center gap-2">
                <!-- Leading dot — one meaning everywhere: a ClinVar control, colored by its classification
                     (red pathogenic, blue benign, grey otherwise). Transparent (but width-reserved, so
                     labels stay aligned) for every non-control row, in both the empty and typing states. -->
                <span
                  class="size-2 shrink-0 rounded-full"
                  :style="{backgroundColor: optionDotColor(option) || 'transparent'}"
                  :title="clinicalTag(option) ?? undefined"
                />
                <div class="flex min-w-0 flex-col justify-center leading-tight">
                  <span class="truncate">{{ variantOptionLabel(option) }}</span>
                  <!-- Empty box: the notable caption. Searching: the underlying coordinate, for
                       disambiguating distinct coding variants that share a protein label. -->
                  <span
                    v-if="!variantSearchQuery && notableCaption(option)"
                    class="truncate text-xs font-semibold text-text-secondary"
                  >
                    {{ notableCaption(option)?.label }}
                  </span>
                  <span
                    v-else-if="variantSearchQuery && variantUnderlyingLabel(option)"
                    class="truncate font-mono text-xs text-text-muted"
                  >
                    {{ variantUnderlyingLabel(option) }}
                  </span>
                  <span v-if="frame === 'reference' && isUnmapped(option)" class="text-xs italic text-text-muted">
                    Variant could not be mapped
                  </span>
                </div>
              </div>
              <span v-if="typeof option.score === 'number'" class="shrink-0 text-xs text-text-muted">
                {{ formatScore(option.score) }}
              </span>
            </div>
          </template>
          <template #empty>
            <div v-if="!variantSearchQuery" class="p-3 text-sm text-text-muted">
              Type a position or coordinate to find a variant.
            </div>
            <div v-else class="p-2.5 text-center text-sm text-text-muted">No matching variants found.</div>
          </template>
        </AutoComplete>
      </template>
    </MvFloatField>
    <button
      v-if="hasSelection"
      aria-label="Clear"
      class="absolute right-12 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-red-50 hover:text-red-600"
      @click="clearSelection"
    >
      <i class="pi pi-times text-[10px]" />
    </button>
  </div>
</template>

<script lang="ts">
import AutoComplete from 'primevue/autocomplete'
import {defineComponent, shallowRef, type PropType} from 'vue'

import MvFloatField from '@/components/forms/MvFloatField.vue'
import type {ClinvarControlsStore} from '@/composables/use-clinvar-controls'
import {useVariantCoordinates, type CoordinateFrame} from '@/composables/use-variant-coordinates'
import {
  BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS,
  CLINVAR_REVIEW_STATUS_STARS,
  DEFAULT_CLNREVSTAT_FIELD,
  DEFAULT_CLNSIG_FIELD,
  DEFAULT_MIN_STAR_RATING,
  PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS
} from '@/lib/clinvar-controls'
import {consequenceBucket} from '@/lib/consequences'
import {formatScore} from '@/lib/scores'
import {
  clinicalExtremesPerClass,
  consequenceExemplars,
  deviationsFromMedian,
  medianAndMad,
  scoreExtremes
} from '@/lib/notables'
import type {DisplayVariant} from '@/lib/variants'

// A labeled block of suggestions. The AutoComplete is always grouped: an empty box shows the notable
// groups (clinical / consequence / score extremes), typing collapses to a single group whose label
// carries the match count.
interface VariantGroup {
  label: string
  items: DisplayVariant[]
}

// The secondary line rendered under a notable row, framed for its group (a consequence name, a ClinVar
// call, or a deviations-from-median readout).
interface NotableCaption {
  label: string
}

// How many most-extreme-score rows to sample on the empty state.
const SCORE_EXTREME_COUNT = 4

/**
 * The score-set variant picker: a search-and-jump AutoComplete. An empty box offers "notable" variants to
 * jump to (grouped by signal-richness: clinvar controls, then consequence exemplars, then score
 * extremes); typing filters the whole set by coordinate. Both states are real grouped options, so both
 * stay keyboard-navigable and select/jump natively. Selection is surfaced via `v-model` (the parent owns
 * it — the histograms, heatmap, detail panel, and URL all two-way sync through it).
 */
export default defineComponent({
  name: 'ScoreSetVariantSearch',

  components: {AutoComplete, MvFloatField},

  props: {
    variants: {
      type: Array as PropType<DisplayVariant[]>,
      required: true
    },
    // Shared clinical-control store — gates and feeds the "Clinically classified" group once its
    // associations settle.
    clinical: {
      type: Object as PropType<ClinvarControlsStore>,
      required: true
    },
    // Coordinate frame the labels resolve in (reference in clinical mode, submitted otherwise).
    frame: {
      type: String as PropType<CoordinateFrame>,
      required: true
    },
    // The selected variant (v-model). Null when nothing is selected.
    modelValue: {
      type: Object as PropType<DisplayVariant | null>,
      default: null
    }
  },

  emits: ['update:modelValue'],

  setup() {
    // shallowRef, not ref: the groups are replaced wholesale on each search, and a deep ref would lazily
    // Proxy every option object the first time PrimeVue's AutoComplete touches it (its `ariaSetSize`
    // computed filters the entire list on open) — which is what made the dropdown slow to appear.
    const variantSearchSuggestions = shallowRef<VariantGroup[]>([])
    return {
      ...useVariantCoordinates(),
      variantSearchSuggestions
    }
  },

  data: () => ({
    // The AutoComplete's own model: PrimeVue writes the typed string here while searching and the option
    // object on select. Mirrored from `modelValue` and re-emitted, guarding against the transient string.
    localSelection: null as DisplayVariant | string | null,
    variantSearchQuery: ''
  }),

  computed: {
    // Whether an actual variant (not a transient typed string) is selected — drives the clear button and
    // the input's trailing padding.
    hasSelection(): boolean {
      return typeof this.localSelection === 'object' && this.localSelection !== null
    },
    // The scored subset — the pool the empty-state notables (clinical extremes, consequence exemplars,
    // score extremes) sample from, since a notable is a jump-to-position suggestion and needs a score to
    // land on. Search itself spans the whole set (see `variantSearchIndex`), scored or not.
    scoredVariants(): DisplayVariant[] {
      return this.variants.filter((v) => typeof v.score === 'number')
    },
    // Search index built once per loaded set: every variant — scored or not — paired with a lowercased
    // haystack of all its coordinate strings (both frames) plus its URN. Unscored variants stay findable:
    // they're real members of the set (a coordinate the depositor submitted that carries an NA score), so a
    // coordinate query must still reach them even though the histogram has no bar to jump to — the detail
    // panel reports the missing score instead. Filtering a keystroke is then one `includes` per variant
    // instead of re-resolving ~7 coordinates and re-lowercasing them on every keypress.
    variantSearchIndex(): {variant: DisplayVariant; haystack: string}[] {
      return this.variants.map((v) => ({
        variant: v,
        haystack: [
          v.hgvsNt?.hgvs,
          v.hgvsPro?.hgvs,
          v.hgvsSplice?.hgvs,
          v.mapped?.cdna?.hgvs,
          v.mapped?.genomic?.hgvs,
          v.mapped?.protein?.hgvs,
          v.variantUrn
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      }))
    },
    // The "notables" shown when the box is empty — a useful entry point instead of a blank list. Three
    // groups graded by signal-richness, each present only if it has data: clinvar controls (richest,
    // needs the fetch — pops in once associations settle), consequence exemplars (intrinsic; empty on
    // truly-unmapped sets), and score extremes (the universal floor). A variant appears in only its
    // highest-signal group; the matching caption is stashed per URN for the #option slot.
    notableData(): {groups: VariantGroup[]; captions: Map<string, NotableCaption>} {
      const scored = this.scoredVariants
      const groups: VariantGroup[] = []
      const captions = new Map<string, NotableCaption>()
      if (!scored.length) return {groups, captions}
      const seen = new Set<string>()

      // 1. Clinically classified — gated on the clinical-control fetch having associated; the group simply
      // isn't there until then, so it pops in asynchronously.
      const clinical = this.clinical.associated
        ? clinicalExtremesPerClass(scored, DEFAULT_MIN_STAR_RATING).filter((v) => !seen.has(v.variantUrn))
        : []
      for (const v of clinical) {
        seen.add(v.variantUrn)
        captions.set(v.variantUrn, this.clinicalCaption(v))
      }
      if (clinical.length) groups.push({label: 'Clinically classified', items: clinical})

      // 2. By consequence — one representative per effect bucket present.
      const consequence = consequenceExemplars(scored).filter((v) => !seen.has(v.variantUrn))
      for (const v of consequence) {
        seen.add(v.variantUrn)
        captions.set(v.variantUrn, {label: consequenceBucket(v.consequence)})
      }
      if (consequence.length) groups.push({label: 'By consequence', items: consequence})

      // 3. Most extreme scores — request a few extra to backfill any deduped against the groups above, then
      // trim to the target count.
      const spread = medianAndMad(scored.map((v) => v.score as number))
      const extremes = scoreExtremes(scored, SCORE_EXTREME_COUNT + seen.size)
        .filter((v) => !seen.has(v.variantUrn))
        .slice(0, SCORE_EXTREME_COUNT)
      for (const v of extremes) {
        seen.add(v.variantUrn)
        captions.set(v.variantUrn, this.scoreCaption(v, spread))
      }
      if (extremes.length) groups.push({label: 'Most extreme scores', items: extremes})

      return {groups, captions}
    }
  },

  watch: {
    // Mirror parent-driven selections (histogram/heatmap/URL) into the local model, but never clobber the
    // text the user is actively typing.
    modelValue: {
      handler(value: DisplayVariant | null) {
        if (typeof this.localSelection !== 'string' && value !== this.localSelection) {
          this.localSelection = value
        }
      },
      immediate: true
    },
    // Surface only a real selection (an option object) or a clear (null); ignore the transient typed
    // string PrimeVue writes while searching — which is how typing-over a selection unlocks the views.
    localSelection(value: DisplayVariant | string | null) {
      const next = typeof value === 'object' ? value : null
      if (next !== this.modelValue) {
        this.$emit('update:modelValue', next)
      }
    },
    // Keep the empty-box suggestions live: the clinical group joins asynchronously once controls associate
    // (and the intrinsic groups settle as variants load), so re-push the groups whenever they change while
    // the box is empty. `@complete` only fires on open/keystroke, which would otherwise miss the pop-in.
    notableData() {
      if (!this.variantSearchQuery) {
        this.variantSearchSuggestions = this.notableData.groups
      }
    },
    // Warm the two heavy computeds once the variants land — the notables (built on first dropdown-open) and
    // the coordinate haystack (built on first keystroke) — so those first interactions are instant instead
    // of paying an O(n) build synchronously. Deferred to idle to keep it off the initial render path, which
    // is why these stay lazy computeds rather than eager fields.
    variants: {
      handler(list: DisplayVariant[]) {
        if (!list.length) return
        const warm = () => {
          void this.notableData
          void this.variantSearchIndex
        }
        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          window.requestIdleCallback(warm)
        } else {
          setTimeout(warm, 200)
        }
      },
      immediate: true
    }
  },

  methods: {
    formatScore,

    // The precomputed caption for a notable row (empty-box state), keyed by URN; null for search-result
    // rows, which show the variant's annotation instead.
    notableCaption(variant: DisplayVariant): NotableCaption | null {
      return this.notableData.captions.get(variant.variantUrn) ?? null
    },

    // The leading dot color: the ClinVar classification color when the variant is a control, undefined
    // otherwise — the same rule in both the empty (notables) and typing states.
    optionDotColor(variant: DisplayVariant): string | undefined {
      return this.clinicalColor(variant)
    },

    // Classification color for a ClinVar control (red pathogenic, blue benign, grey otherwise), echoing
    // the histogram's control colors; undefined when the variant isn't a control.
    clinicalColor(variant: DisplayVariant): string | undefined {
      const control = variant.control
      // Hard-discordant placements carry no representative call — narrow before reading one.
      const significance = control && control.discordance !== 'hard' ? control[DEFAULT_CLNSIG_FIELD] : undefined
      if (!significance) return undefined
      if (PATHOGENIC_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)) return '#e41a1c'
      if (BENIGN_CLINICAL_SIGNIFICANCE_CLASSIFICATIONS.includes(significance)) return '#377eb8'
      return '#999999'
    },

    // The ClinVar call + star rating for a control variant — the search-result dot's hover title; null
    // when the variant isn't a control (or controls haven't been fetched yet).
    clinicalTag(variant: DisplayVariant): string | null {
      const control = variant.control
      // Hard-discordant placements carry no representative call — narrow before reading one.
      if (!control || control.discordance === 'hard') return null
      const significance = control[DEFAULT_CLNSIG_FIELD]
      if (!significance) return null
      const stars = CLINVAR_REVIEW_STATUS_STARS[control[DEFAULT_CLNREVSTAT_FIELD] ?? ''] ?? 0
      return stars ? `${significance} · ${stars}★` : significance
    },

    // Caption for a clinical-control notable row: the ClinVar call and star rating.
    clinicalCaption(variant: DisplayVariant): NotableCaption {
      return {label: this.clinicalTag(variant) ?? ''}
    },

    // Caption for a most-extreme-scores row: distance from the median in robust (MAD) units. Falls back to
    // a bare label when the scale is degenerate (MAD 0, so the count is meaningless).
    scoreCaption(variant: DisplayVariant, spread: {median: number; mad: number}): NotableCaption {
      const deviations = deviationsFromMedian(variant.score as number, spread)
      if (deviations == null) return {label: 'Extreme score'}
      return {label: `${Math.abs(deviations).toFixed(1)} deviations ${deviations < 0 ? 'below' : 'above'} median`}
    },

    variantSearch(event: {query: string}) {
      const query = event.query.trim().toLowerCase()
      this.variantSearchQuery = query

      // Search-and-jump: an empty box shows the notable groups (styled via #option), not the whole set —
      // far too many to list usefully; browse the full set via the heatmap/histograms. Typing collapses to
      // a single group of coordinate matches whose label carries the count.
      if (!query) {
        this.variantSearchSuggestions = this.notableData.groups
        return
      }

      const matches: DisplayVariant[] = []
      for (const entry of this.variantSearchIndex) {
        if (entry.haystack.includes(query)) matches.push(entry.variant)
      }
      this.variantSearchSuggestions = matches.length
        ? [
            {
              label: `${matches.length.toLocaleString()} of ${this.variants.length.toLocaleString()} variants match`,
              items: matches
            }
          ]
        : []
    },

    clearSelection() {
      this.localSelection = null
    },

    // Label for the AutoComplete chip and suggestions. A function (not a materialized field) so it
    // re-resolves from the current frame — flipping the clinical toggle re-labels reactively. PrimeVue
    // may hand back the raw typed string before a selection is made, so tolerate that.
    variantOptionLabel(variant: DisplayVariant | string): string {
      return typeof variant === 'string' ? variant : this.labelForVariant(variant, this.frame)
    },

    // The underlying nucleotide coordinate in the current frame, when it differs from the (protein-
    // preferred) display label — surfaced to disambiguate distinct coding variants that share a protein
    // label, and as provenance. `getHgvsNt` is coding-preferred (NM_:c.), so a genomic-measured variant
    // surfaces its coding key — the natural pair of the protein change — rather than the g. coordinate.
    // Null when the label already is the nucleotide coordinate.
    variantUnderlyingLabel(variant: DisplayVariant | string): string | null {
      if (typeof variant === 'string') return null
      const nt = this.getHgvsNt(variant, this.frame)
      return nt && nt !== this.variantOptionLabel(variant) ? nt : null
    }
  }
})
</script>
