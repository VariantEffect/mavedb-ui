<template>
  <MvLayout>
    <template #header>
      <!-- HERO -->
      <section class="bg-[#fafcfa] px-6 py-10 text-center">
        <img alt="MaveMD" class="mx-auto h-24" src="@/assets/mavemd-logo.png" />
        <h1 class="mt-4 font-display text-2xl font-bold leading-tight text-dark md:text-3xl">
          MAVE evidence for clinical variant interpretation
        </h1>
        <p class="mx-auto mt-2.5 max-w-[580px] text-sm leading-relaxed text-gray-500 md:text-base">
          MaveMD (MAVEs for MeDicine) integrates ClinVar and the ClinGen Allele Registry to display clinical evidence
          calibrations, provide intuitive visualizations, and export structured evidence compatible with ACMG/AMP
          variant classification guidelines.
        </p>
        <!-- TODO: Fetch variant measurements, MAVE datasets, and genes covered from API endpoints or via collection information -->
        <div class="mt-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-sm text-gray-500">
          <span><strong class="font-bold text-sage">438,318</strong> variant measurements</span>
          <span aria-hidden="true" class="hidden text-gray-300 sm:inline">&middot;</span>
          <span><strong class="font-bold text-sage">74</strong> MAVE datasets</span>
          <span aria-hidden="true" class="hidden text-gray-300 sm:inline">&middot;</span>
          <span><strong class="font-bold text-sage">32</strong> genes covered</span>
        </div>
      </section>

      <!-- SEARCH BAND -->
      <section class="border-b border-gray-200 bg-linear-to-br from-[#e8f5e9] via-[#fafcfa] to-[#fef3e0] px-6 py-9">
        <div class="mx-auto mb-5 max-w-[800px] text-center">
          <div class="text-lg font-bold text-dark">Find functional evidence for a variant</div>
          <div class="mt-1.5 text-sm text-gray-600">
            Enter a variant identifier to retrieve matching measurements and clinical evidence calibrations.
          </div>
        </div>

        <!-- DEFAULT SEARCH -->
        <div v-if="defaultSearchVisible" class="mx-auto max-w-[800px] rounded-xl bg-white p-5 shadow-md md:p-7">
          <!-- Pill tabs -->
          <div aria-label="Search type" class="mb-3.5 flex flex-wrap gap-1.5 md:gap-2" role="tablist">
            <button
              v-for="option in searchTypeOptions"
              :key="option.code"
              :aria-selected="searchType === option.code"
              class="cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-xs font-semibold transition-all md:px-4 md:py-1.5 md:text-sm"
              role="tab"
              :style="searchTabStyle(option.code)"
              :tabindex="searchType === option.code ? 0 : -1"
              @click="searchType = option.code"
              @keydown.arrow-left.prevent="focusTab($event, -1)"
              @keydown.arrow-right.prevent="focusTab($event, 1)"
            >
              {{ option.name }}
            </button>
          </div>

          <!-- Search bar -->
          <div
            class="mb-3 flex overflow-hidden rounded-lg border-2 bg-white transition-colors"
            :style="{borderColor: currentSearchColor.accent}"
          >
            <InputText
              ref="searchTextInput"
              v-model="searchText"
              :aria-label="'Search by ' + (searchTypeOptions.find((o) => o.code === searchType)?.name || 'HGVS')"
              class="min-w-0 flex-1 !rounded-none !border-none !shadow-none placeholder:font-mono placeholder:text-xs md:placeholder:text-sm"
              :placeholder="currentPlaceholder"
              type="search"
              @keyup.enter="defaultSearch"
            />
            <button
              class="cursor-pointer whitespace-nowrap border-none px-4 text-sm font-semibold text-dark transition-colors hover:brightness-85 md:px-7"
              :style="{backgroundColor: currentSearchColor.accent}"
              @click="defaultSearch"
            >
              Search
            </button>
          </div>

          <!-- Footer row -->
          <div class="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            <span>Don't have a versioned reference sequence identifier?</span>
            <button class="cursor-pointer font-semibold text-sage-dark hover:underline" @click="showSearch('guided')">
              Try guided search &rarr;
            </button>
          </div>

          <!-- Examples toggle -->
          <button
            aria-controls="search-examples"
            :aria-expanded="searchSuggestionsVisible"
            class="cursor-pointer border-none bg-transparent text-sm font-semibold text-sage-dark hover:underline"
            @click="searchSuggestionsVisible = !searchSuggestionsVisible"
          >
            {{ searchSuggestionsVisible ? 'Hide search examples' : 'Show search examples' }}
            <span aria-hidden="true">{{ searchSuggestionsVisible ? '↑' : '↓' }}</span>
          </button>

          <div v-if="searchSuggestionsVisible" id="search-examples" class="mt-3.5">
            <div
              v-for="option in searchTypeOptions"
              :key="option.code"
              class="mb-2.5 flex flex-col gap-1.5 md:flex-row md:flex-wrap md:items-center md:gap-2"
            >
              <span
                class="text-[0.6875rem] font-semibold uppercase tracking-wide text-gray-400 md:min-w-[130px] md:whitespace-nowrap"
              >
                {{ option.name }}
              </span>
              <button
                v-for="example in option.examples"
                :key="example"
                :aria-label="'Search for ' + example"
                class="cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-xs font-semibold leading-relaxed transition-colors"
                :class="chipClasses(option.code)"
                @click="searchForText(example, option.code)"
              >
                {{ example }}
              </button>
            </div>
          </div>
        </div>

        <!-- GUIDED SEARCH -->
        <div v-if="guidedSearchVisible" class="mx-auto max-w-[800px] rounded-xl bg-white p-5 shadow-md md:p-7">
          <!-- Segmented input bar (stacks on mobile) -->
          <div class="mb-3 flex flex-col overflow-hidden rounded-lg border-2 border-sage bg-white md:flex-row">
            <div class="grid flex-1 grid-cols-2 divide-x divide-y divide-gray-200 md:grid-cols-5 md:divide-y-0">
              <div class="relative col-span-2 flex items-center md:col-span-1">
                <label
                  class="absolute left-3 top-1 text-[0.5625rem] font-bold uppercase tracking-wider text-gray-400"
                  for="guided-gene"
                  >Gene</label
                >
                <InputText
                  id="guided-gene"
                  v-model="inputGene"
                  class="w-full !rounded-none !border-none !bg-transparent !pt-4 !pb-2 !shadow-none"
                  placeholder="e.g. BRCA1"
                />
              </div>
              <div class="guided-select-cell relative flex items-center bg-white">
                <label
                  id="guided-type-label"
                  class="absolute left-3 top-1 z-10 text-[0.5625rem] font-bold uppercase tracking-wider text-gray-400"
                  >Type</label
                >
                <Select
                  v-model="inputVariantType"
                  aria-labelledby="guided-type-label"
                  class="guided-select"
                  option-label="label"
                  option-value="value"
                  :options="variantTypeOptions"
                  placeholder="Select"
                />
              </div>
              <div class="relative flex items-center">
                <label
                  class="absolute left-3 top-1 text-[0.5625rem] font-bold uppercase tracking-wider text-gray-400"
                  for="guided-position"
                  >Position</label
                >
                <InputText
                  id="guided-position"
                  v-model="inputVariantPosition"
                  class="w-full !rounded-none !border-none !bg-transparent !pt-4 !pb-2 !shadow-none"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g. 100"
                  @beforeinput="restrictToDigits"
                />
              </div>
              <div class="guided-select-cell relative flex items-center bg-white">
                <label
                  id="guided-ref-label"
                  class="absolute left-3 top-1 z-10 text-[0.5625rem] font-bold uppercase tracking-wider text-gray-400"
                  >Ref</label
                >
                <Select
                  v-model="inputReferenceAllele"
                  aria-labelledby="guided-ref-label"
                  class="guided-select"
                  :options="selectedAlleleOptions"
                  placeholder="Select"
                />
              </div>
              <div class="guided-select-cell relative flex items-center bg-white">
                <label
                  id="guided-alt-label"
                  class="absolute left-3 top-1 z-10 text-[0.5625rem] font-bold uppercase tracking-wider text-gray-400"
                  >Alt</label
                >
                <Select
                  v-model="inputAlternateAllele"
                  aria-labelledby="guided-alt-label"
                  class="guided-select"
                  :options="selectedAlleleOptions"
                  placeholder="Select"
                />
              </div>
            </div>
            <button
              class="w-full cursor-pointer whitespace-nowrap border-t border-gray-200 bg-sage px-7 py-3 text-sm font-semibold text-dark transition-colors hover:bg-sage-dark md:w-auto md:border-t-0 md:border-l md:border-l-gray-200"
              @click="guidedSearch"
            >
              Search
            </button>
          </div>

          <!-- Live HGVS preview -->
          <div v-if="guidedSearchHasInput" class="mb-3 flex items-center gap-2.5 rounded-lg bg-gray-50 px-4 py-2.5">
            <span class="text-[0.625rem] font-bold uppercase tracking-wider text-gray-400">Building</span>
            <code class="flex items-center gap-px font-mono text-sm leading-none">
              <span :class="inputGene ? 'text-gray-800' : 'text-gray-300'">{{ inputGene || 'GENE' }}</span>
              <span class="text-gray-400">&nbsp;:&nbsp;</span>
              <span :class="inputVariantType ? 'font-semibold' : 'text-gray-300'">{{
                inputVariantType || 'c./p.'
              }}</span>
              <template v-if="!inputVariantType || inputVariantType === 'c.'">
                <span :class="inputVariantPosition ? 'text-gray-800' : 'text-gray-300'">{{
                  inputVariantPosition || 'pos'
                }}</span>
                <span :class="inputReferenceAllele ? 'text-gray-800' : 'text-gray-300'">{{
                  inputReferenceAllele || 'ref'
                }}</span>
                <span class="text-gray-400">&gt;</span>
                <span :class="inputAlternateAllele ? 'text-gray-800' : 'text-gray-300'">{{
                  inputAlternateAllele || 'alt'
                }}</span>
              </template>
              <template v-else>
                <span :class="inputReferenceAllele ? 'text-gray-800' : 'text-gray-300'">{{
                  inputReferenceAllele || 'Ref'
                }}</span>
                <span :class="inputVariantPosition ? 'text-gray-800' : 'text-gray-300'">{{
                  inputVariantPosition || 'pos'
                }}</span>
                <span :class="inputAlternateAllele ? 'text-gray-800' : 'text-gray-300'">{{
                  inputAlternateAllele || 'Alt'
                }}</span>
              </template>
            </code>
          </div>

          <div class="flex items-center gap-1.5 text-sm text-gray-500">
            <span>Know a specific variant identifier?</span>
            <button class="cursor-pointer font-semibold text-sage-dark hover:underline" @click="showSearch('default')">
              Use standard search &rarr;
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- SEARCH RESULTS -->
    <div v-if="searchResultsVisible" ref="searchResults" class="mx-auto w-full max-w-[800px] py-8">
      <div class="mb-5 flex items-center justify-between">
        <div aria-live="polite" role="status">
          <div class="text-lg font-bold text-dark">
            {{ alleles.length }} allele{{ alleles.length !== 1 ? 's' : '' }} found
          </div>
        </div>
        <button
          aria-label="Clear results and start a new search"
          class="cursor-pointer border-none bg-transparent text-sm font-semibold text-sage hover:text-sage-dark"
          @click="clearSearch"
        >
          <span aria-hidden="true">&larr;</span> New search
        </button>
      </div>
      <div v-if="loading">
        <MvLoader text="Finding matching variants..." />
      </div>

      <article
        v-for="(allele, alleleIdx) in alleles"
        :key="allele.clingenAlleleId"
        :aria-label="'Allele result: ' + allele.canonicalAlleleName"
        class="mb-5 overflow-hidden rounded-lg border border-gray-200 border-l-[3px] border-l-sage-light bg-white"
      >
        <!-- Card header -->
        <div class="border-b border-gray-100 px-5 pt-4 pb-3.5">
          <router-link
            :aria-label="'View variant detail for ' + allele.canonicalAlleleName"
            class="group flex flex-col gap-2 no-underline sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            :to="{name: 'variant', params: {clingenAlleleId: allele.clingenAlleleId}}"
          >
            <div class="min-w-0">
              <span class="text-base font-bold leading-snug text-link group-hover:underline sm:text-lg">
                {{ allele.canonicalAlleleName }}
              </span>
              <div v-if="allele.grch38Hgvs || allele.grch37Hgvs" class="mt-1.5 flex flex-wrap items-center gap-2">
                <span
                  v-if="allele.grch38Hgvs"
                  class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[0.6875rem] text-gray-600"
                >
                  <span class="font-sans text-[0.625rem] font-bold uppercase text-gray-400">GRCh38</span>
                  {{ allele.grch38Hgvs }}
                </span>
                <span
                  v-if="allele.grch37Hgvs"
                  class="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[0.6875rem] text-gray-600"
                >
                  <span class="font-sans text-[0.625rem] font-bold uppercase text-gray-400">GRCh37</span>
                  {{ allele.grch37Hgvs }}
                </span>
              </div>
            </div>
            <span class="shrink-0 text-sm font-semibold text-link group-hover:underline sm:text-md">
              View variant &rarr;
            </span>
          </router-link>

          <!-- MANE coordinates (collapsible) -->
          <MvCollapsible v-if="allele.maneCoordinates.length > 0" class="mt-3" :open="false" title="MANE transcripts">
            <table aria-label="MANE transcript coordinates" class="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th
                    class="border-b border-gray-100 px-2 py-1 text-left text-[0.625rem] font-semibold uppercase tracking-wide text-gray-400"
                  >
                    Type
                  </th>
                  <th
                    class="border-b border-gray-100 px-2 py-1 text-left text-[0.625rem] font-semibold uppercase tracking-wide text-gray-400"
                  >
                    Database
                  </th>
                  <th
                    class="border-b border-gray-100 px-2 py-1 text-left text-[0.625rem] font-semibold uppercase tracking-wide text-gray-400"
                  >
                    HGVS
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(coord, idx) in allele.maneCoordinates" :key="idx">
                  <td class="border-b border-gray-50 px-2 py-1.5 text-xs text-gray-500">{{ coord.sequenceType }}</td>
                  <td class="border-b border-gray-50 px-2 py-1.5 font-mono text-[0.6875rem] text-gray-600">
                    {{ coord.database }}
                  </td>
                  <td class="border-b border-gray-50 px-2 py-1.5 font-mono text-[0.6875rem] text-gray-600">
                    {{ coord.hgvs }}
                  </td>
                </tr>
              </tbody>
            </table>
          </MvCollapsible>
        </div>

        <!-- Card body: measurements -->
        <div
          v-if="
            allele.variantsStatus === 'Loaded' &&
            (allele.variants.nucleotide.length > 0 ||
              allele.variants.protein.length > 0 ||
              allele.variants.associatedNucleotide.length > 0)
          "
        >
          <!-- Nucleotide measurements -->
          <div v-if="allele.variants.nucleotide.length > 0" aria-label="Nucleotide level assays" role="group">
            <div class="flex items-center gap-2 px-5 pt-3.5 pb-1">
              <span class="text-sm font-bold uppercase tracking-wide text-gray-500">Nucleotide level assays</span>
              <span class="rounded-full bg-sage px-3 py-px text-[0.6875rem] font-semibold text-white">{{
                allele.variants.nucleotide.length
              }}</span>
            </div>
            <MvScoreSetRow
              v-for="(variant, idx) in nucleotideScoreSetListIsExpanded[alleleIdx]
                ? allele.variants.nucleotide
                : allele.variants.nucleotide.slice(0, defaultNumScoreSetsToShow)"
              :key="variant.urn ?? idx"
              class="pl-8"
              :score-set="variant.scoreSet"
              :show-description="false"
              :show-meta="false"
            />
            <button
              v-if="allele.variants.nucleotide.length > defaultNumScoreSetsToShow"
              :aria-expanded="!!nucleotideScoreSetListIsExpanded[alleleIdx]"
              class="mb-2 ml-5 mt-1 cursor-pointer border-none bg-transparent text-sm font-semibold text-link"
              @click="nucleotideScoreSetListIsExpanded[alleleIdx] = !nucleotideScoreSetListIsExpanded[alleleIdx]"
            >
              {{
                nucleotideScoreSetListIsExpanded[alleleIdx]
                  ? 'Show less'
                  : `Show ${allele.variants.nucleotide.length - defaultNumScoreSetsToShow} more`
              }}
            </button>
          </div>

          <div
            v-if="allele.variants.nucleotide.length > 0 && allele.variants.protein.length > 0"
            class="mx-5 h-px bg-gray-100"
          ></div>

          <!-- Protein measurements -->
          <div v-if="allele.variants.protein.length > 0" aria-label="Protein level assays" role="group">
            <div class="flex items-center gap-2 px-5 pt-3.5 pb-1">
              <span class="text-sm font-bold uppercase tracking-wide text-gray-500">Protein level assays</span>
              <span class="rounded-full bg-sage px-3 py-px text-[0.6875rem] font-semibold text-white">{{
                allele.variants.protein.length
              }}</span>
            </div>
            <MvScoreSetRow
              v-for="(variant, idx) in proteinScoreSetListIsExpanded[alleleIdx]
                ? allele.variants.protein
                : allele.variants.protein.slice(0, defaultNumScoreSetsToShow)"
              :key="variant.urn ?? idx"
              class="pl-8"
              :score-set="variant.scoreSet"
              :show-description="false"
              :show-meta="false"
            />
            <button
              v-if="allele.variants.protein.length > defaultNumScoreSetsToShow"
              :aria-expanded="!!proteinScoreSetListIsExpanded[alleleIdx]"
              class="mb-2 ml-5 mt-1 cursor-pointer border-none bg-transparent text-sm font-semibold text-link"
              @click="proteinScoreSetListIsExpanded[alleleIdx] = !proteinScoreSetListIsExpanded[alleleIdx]"
            >
              {{
                proteinScoreSetListIsExpanded[alleleIdx]
                  ? 'Show less'
                  : `Show ${allele.variants.protein.length - defaultNumScoreSetsToShow} more`
              }}
            </button>
          </div>

          <div
            v-if="
              allele.variants.associatedNucleotide.length > 0 &&
              (allele.variants.nucleotide.length > 0 || allele.variants.protein.length > 0)
            "
            class="mx-5 h-px bg-gray-100"
          ></div>

          <!-- Associated nucleotide measurements -->
          <div
            v-if="allele.variants.associatedNucleotide.length > 0"
            aria-label="Associated nucleotide assays"
            role="group"
          >
            <div class="flex items-center gap-2 px-5 pt-3.5 pb-1">
              <span class="text-xs font-bold uppercase tracking-wide text-gray-500">Associated nucleotide</span>
              <span class="rounded-full bg-sage px-2 py-px text-[0.6875rem] font-semibold text-white">{{
                allele.variants.associatedNucleotide.length
              }}</span>
            </div>
            <MvScoreSetRow
              v-for="(variant, idx) in associatedNucleotideScoreSetListIsExpanded[alleleIdx]
                ? allele.variants.associatedNucleotide
                : allele.variants.associatedNucleotide.slice(0, defaultNumScoreSetsToShow)"
              :key="variant.urn ?? idx"
              class="pl-8"
              :score-set="variant.scoreSet"
              :show-description="false"
              :show-meta="false"
            />
            <button
              v-if="allele.variants.associatedNucleotide.length > defaultNumScoreSetsToShow"
              :aria-expanded="!!associatedNucleotideScoreSetListIsExpanded[alleleIdx]"
              class="mb-2 ml-5 mt-1 cursor-pointer border-none bg-transparent text-sm font-semibold text-link"
              @click="
                associatedNucleotideScoreSetListIsExpanded[alleleIdx] =
                  !associatedNucleotideScoreSetListIsExpanded[alleleIdx]
              "
            >
              {{
                associatedNucleotideScoreSetListIsExpanded[alleleIdx]
                  ? 'Show less'
                  : `Show ${allele.variants.associatedNucleotide.length - defaultNumScoreSetsToShow} more`
              }}
            </button>
          </div>
        </div>

        <div v-else-if="allele.variantsStatus === 'Loaded'" class="px-5 py-4">
          <Message> No score sets containing this variant were found in MaveDB. </Message>
        </div>

        <div v-else-if="allele.variantsStatus === 'Error'" class="px-5 py-4">
          <Message :closable="false" severity="error"> Failed to load variant measurements. </Message>
        </div>

        <!-- Card footer -->
        <div v-if="allele.clingenAlleleUrl" class="flex justify-end border-t border-gray-100 px-5 py-2.5">
          <button
            aria-label="View in ClinGen Registry (opens in new window)"
            class="cursor-pointer border-none bg-transparent text-[0.6875rem] text-gray-400 text-link hover:underline"
            @click="openAlleleInClinGenRegistry(allele)"
          >
            View in ClinGen Registry <span aria-hidden="true">&nearr;</span>
          </button>
        </div>
      </article>
    </div>

    <!-- HOW IT WORKS (shown when no results) -->
    <section v-if="!searchResultsVisible" class="-mx-6 border-y border-gray-200 bg-white px-6 py-10">
      <div class="mx-auto max-w-[900px] text-center">
        <div class="text-lg font-bold text-dark">How MaveMD works</div>
        <div class="mb-8 text-sm text-gray-500">From variant identifier to clinical evidence in three steps</div>
        <div
          aria-label="How MaveMD works"
          class="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr]"
          role="list"
        >
          <template v-for="(step, idx) in howItWorksSteps" :key="step.number">
            <div class="flex flex-col items-center gap-2.5 px-3" role="listitem">
              <div
                aria-hidden="true"
                class="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-sage text-base font-bold text-dark"
              >
                {{ step.number }}
              </div>
              <div class="text-sm font-bold text-dark">{{ step.title }}</div>
              <div class="text-sm leading-relaxed text-gray-500">{{ step.description }}</div>
            </div>
            <div
              v-if="idx < howItWorksSteps.length - 1"
              aria-hidden="true"
              class="hidden self-start pt-2 text-xl text-mint md:block"
            >
              &rarr;
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- SCORE SETS TABLE (shown when no results) -->
    <section v-if="!searchResultsVisible" class="mx-auto w-full max-w-[1000px] px-6 py-10">
      <div class="text-lg font-bold text-dark">MaveMD score sets</div>
      <div class="text-sm text-gray-500">
        {{ maveMdScoreSetUrns.length }} MAVE datasets calibrated for clinical variant interpretation
      </div>

      <Message v-if="maveMdScoreSetsError" class="mt-5" :closable="false" severity="error">
        Failed to load score sets.
        <button
          class="ml-1 cursor-pointer border-none bg-transparent font-semibold text-inherit underline"
          @click="fetchMaveMdScoreSets"
        >
          Retry
        </button>
      </Message>

      <table v-else aria-label="MaveMD score sets by gene" class="mt-5 w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th
              class="border-b-2 border-gray-200 pb-2.5 pl-3 text-left text-[0.6875rem] font-bold uppercase tracking-wider text-gray-500"
              style="width: 55%"
            >
              Score set
            </th>
            <th
              class="border-b-2 border-gray-200 pb-2.5 pl-3 text-left text-[0.6875rem] font-bold uppercase tracking-wider text-gray-500"
              style="width: 30%"
            >
              Publication
            </th>
            <th
              class="border-b-2 border-gray-200 pb-2.5 pl-3 text-center text-[0.6875rem] font-bold uppercase tracking-wider text-gray-500"
              style="width: 15%"
            >
              Calibrations
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="({gene, urns}, gi) in maveMdScoreSetsGroupedByGene" :key="gene">
            <tr>
              <td class="border-b border-gray-100 bg-gray-50/60 px-3 py-1.5 text-gray-700" colspan="3">
                <span v-if="gi === 0" class="mr-2 text-[0.625rem] font-bold uppercase tracking-wider text-gray-400"
                  >Gene</span
                >
                <span class="font-semibold">{{ gene }}</span>
              </td>
            </tr>
            <tr v-for="urn in urns" :key="urn">
              <td class="border-b border-gray-100 py-2 pl-5 pr-3">
                <EntityLink display="title" entity-type="scoreSet" :urn="urn" :use-cache="true" />
              </td>
              <td class="border-b border-gray-100 px-3 py-2">
                <router-link
                  v-if="maveMdScoreSets[urn]"
                  class="text-sm text-link"
                  :to="{name: 'scoreSet', params: {urn}}"
                >
                  {{ getScoreSetShortName(maveMdScoreSets[urn]!) }}
                </router-link>
              </td>
              <td class="border-b border-gray-100 px-3 py-2 text-center">
                <router-link :to="{name: 'scoreSetCalibrations', params: {urn}}">
                  <span
                    class="inline-block whitespace-nowrap rounded-full border border-purple-300 bg-purple-50 px-2.5 py-px text-xs font-semibold text-purple-800"
                  >
                    {{ calibrationCountWithEvidence(urn) }} / {{ calibrationCountTotal(urn) }}
                  </span>
                </router-link>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="!guideExpanded" class="mt-3 flex items-center gap-3 border-t border-gray-200 pt-3">
        <button
          class="cursor-pointer border-none bg-transparent text-sm font-semibold text-link hover:underline"
          @click="guideExpanded = true"
        >
          Show all {{ maveMdScoreSetUrns.length }} datasets
        </button>
        <span class="text-xs text-gray-400">Showing first 8 genes</span>
      </div>
    </section>
  </MvLayout>
