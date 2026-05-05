<template>
  <footer aria-label="Site footer" class="mt-10 border-t border-border bg-white px-6 py-5">
    <div
      class="mx-auto flex max-w-screen-xl flex-col items-center gap-3 text-sm text-text-muted md:flex-row md:justify-between"
    >
      <!-- Links -->
      <div class="flex flex-wrap justify-center gap-3 md:order-2 md:gap-5">
        <a aria-label="Chat (opens in new tab)" class="text-link" :href="ZULIP_CHAT" rel="noopener" target="_blank"
          >Chat</a
        >
        <router-link class="text-link" to="/docs">Documentation</router-link>
        <a
          v-if="reportIssueLink"
          aria-label="Report a Dataset issue (opens in new tab)"
          class="text-link"
          :href="reportIssueLink"
          rel="noopener"
          target="_blank"
          >Report a Dataset issue</a
        >
        <a
          v-else
          aria-label="Report an issue (opens in new tab)"
          class="text-link"
          :href="GITHUB_UI_ISSUES"
          rel="noopener"
          target="_blank"
          >Report an issue</a
        >
      </div>

      <!-- Copyright -->
      <span
        :aria-label="`Copyright ${currentYear} MaveDB. Licensed under AGPLv3. Hosted by the University of Washington.`"
        class="text-center md:order-1"
      >
        &copy; {{ currentYear }} MaveDB &mdash; AGPLv3 License &mdash; Hosted by the University of Washington
      </span>
    </div>
  </footer>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useRoute} from 'vue-router'

import {datasetIssueLink, GITHUB_UI_ISSUES, ZULIP_CHAT} from '@/lib/links'

export default defineComponent({
  name: 'MvFooter',

  setup() {
    const route = useRoute()
    return {route}
  },

  data() {
    return {GITHUB_UI_ISSUES, ZULIP_CHAT, currentYear: new Date().getFullYear()}
  },

  computed: {
    reportIssueLink(): string | null {
      const name = this.route.name
      if (name === 'scoreSet' || name === 'experiment' || name === 'experimentSet') {
        return datasetIssueLink(this.route.params.urn as string)
      }
      return null
    }
  }
})
</script>
