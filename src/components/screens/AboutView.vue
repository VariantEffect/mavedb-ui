<template>
  <MvLayout>
    <template #header>
      <MvPageHeader title="About MaveDB">
        <p>
          MaveDB is a public repository for datasets from Multiplexed Assays of Variant Effect (MAVEs), including deep
          mutational scanning and massively parallel reporter assays. It provides a standardised way to store, share,
          and access functional variant data across thousands of genes.
        </p>
      </MvPageHeader>
    </template>

    <div class="mx-auto flex max-w-[800px] flex-col gap-7 py-9">
      <!-- What is a MAVE? -->
      <div class="rounded-lg border border-border bg-white px-8 py-7">
        <h2 class="mb-3 text-lg font-bold text-sage">What is a MAVE?</h2>
        <p class="mb-3 text-sm leading-relaxed text-text-secondary">
          Multiplexed Assays of Variant Effect (MAVEs) are experimental techniques — such as deep mutational scanning
          (DMS) and saturation genome editing (SGE) — that measure the functional impact of large numbers of genetic
          variants simultaneously, often covering every possible single-nucleotide change in a gene of interest.
        </p>
        <p class="text-sm leading-relaxed text-text-secondary">
          These experiments produce quantitative functional scores that describe how each variant affects protein
          function, RNA splicing, or other measurable phenotypes. When combined with clinical evidence, these scores can
          inform variant pathogenicity classification.
        </p>
      </div>

      <!-- How data is organised -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">How data is organised</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 overflow-hidden rounded-lg border border-border bg-white">
          <div
            v-for="(step, idx) in DATA_MODEL_STEPS"
            :key="step.title"
            class="relative border-r border-border p-5 last:border-r-0"
          >
            <div class="mb-1.5 text-xs font-bold tracking-wide text-text-muted">
              <span class="uppercase">{{ String(idx + 1).padStart(2, '0') }}&mdash;&nbsp;</span>
              <span class="mb-1.5 text-sm font-bold text-sage">{{ step.title }}</span>
            </div>

            <div class="text-xs leading-relaxed text-text-secondary">{{ step.description }}</div>
          </div>
        </div>
      </div>

      <!-- Partners & collaborators -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">Partners &amp; collaborators</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="partner in PARTNERS"
            :key="partner.name"
            class="flex flex-col gap-2 rounded-lg border border-border bg-white p-5"
          >
            <img
              v-if="partner.logoSrc"
              :alt="partner.name"
              class="h-7 object-contain object-left"
              :src="partner.logoSrc"
            />
            <div v-else class="flex h-7 items-center text-sm font-bold text-link">{{ partner.name }}</div>
            <div class="text-sm font-bold text-text-primary">{{ partner.name }}</div>
            <div class="text-xs leading-relaxed text-text-muted">{{ partner.description }}</div>
          </div>
        </div>
      </div>

      <!-- Sponsors -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">Sponsors</h2>
        <div class="relative flex overflow-hidden rounded-lg border border-border bg-white">
          <a
            aria-label="Zulip (opens in new tab)"
            class="relative ml-4 w-24 shrink-0"
            href="https://zulip.com/"
            rel="noopener"
            target="_blank"
          >
            <img alt="Zulip" class="absolute inset-0 h-full w-full object-contain" :src="zulipLogo" />
          </a>
          <div class="px-6 py-6">
            <a
              aria-label="Zulip (opens in new tab)"
              class="text-base font-bold text-text-primary no-underline"
              href="https://zulip.com/"
              rel="noopener"
              target="_blank"
              >Zulip</a
            >
            <p class="mt-1 text-xs leading-relaxed text-text-secondary">
              Zulip is an organized team chat app designed for efficient communication. MaveDB's community chat is
              generously hosted by Zulip as part of their sponsorship program for open-source projects.
            </p>
          </div>
        </div>
      </div>

      <!-- Team -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">Team</h2>
        <div class="rounded-lg border border-border bg-white px-8 py-7">
          <p class="mb-4.5 text-sm leading-relaxed text-text-secondary">
            MaveDB is developed and maintained by the
            <a class="text-link" href="https://faculty.washington.edu/dfowler/index.html">Variant Effects Lab</a> and
            the <a class="text-link" href="https://www.brotmanbaty.org/">Brotman Baty Institute</a> at the University of
            Washington, with contributions from collaborators across the MAVE and clinical genomics communities.
          </p>
          <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div v-for="member in TEAM_MEMBERS" :key="member.name" class="rounded-lg border border-border px-4.5 py-4">
              <div class="text-sm font-bold text-text-primary">{{ member.name }}</div>
              <div class="mt-0.5 text-xs text-text-muted">{{ member.role }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Publications -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">Publications</h2>
        <div class="overflow-hidden rounded-lg border border-border bg-white">
          <div
            v-for="(pub, idx) in PUBLICATIONS"
            :key="idx"
            class="border-b border-border-light py-4 pl-9 pr-5 -indent-4 leading-snug last:border-b-0"
          >
            <span class="text-xs text-text-muted"
              >{{ pub.authors }}&nbsp;{{ pub.title }}.&nbsp;{{ pub.journal }}.&nbsp;</span
            >
            <a
              aria-label="Publication DOI (opens in new tab)"
              class="text-xs font-semibold leading-relaxed text-link hover:underline"
              :href="pub.url"
              rel="noopener"
              target="_blank"
            >
              {{ pub.url }} </a
            >.
          </div>
        </div>
      </div>

      <!-- License & source code -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">License &amp; source code</h2>
        <div class="rounded-lg border border-border bg-white px-8 py-7">
          <p class="mb-3 text-sm leading-relaxed text-text-secondary">
            MaveDB is open source, released under the
            <a
              aria-label="AGPLv3 license (opens in new tab)"
              class="text-link"
              href="https://www.gnu.org/licenses/agpl-3.0.en.html"
              rel="noopener"
              target="_blank"
              >GNU Affero General Public License v3 (AGPLv3)</a
            >. Source code is available on GitHub for both the
            <a
              aria-label="API source code on GitHub (opens in new tab)"
              class="text-link"
              :href="GITHUB_API_URL"
              rel="noopener"
              target="_blank"
              >API</a
            >
            and
            <a
              aria-label="UI source code on GitHub (opens in new tab)"
              class="text-link"
              :href="GITHUB_UI_URL"
              rel="noopener"
              target="_blank"
              >UI</a
            >.
          </p>
          <p class="text-sm leading-relaxed text-text-secondary">
            All data in MaveDB is made available under the
            <a
              aria-label="CC0 1.0 license (opens in new tab)"
              class="text-link"
              href="https://creativecommons.org/public-domain/cc0/"
              rel="noopener"
              target="_blank"
              >CC0 1.0 Universal Public Domain Dedication</a
            >
            unless otherwise noted by the submitting authors.
          </p>
        </div>
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import igvfLogo from '@/assets/igvf-tag.png'
import zulipLogo from '@/assets/zulip-logo.png'
import {GITHUB_API_URL, GITHUB_UI_URL} from '@/lib/links'

const DATA_MODEL_STEPS = [
  {
    title: 'Experiment Set',
    description:
      'A collection of related experiments, typically representing different assays or conditions for the same target gene.'
  },
  {
    title: 'Experiment',
    description: 'The biological system and assay design — gene, organism, and experimental method.'
  },
  {
    title: 'Score set',
    description: 'A set of variant scores produced by a single experiment, mapped to a reference sequence.'
  },
  {title: 'Variants', description: 'Individual variants with functional scores and, where available, count data.'}
]

// TODO: Add more partners and collaborators, and include links to their websites and/or logos where available
const PARTNERS = [
  {
    name: 'IGVF Consortium',
    description: 'Functional genomics data from the Impact of Genomic Variation on Function consortium.',
    logoSrc: igvfLogo
  },
  {
    name: 'ClinGen',
    description: 'Clinical Genome Resource — calibrated MaveDB score sets contribute to variant evidence curation.',
    logoSrc: ''
  },
  {
    name: 'GA4GH',
    description:
      'Global Alliance for Genomics and Health — MaveDB is a Driver Project for the Genomic Knowledge Standards Work Stream.',
    logoSrc: ''
  },
  {
    name: 'ClinVar',
    description:
      'ClinVar is a public database of variant interpretations, providing a resource for clinical and research communities.',
    logoSrc: ''
  }
]

// TODO: Complete team roster and roles, and add links to personal pages and/or photos where available
const TEAM_MEMBERS = [
  {name: 'Alan Rubin', role: 'Principal Investigator'},
  {name: 'Douglas Fowler', role: 'Principal Investigator'},
  {name: 'Lea Starita', role: 'Principal Investigator'},
  {name: 'Jeremy Stone', role: 'Software Engineer'},
  {name: 'Ben Capodanno', role: 'Software Engineer'},
  {name: 'Sally Grindstaff', role: 'Software Engineer'},
  {name: 'Estelle Da', role: 'Software Engineer'},
  {name: 'David Reinhart', role: 'Software Engineer'}
]

const PUBLICATIONS = [
  {
    title:
      'MaveDB 2024: a curated community database with over seven million variant effects from multiplexed functional assays',
    authors: 'Rubin, A.F., Stone, J., Bianchi, A.H. et al.',
    journal: 'Genome Biol 26, 13 (2025)',
    url: 'https://doi.org/10.1186/s13059-025-03476-y'
  },
  {
    title: 'MaveDB: an open-source platform to distribute and interpret data from multiplexed assays of variant effect',
    authors:
      'Esposito, D., Weile, J., Shendure, J., Starita, L.M., Papenfuss, A.T., Roth, F.P., Fowler, D.M., Rubin, A.F.',
    journal: 'Genome Biol 20, 223 (2019)',
    url: 'https://doi.org/10.1186/s13059-019-1845-6'
  }
]

export default defineComponent({
  name: 'AboutView',

  components: {MvLayout, MvPageHeader},

  setup() {
    useHead({title: 'About'})
    return {
      DATA_MODEL_STEPS,
      PARTNERS,
      TEAM_MEMBERS,
      PUBLICATIONS,
      GITHUB_API_URL,
      GITHUB_UI_URL,
      zulipLogo
    }
  }
})
</script>