</template>

<script lang="ts">
import _ from 'lodash'
import EntityLink from '@/components/common/EntityLink.vue'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import {defineComponent} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useToast} from 'primevue/usetoast'
import {useHead} from '@unhead/vue'

import MvCollapsible from '@/components/common/MvCollapsible.vue'
import MvScoreSetRow from '@/components/common/MvScoreSetRow.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import {
  type AlleleResult,
  clinGenAlleleIdRegex,
  clinVarVariationIdRegex,
  rsIdRegex,
  extractIdFromUrl,
  createAlleleResult
} from '@/lib/mavemd'
import {getTargetGeneName} from '@/lib/target-genes'
import {components} from '@/schema/openapi'
import {getScoreSetShortName} from '@/lib/score-sets'
import {clinVarHgvsSearchStringRegex, hgvsSearchStringRegex} from '@/lib/mave-hgvs'
import {SEARCH_COLORS} from '@/data/search'
import {
  HOW_IT_WORKS_STEPS,
  MAVEMD_COLLECTION_URN,
  SEARCH_TYPE_OPTIONS,
  VARIANT_TYPE_OPTIONS,
  ALLELE_OPTIONS
} from '@/data/mavemd'
import {getAlleleByCaId, getAlleleByHgvs, getAlleleByDbSnp, getAlleleByClinVar, getGeneBySymbol} from '@/api/clingen'
import {getCollection, lookupVariantsByClingenId} from '@/api/mavedb'
import {useEntityCache} from '@/composables/entity-cache'
import MvLoader from '@/components/common/MvLoader.vue'

