<template>
  <MvLayout>
    <template #header>
      <MvPageHeader title="Help">
        <p>
          Get help with MaveDB — whether you're looking for documentation, want to report a bug, or have a question
          about submitting or interpreting data.
        </p>
      </MvPageHeader>
    </template>

    <div class="mx-auto flex max-w-[800px] flex-col gap-7 py-9">
      <!-- Channel cards -->
      <div class="grid md:grid-cols-3 gap-4">
        <div
          v-for="channel in channels"
          :key="channel.title"
          class="flex flex-col gap-2 rounded-lg border border-border bg-white px-5 pb-4.5 pt-5.5"
        >
          <div class="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" :class="channel.iconBg">
            <FontAwesomeIcon class="text-lg" :icon="channel.icon" :style="{color: channel.iconColor}" />
          </div>
          <div class="text-sm font-bold text-text-primary">{{ channel.title }}</div>
          <div class="flex-1 text-xs leading-relaxed text-text-muted">{{ channel.description }}</div>
          <component
            :is="channel.external ? 'a' : 'router-link'"
            class="mt-1 inline-block text-sm font-semibold text-sage no-underline hover:underline"
            v-bind="
              channel.external
                ? {
                    href: channel.href,
                    rel: 'noopener',
                    target: '_blank',
                    'aria-label': channel.linkText + ' (opens in new tab)'
                  }
                : {to: channel.href}
            "
          >
            {{ channel.linkText }} &rarr;
          </component>
        </div>
      </div>

      <!-- FAQ -->
      <div>
        <h2 class="-ml-0.5 mb-3 text-sm font-bold text-text-primary">Frequently asked questions</h2>
        <Accordion class="faq-accordion">
          <AccordionPanel v-for="(faq, idx) in faqs" :key="idx" :value="String(idx)">
            <AccordionHeader>{{ faq.question }}</AccordionHeader>
            <AccordionContent>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="faq.answer" />
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </div>

      <!-- Contact us -->
      <div class="rounded-lg border border-border bg-white px-8 py-7">
        <h2 class="mb-4 text-lg font-bold text-sage">Contact us</h2>
        <p class="text-sm leading-relaxed text-text-secondary">
          For questions not covered above, general conversation and community support, chat with us on
          <a aria-label="Zulip (opens in new tab)" class="text-link" :href="ZULIP_CHAT" rel="noopener" target="_blank"
            >Zulip</a
          >. For bug reports or feature requests, please use
          <a
            aria-label="GitHub Issues (opens in new tab)"
            class="text-link"
            :href="GITHUB_UI_ISSUES"
            rel="noopener"
            target="_blank"
            >GitHub Issues</a
          >
          so the team can track and prioritise them.
        </p>
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'

import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import {ZULIP_CHAT, GITHUB_UI_ISSUES} from '@/lib/links'

const CHANNELS = [
  {
    title: 'Community chat',
    description: 'Ask questions, share ideas, and get help from the MaveDB community on Zulip.',
    linkText: 'Join Zulip',
    href: ZULIP_CHAT,
    external: true,
    icon: 'fa-solid fa-comment',
    iconBg: 'bg-[#eef0fb]',
    iconColor: 'var(--color-sage)'
  },
  {
    title: 'Documentation',
    description: 'Guides for searching, submitting data, calibrations, and the MaveDB API.',
    linkText: 'Explore documentation',
    href: '/docs',
    external: false,
    icon: 'fa-solid fa-file-lines',
    iconBg: 'bg-published-light',
    iconColor: 'var(--color-published)'
  },
  {
    title: 'GitHub',
    description: 'Report bugs or request features by opening an issue on our GitHub repository.',
    linkText: 'Open an issue',
    href: GITHUB_UI_ISSUES,
    external: true,
    icon: 'fa-brands fa-github',
    iconBg: 'bg-neutral-100',
    iconColor: 'var(--color-text-primary)'
  }
]

