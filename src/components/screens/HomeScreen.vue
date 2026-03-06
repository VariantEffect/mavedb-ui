<template>
  <MvLayout>
    <template #header>
      <!-- Hero -->
      <section
        aria-label="Search"
        class="relative overflow-hidden border-b border-border bg-[#fafcfa] px-6 pb-8 pt-16 text-center"
      >
        <!-- Watermark bars -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 flex h-full items-end justify-center gap-1.5 opacity-[0.08]"
        >
          <div
            v-for="bar in WATERMARK_BARS"
            :key="bar.color + bar.height"
            class="w-6 shrink-0 rounded-t-xl"
            :style="{background: bar.color, height: bar.height}"
          />
        </div>

        <!-- Subheader details -->
        <h1 class="relative mb-1 font-display text-3xl font-bold leading-tight text-text-dark">
          Functional variant data for the research community
        </h1>
        <p class="relative mb-1 text-base leading-snug text-text-secondary">
          A public repository for Multiplexed Assays of Variant Effect (MAVE) datasets
        </p>
        <router-link class="relative mb-5 inline-block text-sm leading-snug text-link" to="/help"
          >New to MaveDB? Learn how it works &rarr;</router-link
        >

        <!-- Search bar -->
        <div class="relative mx-auto max-w-[620px]">
          <form
            class="hero-search-form flex flex-col overflow-hidden rounded-md border-[1.5px] backdrop-blur-lg md:flex-row"
            :style="{borderColor: activeSearchColor.accent}"
            @submit.prevent="submitSearch"
          >
            <Select
              v-model="searchType"
              class="hero-search-select shrink-0"
              option-label="label"
              option-value="value"
              :options="SEARCH_TYPES"
              panel-class="hero-search-select-panel"
              :style="{
                '--search-bg': activeSearchColor.bg,
                '--search-accent': activeSearchColor.accent
              }"
            >
              <template #value="{value}">
                <span class="font-semibold" :style="{color: activeSearchColor.accent}">{{
                  SEARCH_TYPES.find((t) => t.value === value)?.label
                }}</span>
              </template>
              <template #option="{option}">
                <span
                  class="mr-2 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  :style="{background: SEARCH_COLORS[option.value].accent}"
                />
                {{ option.label }}
              </template>
            </Select>
            <div class="flex min-w-0 flex-1">
              <input
                v-model="searchText"
                aria-label="Search variants"
                class="min-w-0 flex-1 border-none bg-transparent px-3 py-3 font-body text-base outline-none placeholder:text-text-muted md:px-4 md:py-3.5"
                :placeholder="activeSearchPlaceholder"
                type="text"
              />
              <button
                class="cursor-pointer border-none px-4 font-body text-sm font-semibold md:px-5.5"
                :style="{background: activeSearchColor.accent, color: '#222'}"
                type="submit"
              >
                Search
              </button>
            </div>
          </form>
          <p class="mt-2 text-xs text-text-muted">
            Find a variant with functional data via
            <router-link class="text-link" to="/mavemd?searchType=hgvs">HGVS</router-link>,
            <router-link class="text-link" to="/mavemd?searchType=clinGenAlleleId">ClinGen CAId</router-link>,
            <router-link class="text-link" to="/mavemd?searchType=clinVarVariationId">ClinVar ID</router-link>, or
            <router-link class="text-link" to="/mavemd?searchType=dbSnpRsId">dbSNP rsid</router-link>.
          </p>
        </div>
      </section>
    </template>

    <!-- Paths: Explore + Contribute -->
    <div class="mt-9 grid md:grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5">
      <!-- Explore -->
      <div class="flex flex-col rounded-lg border border-border bg-white px-8 py-7">
        <h2 class="mb-1.5 text-xl font-bold text-sage">Explore datasets</h2>
        <p class="mb-4.5 text-sm leading-relaxed text-text-secondary">
          Browse published datasets by gene, organism, or keyword. Over 2,700 datasets covering 700+ human genes from
          community-contributed MAVE experiments.
        </p>
        <div class="mt-auto mb-2 text-sm font-bold uppercase tracking-wide text-text-muted">Browse by</div>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <router-link
            v-for="cat in BROWSE_CATEGORIES"
            :key="cat.label"
            class="flex flex-col gap-1 rounded-md border border-mint bg-sage-light p-3 px-3.5 no-underline transition-colors hover:border-sage hover:bg-mint"
            :to="cat.route"
          >
            <FontAwesomeIcon class="mb-0.5 text-sage" :icon="cat.icon" />
            <div class="text-sm font-bold text-text-dark">{{ cat.label }}</div>
            <div class="text-xs leading-snug text-text-secondary">{{ cat.description }}</div>
          </router-link>
        </div>
      </div>

      <!-- Contribute -->
      <div class="flex flex-col rounded-lg border border-border bg-white px-8 py-7">
        <h2 class="mb-1.5 text-xl font-bold text-sage">Contribute data</h2>
        <p class="mb-4.5 text-sm leading-relaxed text-text-secondary">
          Upload your MAVE assay results to make functional variant data available to the community.
        </p>
        <div class="mt-auto mb-2 text-sm font-bold uppercase tracking-wide text-text-muted">Start with</div>
        <div class="grid md:grid-cols-1 lg:grid-cols-2 gap-2.5">
          <router-link
            v-for="cat in CONTRIBUTE_CATEGORIES"
            :key="cat.label"
            class="flex flex-col gap-1 rounded-md border border-orange-border bg-orange-light p-3 px-3.5 no-underline transition-colors hover:border-orange-cta hover:bg-[#fde8c8]"
            :to="cat.route"
          >
            <FontAwesomeIcon class="mb-0.5 text-orange-cta-dark" :icon="cat.icon" />
            <div class="text-sm font-bold text-text-dark">{{ cat.label }}</div>
            <div class="text-xs leading-snug text-text-secondary">{{ cat.description }}</div>
          </router-link>
        </div>
      </div>
    </div>

    <hr class="my-9 border-t border-border" />

    <!-- Featured collections -->
    <section aria-label="Featured collections" class="mb-9">
      <div class="mb-3.5 text-lg font-bold text-text-primary">Featured collections</div>
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="coll in FEATURED_COLLECTIONS"
          :key="coll.title"
          class="rounded-lg border border-border bg-white p-5"
        >
          <img
            :alt="coll.title"
            class="mb-3 block h-8 w-auto max-w-[120px] object-contain object-left"
            :src="coll.logo"
          />
          <h3 class="mb-1.5 text-base font-bold text-text-primary">{{ coll.title }}</h3>
          <p class="mb-3.5 text-sm leading-relaxed text-text-secondary">{{ coll.description }}</p>
          <router-link class="text-xs font-semibold text-link" :to="coll.route">View collection &rarr;</router-link>
        </div>
      </div>
    </section>

    <!-- What's new -->
    <section aria-label="What's new" class="mb-9">
      <div class="mb-3.5 text-lg font-bold text-text-primary">What's new</div>
      <div class="overflow-hidden rounded-lg border border-border bg-white">
        <div
          v-for="(item, idx) in newsItems"
          :key="idx"
          class="border-b border-border-light px-6 py-4.5 last:border-b-0"
        >
          <div class="mb-1.5 flex items-center gap-2.5">
            <span class="text-xs font-semibold text-text-muted">{{ item.date }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide"
              :class="[NEWS_TAG_STYLES[item.tag].bg, NEWS_TAG_STYLES[item.tag].text]"
            >
              {{ item.tag }}
            </span>
          </div>
          <h3 class="mb-1 text-base font-bold">
            <a v-if="item.href" class="text-link" :href="item.href">{{ item.title }}</a>
            <span v-else>{{ item.title }}</span>
          </h3>
          <p class="text-sm leading-snug text-text-secondary">{{ item.description }}</p>
        </div>
      </div>
    </section>

    <!-- Recently published -->
    <section aria-label="Recently published" class="mb-9">
      <div class="mb-3.5 flex items-baseline justify-between">
        <div class="text-lg font-bold text-text-primary">Recently published</div>
        <router-link class="text-sm text-link" to="/search">View all</router-link>
      </div>
      <div class="overflow-hidden rounded-lg border border-border bg-white">
        <div
          v-for="(pub, idx) in RECENT_PUBLICATIONS"
          :key="idx"
          class="border-b border-border-light px-5 py-3.5 last:border-b-0"
        >
          <router-link
            class="mb-1.5 block text-sm font-semibold leading-relaxed text-link hover:underline"
            :to="pub.route"
            >{{ pub.title }}</router-link
          >
          <div class="flex flex-wrap gap-2">
            <span
              v-for="chip in pub.chips"
              :key="chip.label"
              class="rounded-full border px-2 py-0.5 text-xs font-medium"
              :class="
                chip.calibrated
                  ? 'border-calibrated-border bg-calibrated-light text-calibrated'
                  : 'border-chip-border bg-chip text-text-secondary'
              "
              >{{ chip.label }}</span
            >
          </div>
        </div>
      </div>
    </section>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent, ref, computed, onMounted, onBeforeUnmount} from 'vue'
