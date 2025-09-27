<template>
  <footer class="mavedb-dataset-footer">
    <div class="mavedb-footer-content">
      <div class="mavedb-footer-logo">
        <router-link class="mavedb-logo" to="/">
          <img alt="MaveDB" src="@/assets/logo-mavedb-transparent.png" />
        </router-link>
      </div>
      <div class="mavedb-footer-links">
        <template v-for="(link, idx) in linksToShow" :key="idx">
          <router-link v-if="link.type === 'router'" :to="link.to">{{ link.label }}</router-link>
          <a v-else :href="link.href" :rel="link.rel || undefined" :target="link.target || '_self'">{{ link.label }}</a>
        </template>
      </div>
    </div>
  </footer>
</template>

<script lang="ts">
import useAuth from '@/composition/auth'
import {defineComponent} from 'vue'
import {useRoute} from 'vue-router'

interface FooterLink {
  type: 'router' | 'external'
  label: string
}

export interface RouterLink extends FooterLink {
  type: 'router'
  to: string
}

export interface ExternalLink extends FooterLink {
  type: 'external'
  href: string
  target?: string
  rel?: string
}

export default defineComponent({
  name: 'Footer',

  setup: () => {
    const {userIsAuthenticated} = useAuth()
    const route = useRoute()

    // Route-based extra links
    const routeFooterLinks: (RouterLink | ExternalLink)[] = []
    if (route.name === 'scoreSet' || route.name === 'experiment' || route.name === 'experimentSet') {
      routeFooterLinks.push({
        type: 'external',
        href: `https://mavedb.zulipchat.com/#narrow/channel/511832-dataset-issues/topic/${route.params.urn}`,
        label: 'Report a Dataset issue',
        target: '_blank',
        rel: 'noopener'
      })
    }
    // Add more route checks as needed

    // Defined separately for typing support
    const authFooterLink: RouterLink[] = userIsAuthenticated.value
      ? [{type: 'router', to: '/settings', label: 'Account'}]
      : []

    /*
      Default links that are always shown in the footer.
      These can be added to by passing the `additionalFooterLinks` prop.
    */
    const footerLinks: (RouterLink | ExternalLink)[] = [
      ...routeFooterLinks,
      {type: 'external', href: 'https://mavedb.zulipchat.com/', label: 'Chat', target: '_blank', rel: 'noopener'},
      {type: 'router', to: '/docs', label: 'Documentation'},
      ...authFooterLink
    ]

    return {userIsAuthenticated, footerLinks}
  },

  computed: {
    linksToShow() {
      return this.footerLinks
    }
  }
})
</script>

<style scoped>
.mavedb-dataset-footer {
  width: 100%;
  border-top: 1px solid #e0e0e0;
  padding: 16px 0;
  margin: 2em 0 0 0;
  font-size: 0.95em;
  flex-shrink: 0;
}

.mavedb-footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1em;
}

.mavedb-footer-logo img {
  height: 32px;
}

.mavedb-footer-links {
  display: flex;
  gap: 1.5em;
}

.mavedb-footer-links a,
.mavedb-footer-links router-link {
  color: #0074d9;
  text-decoration: none;
  font-weight: 500;
}

.mavedb-footer-links a:hover,
.mavedb-footer-links router-link:hover {
  text-decoration: underline;
}
</style>
