<template>
  <footer class="mt-10 border-t border-[#e0e0e0] bg-white px-6 py-5">
    <div class="mx-auto flex max-w-screen-xl items-center justify-between text-[13px] text-text-muted">
      <!-- Left: copyright -->
      <span>&copy; {{ currentYear }} MaveDB &mdash; AGPLv3 License &mdash; Hosted by the University of Washington</span>

      <!-- Right: links -->
      <div class="flex gap-5">
        <a :href="ZULIP_CHAT" rel="noopener" target="_blank">Chat</a>
        <router-link to="/docs">Documentation</router-link>
        <a v-if="reportIssueLink" :href="reportIssueLink" rel="noopener" target="_blank">Report a Dataset issue</a>
        <a v-else :href="GITHUB_UI_ISSUES" rel="noopener" target="_blank"
          >Report an issue</a
        >
      </div>
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