const SCORE_SETS_TO_SHOW = 5

type ScoreSet = components['schemas']['ScoreSet']
type TargetGene = components['schemas']['TargetGene']

export default defineComponent({
  name: 'SearchVariantsScreen',

  components: {
    EntityLink,
    InputText,
    MvCollapsible,
    MvLayout,
    Message,
    MvLoader,
    MvScoreSetRow,
    Select
  },

  setup() {
    useHead({title: 'MaveMD variant search'})

    const route = useRoute()
    const router = useRouter()
    const toast = useToast()
    const {getEntity} = useEntityCache()
    return {route, router, toast, getEntity, getScoreSetShortName}
  },

  data: function () {
    return {
      loading: false,
      defaultSearchVisible: true,
      searchSuggestionsVisible: false,
      guidedSearchVisible: false,
      searchResultsVisible: false,
      searchText: null as string | null,
      searchType: null as string | null,
      searchTypeOptions: SEARCH_TYPE_OPTIONS,
      inputGene: null as string | null,
      inputVariantType: null as string | null,
      variantTypeOptions: VARIANT_TYPE_OPTIONS,
      inputVariantPosition: null as string | null,
      inputReferenceAllele: null as string | null,
      inputAlternateAllele: null as string | null,
      allAlleleOptions: ALLELE_OPTIONS,
      alleles: [] as AlleleResult[],
      nucleotideScoreSetListIsExpanded: [] as Array<boolean>,
      proteinScoreSetListIsExpanded: [] as Array<boolean>,
      associatedNucleotideScoreSetListIsExpanded: [] as Array<boolean>,
      defaultNumScoreSetsToShow: SCORE_SETS_TO_SHOW,
      guideExpanded: false,
      maveMdScoreSetUrns: [] as string[],
      maveMdScoreSets: {} as {[urn: string]: ScoreSet | undefined},
      maveMdScoreSetsError: false,
      howItWorksSteps: HOW_IT_WORKS_STEPS
    }
  },

  computed: {
    maveMdScoreSetsGroupedByGene: function () {
      const groups = _(this.maveMdScoreSetUrns)
        .groupBy((urn) => {
          const scoreSet = this.maveMdScoreSets[urn]
          if (!scoreSet) return 'Unknown'
          return scoreSet.targetGenes?.map((g: TargetGene) => getTargetGeneName(g)).join(', ') || 'Unknown'
        })
        .toPairs()
        .map(([gene, urns]) => ({gene, urns}))
        .sortBy(({gene}) => gene.toLowerCase())
        .value()
      return this.guideExpanded ? groups : groups.slice(0, 8)
    },
    searchIsClearable: function () {
      return (
        !_.isEmpty(this.searchText) ||
        !_.isEmpty(this.inputGene) ||
        !_.isEmpty(this.inputVariantType) ||
        !_.isEmpty(this.inputVariantPosition) ||
        !_.isEmpty(this.inputReferenceAllele) ||
        !_.isEmpty(this.inputAlternateAllele)
      )
    },
    selectedAlleleOptions: function () {
      if (!this.inputVariantType) {
        return []
      }
      return this.allAlleleOptions[this.inputVariantType] || []
    },
    guidedSearchHasInput(): boolean {
      return !!(
        this.inputGene ||
        this.inputVariantType ||
        this.inputVariantPosition ||
        this.inputReferenceAllele ||
        this.inputAlternateAllele
      )
    },
    currentSearchColor(): {accent: string; bg: string} {
      return SEARCH_COLORS[this.searchType || 'hgvs'] || SEARCH_COLORS.hgvs
    },
    currentPlaceholder(): string {
      const option = this.searchTypeOptions.find((o) => o.code === this.searchType)
      return option?.examples?.[0] || 'Enter a value'
    }
  },

  watch: {
    alleles: {
      handler: function (newValue) {
        this.nucleotideScoreSetListIsExpanded = newValue.map(() => false)
        this.proteinScoreSetListIsExpanded = newValue.map(() => false)
        this.associatedNucleotideScoreSetListIsExpanded = newValue.map(() => false)
      }
    },
    searchType: {
      handler(newVal, oldVal) {
        if (newVal !== oldVal && this.defaultSearchVisible) {
          this.searchText = ''
          this.router.replace({
            query: {...this.route.query, searchType: newVal}
          })
        }
      }
    },
    '$route.query.search': {
      immediate: true,
      handler(newVal) {
        if (typeof newVal === 'string') {
          this.searchText = newVal
        } else if (!newVal) {
          this.searchText = ''
        }
      }
    },
    '$route.query.searchType': {
      immediate: true,
      handler(newVal) {
        if (typeof newVal === 'string') {
          this.searchType = newVal
        } else if (!newVal && this.defaultSearchVisible) {
          this.searchType = 'hgvs'
        }
      }
    },
    '$route.query.gene': {
      immediate: true,
      handler(newVal) {
        this.inputGene = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.variantType': {
      immediate: true,
      handler(newVal) {
        this.inputVariantType = typeof newVal === 'string' ? newVal : ''
      }
    },
    inputGene() {
      this.syncGuidedQueryParams()
    },
    inputVariantType(newVal, oldVal) {
      if (oldVal && newVal !== oldVal) {
        this.inputReferenceAllele = null
        this.inputAlternateAllele = null
      }
      this.syncGuidedQueryParams()
    },
    inputVariantPosition() {
      this.syncGuidedQueryParams()
    },
    inputReferenceAllele() {
      this.syncGuidedQueryParams()
    },
    inputAlternateAllele() {
      this.syncGuidedQueryParams()
    },
    '$route.query.variantPosition': {
      immediate: true,
      handler(newVal) {
        this.inputVariantPosition = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.refAllele': {
      immediate: true,
      handler(newVal) {
        this.inputReferenceAllele = typeof newVal === 'string' ? newVal : ''
      }
    },
    '$route.query.altAllele': {
      immediate: true,
      handler(newVal) {
        this.inputAlternateAllele = typeof newVal === 'string' ? newVal : ''
      }
    }
  },

  mounted() {
    if (this.route.query.search && String(this.route.query.search).trim() !== '') {
      this.defaultSearchVisible = true
      this.guidedSearchVisible = false
      this.defaultSearch()
    } else if (
      this.route.query.mode === 'guided' ||
      this.route.query.gene ||
      this.route.query.variantType ||
      this.route.query.variantPosition ||
      this.route.query.refAllele ||
      this.route.query.altAllele
    ) {
      this.defaultSearchVisible = false
      this.guidedSearchVisible = true
      if (this.route.query.gene) {
        this.guidedSearch()
      }
    }

    this.fetchMaveMdScoreSets()
  },

  methods: {
    restrictToDigits(event: InputEvent) {
      if (event.data && !/^\d*$/.test(event.data)) {
        event.preventDefault()
      }
    },
    syncGuidedQueryParams() {
      if (!this.guidedSearchVisible) return
      const query = {...this.route.query}
      query.mode = 'guided'
      if (this.inputGene) query.gene = this.inputGene
      else delete query.gene
      if (this.inputVariantType) query.variantType = this.inputVariantType
      else delete query.variantType
      if (this.inputVariantPosition) query.variantPosition = this.inputVariantPosition
      else delete query.variantPosition
      if (this.inputReferenceAllele) query.refAllele = this.inputReferenceAllele
      else delete query.refAllele
      if (this.inputAlternateAllele) query.altAllele = this.inputAlternateAllele
      else delete query.altAllele
      this.router.replace({query})
    },
    focusTab(event: KeyboardEvent, direction: -1 | 1) {
      const tabs = (event.currentTarget as HTMLElement)?.parentElement?.querySelectorAll<HTMLElement>('[role="tab"]')
      if (!tabs) return
      const list = Array.from(tabs)
      const idx = list.indexOf(event.currentTarget as HTMLElement)
      const target = list[(idx + direction + list.length) % list.length]
      target.focus()
      target.click()
    },
    openAlleleInClinGenRegistry: function (allele: AlleleResult) {
      if (allele.clingenAlleleUrl) {
        window.open(allele.clingenAlleleUrl, '_blank')
      }
    },
    fetchMaveMdScoreSets: async function () {
      this.maveMdScoreSetsError = false
      try {
        if (this.maveMdScoreSetUrns.length === 0) {
          const collection = await getCollection(MAVEMD_COLLECTION_URN)
          this.maveMdScoreSetUrns = collection.scoreSetUrns
        }
        for (const urn of this.maveMdScoreSetUrns) {
          if (!this.maveMdScoreSets[urn]) {
            const scoreSet = await this.getEntity('scoreSet', urn)
            this.maveMdScoreSets[urn] = scoreSet as ScoreSet
          }
        }
      } catch (error) {
        console.error('Failed to load MaveMD score sets', error)
        this.maveMdScoreSetsError = true
      }
    },
    searchForText: function (example: string, searchType: string) {
      this.searchType = searchType
      this.showSearch('default')
      this.searchText = example
      this.defaultSearch()
      this.router.replace({query: {searchType: this.searchType, search: this.searchText}})
    },
    clearSearch() {
      this.searchText = null
      this.inputGene = null
      this.inputVariantType = null
      this.inputVariantPosition = null
      this.inputReferenceAllele = null
      this.inputAlternateAllele = null
      this.searchResultsVisible = false
      this.alleles = []
      this.router.replace({query: {}})
    },
    showSearch(searchMethod: 'guided' | 'default' = 'default') {
      this.defaultSearchVisible = searchMethod === 'default'
      this.guidedSearchVisible = searchMethod === 'guided'

      const query = {...this.route.query}
      if (searchMethod === 'guided') {
        delete query.search
        delete query.searchType
        query.mode = 'guided'
      } else {
        delete query.gene
        delete query.variantType
        delete query.variantPosition
        delete query.refAllele
        delete query.altAllele
        delete query.mode
      }
      this.router.replace({query})
      this.clearSearch()
    },
    defaultSearch: async function () {
      if (this.searchText) this.searchText = this.searchText.trim()
      this.searchResultsVisible = true
      const query = {...this.route.query}
      delete query.mode
      delete query.gene
      delete query.variantType
      delete query.variantPosition
      delete query.refAllele
      delete query.altAllele
      if (this.searchText) {
        query.search = this.searchText
      } else {
        delete query.search
      }
      this.router.replace({query})
      this.alleles = []
      this.loading = true
      if (this.searchText !== null && this.searchText !== '') {
        await this.fetchDefaultSearchResults(this.searchText)
      }
      this.loading = false
      await this.searchVariants()
    },
    fetchDefaultSearchResults: async function (searchString: string, maneStatus: string | null = null) {
      const searchType = this.searchType
      let searchStr = searchString.trim()

      try {
        let responseData
        if (searchType === 'clinGenAlleleId') {
          if (!clinGenAlleleIdRegex.test(searchStr)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid ClinGen Allele ID (e.g. ${this.searchTypeOptions.find((o) => o.code === searchType)?.examples?.join(', ')})`,
              life: 10000
            })
            return
          }
          responseData = await getAlleleByCaId(searchStr)
        } else if (searchType === 'dbSnpRsId') {
          if (!rsIdRegex.test(searchStr) && !rsIdRegex.test(`rs${searchStr}`)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid dbSNP rsID (e.g. ${this.searchTypeOptions.find((o) => o.code === searchType)?.examples?.join(', ')})`,
              life: 10000
            })
            return
          }
          responseData = await getAlleleByDbSnp(searchStr)
        } else if (searchType === 'clinVarVariationId') {
          if (!clinVarVariationIdRegex.test(searchStr)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid ClinVar Variation ID (e.g. ${this.searchTypeOptions.find((o) => o.code === searchType)?.examples?.join(', ')})`,
              life: 10000
            })
            return
          }
          responseData = await getAlleleByClinVar(searchStr)
        } else {
          if (!hgvsSearchStringRegex.test(searchStr)) {
            this.toast.add({
              severity: 'error',
              summary: 'Invalid search',
              detail: `Please provide a valid HGVS string (e.g. ${this.searchTypeOptions.find((o) => o.code === searchType)?.examples?.join(', ')})`,
              life: 10000
            })
            return
          }
          const match = clinVarHgvsSearchStringRegex.exec(searchStr)
          if (match) {
            searchStr = `${match.groups!.identifier}:${match.groups!.description}`
          }
          responseData = await getAlleleByHgvs(searchStr)
        }
        const results = Array.isArray(responseData) ? responseData : [responseData]

        for (const result of results) {
          const clingenAlleleId = extractIdFromUrl(result['@id'])
          if (clingenAlleleId && clingenAlleleId.startsWith('CA')) {
            this.alleles.push(createAlleleResult(result, maneStatus))
          } else if (clingenAlleleId && clingenAlleleId.startsWith('PA')) {
            const aminoAcidAlleles = result?.aminoAcidAlleles || []
            for (let i = 0; i < aminoAcidAlleles.length; i++) {
              if (searchType !== 'hgvs' || aminoAcidAlleles[i].hgvs?.includes(searchString)) {
                const transcripts = aminoAcidAlleles[i]?.matchingRegisteredTranscripts || []
                if (transcripts.length > 0) {
                  for (let j = 0; j < transcripts.length; j++) {
                    const associatedId = extractIdFromUrl(transcripts[j]?.['@id'])
                    const associatedData = await getAlleleByCaId(associatedId!)
                    this.alleles.push(createAlleleResult(associatedData, maneStatus))
                  }
                } else {
                  const bareAllele = createAlleleResult(result, null)
                  bareAllele.canonicalAlleleName = searchStr
                  this.alleles.push(bareAllele)
                }
              }
              break
            }
          }
        }
        if (this.alleles.length > 0) {
          ;(this.$refs.searchResults as HTMLElement)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      } catch (error: any) {
        console.log('Error while loading search results', error)
        this.toast.add({
          severity: 'error',
          summary:
            error.response?.data?.errorType && error.response?.data?.description
              ? `${error.response.data?.errorType}: ${error.response.data?.description}`
              : 'Error fetching results',
          detail: error.response?.data?.message || 'Invalid search.',
          life: 10000
        })
      }
    },
    searchVariants: async function () {
      for (const allele of this.alleles) {
        const caId = allele.clingenAlleleId
        if (!caId) continue
        allele.variantsStatus = 'Loading'
        try {
          const data = await lookupVariantsByClingenId([caId])

          if (caId.startsWith('CA')) {
            allele.variants.nucleotide = data[0]?.exactMatch?.variantEffectMeasurements || []
            allele.variants.protein = (data[0]?.equivalentAa || []).flatMap(
              (entry) => entry.variantEffectMeasurements || []
            )
            allele.variants.associatedNucleotide = (data[0]?.equivalentNt || []).flatMap(
              (entry) => entry.variantEffectMeasurements || []
            )
          } else if (caId.startsWith('PA')) {
            allele.variants.protein = data[0]?.exactMatch?.variantEffectMeasurements || []
            allele.variants.nucleotide = (data[0]?.equivalentNt || []).flatMap(
              (entry) => entry.variantEffectMeasurements || []
            )
          }
          allele.variantsStatus = 'Loaded'
        } catch (error: any) {
          allele.variants = {nucleotide: [], protein: [], associatedNucleotide: []}
          console.log('Error while loading MaveDB search results for variant', error)
          if (error.response?.status === 404) {
            allele.variantsStatus = 'Loaded'
            this.toast.add({
              severity: 'info',
              summary: 'No results found',
              detail: 'No variants match the provided search criteria.',
              life: 10000
            })
          } else if (error.response?.status >= 500) {
            allele.variantsStatus = 'Error'
            this.toast.add({
              severity: 'error',
              summary: 'Server Error',
              detail: 'The server encountered an unexpected error. Please try again later.',
              life: 10000
            })
          } else {
            allele.variantsStatus = 'Error'
            this.toast.add({
              severity: 'error',
              summary: 'Error fetching results',
              detail: 'An error occurred while fetching MaveDB variants.',
              life: 10000
            })
          }
        }
      }
    },
    guidedSearch: async function () {
      this.searchResultsVisible = true
      this.syncGuidedQueryParams()
      this.alleles = []
      this.loading = true
      await this.fetchGuidedSearchResults()
      this.loading = false
      await this.searchVariants()
    },
    fetchGuidedSearchResults: async function () {
      if (
        _.isEmpty(this.inputGene) ||
        _.isEmpty(this.inputVariantType) ||
        _.isEmpty(this.inputVariantPosition) ||
        _.isEmpty(this.inputReferenceAllele) ||
        _.isEmpty(this.inputAlternateAllele)
      ) {
        this.alleles = []
      } else {
        try {
          const geneSymbol = this.inputGene?.toUpperCase()

          const geneData = await getGeneBySymbol(geneSymbol!)

          const maneRefSeqIds = []
          for (const maneRecord of geneData?.externalRecords?.MANE || []) {
            if (this.inputVariantType === 'c.') {
              maneRefSeqIds.push({
                id: maneRecord.nucleotide?.RefSeq?.id,
                maneStatus: maneRecord.maneStatus
              })
            } else if (this.inputVariantType === 'p.') {
              maneRefSeqIds.push({
                id: maneRecord.protein?.RefSeq?.id,
                maneStatus: maneRecord.maneStatus
              })
            }
          }

          const hgvsStrings = []
          for (const maneRefSeqId of maneRefSeqIds) {
            if (this.inputVariantType === 'c.') {
              hgvsStrings.push({
                hgvsString: `${maneRefSeqId.id}:${this.inputVariantType}${this.inputVariantPosition}${this.inputReferenceAllele}>${this.inputAlternateAllele}`,
                maneStatus: maneRefSeqId.maneStatus
              })
            } else if (this.inputVariantType === 'p.') {
              hgvsStrings.push({
                hgvsString: `${maneRefSeqId.id}:${this.inputVariantType}${this.inputReferenceAllele}${this.inputVariantPosition}${this.inputAlternateAllele}`,
                maneStatus: maneRefSeqId.maneStatus
              })
            }
          }

          for (const hgvsString of hgvsStrings) {
            await this.fetchDefaultSearchResults(hgvsString.hgvsString, hgvsString.maneStatus)
          }
        } catch (error: any) {
          this.alleles = []
          console.log('Error while loading search results', error)
          this.toast.add({
            severity: 'error',
            summary:
              error.response?.data?.errorType && error.response?.data?.description
                ? `${error.response.data?.errorType}: ${error.response.data?.description}`
                : 'Error fetching results',
            detail: error.response?.data?.message || 'Invalid search.',
            life: 10000
          })
        }
      }
    },

    searchTabStyle(code: string): Record<string, string> {
      const colors = SEARCH_COLORS[code] || SEARCH_COLORS.hgvs
      const isActive = this.searchType === code
      if (isActive) {
        return {borderColor: colors.accent, backgroundColor: colors.accent, color: 'var(--color-text-dark)'}
      }
      return {borderColor: colors.accent, color: colors.accent, backgroundColor: 'var(--color-surface)'}
    },

    chipClasses(code: string): string {
      const map: Record<string, string> = {
        hgvs: 'bg-sage-light text-sage-dark border-mint font-mono text-xs font-normal',
        clinGenAlleleId: 'bg-[#dff0ed] text-[#3d8a7d] border-mint',
        dbSnpRsId: 'bg-[#fdf4de] text-[#b8922a] border-[#f0d88a]',
        clinVarVariationId: 'bg-orange-light text-[#c87815] border-orange-border'
      }
      return map[code] || ''
    },

    calibrationCountWithEvidence(urn: string): number {
      const scoreSet = this.maveMdScoreSets[urn]
      if (!scoreSet?.scoreCalibrations) return 0
      return scoreSet.scoreCalibrations.filter(
        (calibration: components['schemas']['ScoreCalibration']) =>
          Array.isArray(calibration.functionalClassifications) &&
          calibration.functionalClassifications.filter((range) => range.acmgClassification).length > 0
      ).length
    },

    calibrationCountTotal(urn: string): number {
      return this.maveMdScoreSets[urn]?.scoreCalibrations?.length || 0
    }
  }
})
</script>

<style>
/* Guided search PrimeVue Select overrides */
.guided-select-cell .guided-select {
  width: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.guided-select-cell .guided-select .p-select-label {
  padding: 1rem 1.75rem 0.5rem 0.75rem;
  font-size: 14px;
  color: var(--color-gray-800);
  background: transparent;
}

.guided-select-cell .guided-select .p-select-label.p-placeholder {
  color: var(--color-gray-400);
}

.guided-select-cell .guided-select .p-select-dropdown {
  width: 1.5rem;
  color: var(--color-gray-400);
}

.guided-select-cell .guided-select .p-select-dropdown svg {
  width: 0.875rem;
  height: 0.875rem;
}

.guided-select .p-select-overlay {
  border: 1px solid var(--color-gray-200);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
  margin-top: 2px;
}

.guided-select .p-select-option {
  font-size: 14px;
  padding: 0.5rem 0.75rem;
}

.guided-select .p-select-option.p-select-option-selected {
  background: var(--color-sage-light);
  color: var(--color-sage-dark);
}
</style>