import {useRouter} from 'vue-router'
import {useHead} from '@unhead/vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import Select from 'primevue/select'

import MvLayout from '@/components/layout/MvLayout.vue'
import {
  BROWSE_CATEGORIES,
  CONTRIBUTE_CATEGORIES,
  FEATURED_COLLECTIONS,
  RECENT_PUBLICATIONS,
  WATERMARK_BARS
} from '@/data/home'
import {NEWS_ITEMS, NEWS_TAG_STYLES} from '@/data/news'
import {SEARCH_COLORS, SEARCH_PLACEHOLDERS, SEARCH_TYPES} from '@/data/search'

export default defineComponent({
  name: 'HomeScreen',

  components: {FontAwesomeIcon, MvLayout, Select},

  setup() {
    useHead({title: 'Home'})
    const router = useRouter()

    const searchType = ref('hgvs')
    const searchText = ref('')

    const mdQuery = window.matchMedia('(min-width: 768px)')
    const isDesktop = ref(mdQuery.matches)
    function onMediaChange(e: MediaQueryListEvent) {
      isDesktop.value = e.matches
    }

    const activeSearchColor = computed(() => SEARCH_COLORS[searchType.value] || SEARCH_COLORS.hgvs)
    const activeSearchPlaceholder = computed(() => {
      const p = SEARCH_PLACEHOLDERS[searchType.value] || SEARCH_PLACEHOLDERS.hgvs
      return isDesktop.value ? p.full : p.short
    })

    onMounted(() => mdQuery.addEventListener('change', onMediaChange))
    onBeforeUnmount(() => mdQuery.removeEventListener('change', onMediaChange))

    function submitSearch() {
      const text = searchText.value.trim()
      if (!text) return
      router.push({path: '/mavemd', query: {search: text, searchType: searchType.value}})
    }

    return {
      searchType,
      searchText,
      activeSearchColor,
      activeSearchPlaceholder,
      submitSearch,
      SEARCH_COLORS,
      newsItems: NEWS_ITEMS,
      NEWS_TAG_STYLES,
      WATERMARK_BARS,
      SEARCH_TYPES,
      BROWSE_CATEGORIES,
      CONTRIBUTE_CATEGORIES,
      FEATURED_COLLECTIONS,
      RECENT_PUBLICATIONS
    }
  }
})
</script>

<style>
/* PrimeVue Select overrides for the hero search bar */
.hero-search-select .p-select-label {
  padding: 0 0.875rem;
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}

.hero-search-select.p-select {
  border: none;
  border-bottom: 1.5px solid var(--search-accent);
  border-radius: 0;
  background: color-mix(in srgb, var(--search-accent) 20%, transparent);
  box-shadow: none;
  width: 100%;
}

@media (min-width: 768px) {
  .hero-search-select.p-select {
    border-bottom: none;
    border-right: 1.5px solid var(--search-accent);
    width: 150px;
  }
}

.hero-search-select .p-select-dropdown {
  color: var(--search-accent);
  width: 1.5rem;
  padding-right: 0.5rem;
}

/* Dropdown panel — match trigger width */
@media (min-width: 768px) {
  .hero-search-select-panel {
    min-width: 0 !important;
    width: 150px !important;
  }
}

.hero-search-select-panel .p-select-option {
  font-size: 0.875rem;
  padding: 0.625rem 1rem;
  white-space: nowrap;
}
</style>