// Since these contain raw HTML, they must remain developer-maintained to avoid XSS risks.
const FAQS = [
  {
    question: 'How do I submit data to MaveDB?',
    answer:
      'Sign in and use the <a href="/create-experiment">Add Dataset</a> flow to create an experiment and one or more score sets. Each score set requires a reference sequence mapping and a scores file in CSV format. See the <a href="/docs">submission guide</a> for full details including required metadata fields.'
  },
  {
    question: 'What file formats does MaveDB accept?',
    answer:
      'Score sets are uploaded as CSV files with HGVS variant identifiers and numeric score columns. Count data is optional but recommended. Refer to the <a href="/docs">data format specification</a> for column naming, required fields, and how to handle multi-target experiments.'
  },
  {
    question: 'How are calibrations created?',
    answer:
      'Calibrations link a score set\'s functional scores to ACMG/AMP evidence codes (PS3/BS3) using score thresholds derived from known pathogenic and benign variants. Calibrations can be created from a published score set\'s detail page. See the <a href="/docs">calibration documentation</a> for the methodology and required inputs.'
  },
  {
    question: 'Can I update or correct a published score set?',
    answer:
      'Published score sets are versioned and immutable. To issue a correction, create a new score set and mark it as superseding the original — the old entry will remain accessible with a "Superseded" indicator, and the new one will be linked from it.'
  },
  {
    question: 'How do I access data programmatically?',
    answer:
      'MaveDB provides a REST API and a Python client library. The API supports querying score sets, experiments, and variants by a range of identifiers. See the <a href="https://api.mavedb.org/docs" target="_blank" rel="noopener">API documentation</a> and the <a href="https://pypi.org/project/mavetools/" target="_blank" rel="noopener">mavetools Python package</a> for getting started.'
  },
  {
    question: 'How do I cite MaveDB?',
    answer:
      'Please cite: Rubin, A.F., Stone, J., Bianchi, A.H. <em>et al.</em> MaveDB 2024: a curated community database with over seven million variant effects from multiplexed functional assays. <em>Genome Biol</em> <b>26</b>, 13 (2025). You can find the full citation and additional references on the <a href="/about">About page</a>.'
  },
  {
    question: 'Is there a data license?',
    answer:
      'All data in MaveDB is made available under the <a href="https://creativecommons.org/public-domain/cc0/" target="_blank" rel="noopener">CC0 1.0 Universal Public Domain Dedication</a> unless otherwise noted by submitting authors. The MaveDB software itself is released under the <a href="https://www.gnu.org/licenses/agpl-3.0.en.html" target="_blank" rel="noopener">AGPLv3 license</a>.'
  }
]

export default defineComponent({
  name: 'HelpScreen',

  components: {Accordion, AccordionContent, AccordionHeader, AccordionPanel, FontAwesomeIcon, MvLayout, MvPageHeader},

  setup() {
    useHead({title: 'Help'})
    return {
      channels: CHANNELS,
      faqs: FAQS,
      ZULIP_CHAT,
      GITHUB_UI_ISSUES
    }
  }
})
</script>

<!-- Unscoped: PrimeVue Accordion renders outside scoped DOM -->
<style>
.faq-accordion.p-accordion {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.faq-accordion .p-accordionpanel {
  border-bottom: 1px solid #f0f0f0;
}

.faq-accordion .p-accordionpanel:last-child {
  border-bottom: none;
}

.faq-accordion .p-accordionheader {
  padding: 1rem 1.25rem;
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.faq-accordion .p-accordionheader:hover {
  background: #fafafa;
}

.faq-accordion .p-accordioncontent-content {
  padding: 0 1.25rem 1rem;
  font-size: 0.875rem;
  color: #555;
  line-height: 1.7;
}

.faq-accordion .p-accordioncontent-content a {
  color: var(--color-link);
  font-weight: 600;
}
</style>
