<template>
  <MvLayout>
    <template #header>
      <MvPageHeader title="Documentation">
        <p>Guides, references, and API documentation for MaveDB and its companion libraries.</p>
      </MvPageHeader>
    </template>

    <div class="mx-auto flex max-w-[800px] flex-col gap-7 py-9">
      <!-- Project cards -->
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          v-for="project in projects"
          :key="project.title"
          class="flex flex-col gap-2 rounded-lg border border-border bg-white px-5 pb-4.5 pt-5.5"
        >
          <div class="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="project.iconBg">
            <FontAwesomeIcon class="text-lg" :icon="project.icon" :style="{color: project.iconColor}" />
          </div>
          <div class="text-sm font-bold text-text-primary">{{ project.title }}</div>
          <div class="flex-1 text-xs leading-relaxed text-text-muted">{{ project.description }}</div>
          <div class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <a
              class="inline-block text-xs font-semibold text-sage no-underline hover:underline"
              :href="project.docsHref"
            >
              Read docs &rarr;
            </a>
            <a
              :aria-label="project.title + ' on GitHub (opens in new tab)'"
              class="inline-block text-xs font-semibold text-sage no-underline hover:underline"
              :href="project.githubHref"
              rel="noopener"
              target="_blank"
            >
              GitHub &rarr;
            </a>
            <a
              v-if="project.extraHref"
              :aria-label="project.title + ' on ' + project.extraLabel + ' (opens in new tab)'"
              class="inline-block text-xs font-semibold text-sage no-underline hover:underline"
              :href="project.extraHref"
              rel="noopener"
              target="_blank"
            >
              {{ project.extraLabel }} &rarr;
            </a>
          </div>
        </div>
      </div>

      <!-- API docs callout -->
      <div class="rounded-lg border border-border bg-white px-8 py-7">
        <h2 class="mb-4 text-lg font-bold text-sage">REST API</h2>
        <p class="text-sm leading-relaxed text-text-secondary">
          MaveDB provides a REST API for programmatic access to score sets, experiments, and variants. Interactive
          documentation is available at
          <a
            aria-label="REST API documentation (opens in new tab)"
            class="text-link"
            :href="apiDocumentationUrl"
            rel="noopener"
            target="_blank"
            >{{ apiDocumentationUrl }}</a
          >.
        </p>
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import config from '@/config'

const PROJECTS = [
  {
    title: 'MaveDB',
    description: 'Guides for searching, submitting data, calibrations, and using the MaveDB platform.',
    icon: 'fa-solid fa-book',
    iconBg: 'bg-[#eef0fb]',
    iconColor: 'var(--color-sage)',
    docsHref: '/docs/mavedb/index.html',
    githubHref: 'https://github.com/VariantEffect/mavedb-api'
  },
  {
    title: 'MAVE-HGVS',
    description: 'Python library for parsing, validating, and formatting MAVE-HGVS variant strings.',
    icon: 'fa-solid fa-code',
    iconBg: 'bg-published-light',
    iconColor: 'var(--color-published)',
    docsHref: '/docs/mavehgvs/index.html',
    githubHref: 'https://github.com/VariantEffect/mavehgvs',
    extraHref: 'https://pypi.org/project/mavehgvs/',
    extraLabel: 'PyPI'
  },
  {
    title: 'MaveTools',
    description: 'Python client library for interacting with the MaveDB API programmatically.',
    icon: 'fa-solid fa-wrench',
    iconBg: 'bg-neutral-100',
    iconColor: 'var(--color-text-secondary)',
    docsHref: '/docs/mavetools/index.html',
    githubHref: 'https://github.com/VariantEffect/MaveTools',
    extraHref: 'https://pypi.org/project/mavetools/',
    extraLabel: 'PyPI'
  }
]

export default defineComponent({
  name: 'DocumentationView',

  components: {FontAwesomeIcon, MvLayout, MvPageHeader},

  setup() {
    useHead({title: 'Documentation'})
    const apiDocumentationUrl = String(new URL('/docs', config.apiBaseUrl))
    return {
      projects: PROJECTS,
      apiDocumentationUrl
    }
  }
})
</script>
