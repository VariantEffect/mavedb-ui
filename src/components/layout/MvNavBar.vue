<template>
  <!-- Role warning banner -->
  <div v-if="hasElevatedRoles">
    <Message severity="warn">
      You are currently acting as a user with the {{ activeRoles }} role(s). These roles may grant you additional
      permissions. To change your active role(s), use the menu in your
      <router-link to="/settings">settings screen</router-link>.
    </Message>
  </div>

  <!-- Beta site banner -->
  <div v-if="config.PREVIEW_SITE" class="bg-orange-cta px-4 py-1 text-center text-sm text-white">
    This is a beta test site. For the production site, please visit
    <a class="text-white underline" :href="MAVEDB_PRODUCTION">mavedb.org</a>. To give feedback, please use our
    <a class="text-white underline" :href="ZULIP_BETA_TESTERS">Zulip message board</a>.
  </div>

  <!-- Main nav -->
  <nav class="sticky top-0 z-100 border-b border-border bg-white">
    <div class="mx-auto flex h-[58px] max-w-screen-xl items-center gap-6 px-6">
      <!-- Logo -->
      <router-link class="shrink-0" to="/">
        <img
          v-if="config.PREVIEW_SITE"
          alt="MaveDB Beta Site"
          class="block h-[42px]"
          src="@/assets/logo-mavedb-beta.png"
        />
        <img v-else alt="MaveDB" class="block h-[42px]" src="@/assets/logo-mavedb.png" />
      </router-link>

      <!-- Nav links -->
      <ul class="ml-auto flex list-none items-center gap-5 text-sm font-medium">
        <li>
          <router-link active-class="nav-link-active" class="nav-link" to="/mavemd">MaveMD</router-link>
        </li>
        <li>
          <router-link active-class="nav-link-active" class="nav-link" to="/search">Search</router-link>
        </li>

        <!-- Add Dataset dropdown -->
        <li v-if="userIsAuthenticated" class="relative">
          <a class="nav-link flex items-center gap-1" href="#" @click.prevent="toggleAddMenu">
            Add Dataset
            <FontAwesomeIcon class="text-[10px]" icon="fa-solid fa-chevron-down" />
          </a>
          <Popover ref="addMenuRef" class="nav-popover nav-add-menu">
            <router-link
              v-for="item in addMenuItems"
              :key="item.route"
              class="block border-b border-border-light px-4 py-3 !text-text-primary no-underline last:border-b-0 hover:bg-[#f5f5f5]"
              :to="item.route"
              @click="hideAddMenu"
            >
              <div class="text-[13px] font-semibold text-text-primary">{{ item.label }}</div>
              <div class="mt-0.5 text-[12px] text-text-muted">{{ item.description }}</div>
            </router-link>
          </Popover>
        </li>

        <li>
          <router-link active-class="nav-link-active" class="nav-link" to="/about">About</router-link>
        </li>
        <li>
          <router-link active-class="nav-link-active" class="nav-link" to="/help">Help</router-link>
        </li>

        <!-- Sign in (unauthenticated) -->
        <li v-if="!userIsAuthenticated">
          <a class="nav-link" href="#" @click.prevent="signIn">Sign in</a>
        </li>
      </ul>

      <!-- Notification bell (authenticated) -->
      <div v-if="userIsAuthenticated" class="relative shrink-0">
        <button
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-text-secondary transition-colors hover:bg-border-light"
          title="Recent activity"
          @click="toggleBell"
        >
          <FontAwesomeIcon class="text-[17px]" icon="fa-solid fa-bell" />
          <span
            class="pointer-events-none absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white"
            >5</span
          >
        </button>
        <Popover ref="bellPopoverRef" class="nav-popover nav-bell-popover">
          <div class="w-[340px]">
            <div
              class="border-b border-border-light px-4 py-3 text-[12px] font-bold uppercase tracking-wider text-text-muted"
            >
              Recent Activity
            </div>
            <div class="py-2">
              <div
                v-for="(activity, idx) in stubActivities"
                :key="idx"
                class="flex flex-col gap-1 border-b border-border-light px-4 py-3 text-[13px] text-text-secondary last:border-b-0"
              >
                <span>
                  <a class="font-semibold text-link" :href="activity.href">{{ activity.title }}</a>
                  {{ ' ' }}
                  <span class="text-text-muted">{{ activity.verb }}</span>
                </span>
                <span class="text-[11px] text-[#bbb]">{{ activity.time }}</span>
              </div>
            </div>
          </div>
        </Popover>
      </div>

      <!-- User avatar (authenticated) -->
      <div v-if="userIsAuthenticated" class="relative shrink-0">
        <button class="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0" @click="toggleUserMenu">
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage font-body text-[13px] font-bold text-white"
          >
            {{ userInitial }}
          </span>
          <FontAwesomeIcon class="text-[10px] text-text-muted" icon="fa-solid fa-chevron-down" />
        </button>
        <Popover ref="userMenuRef" class="nav-popover nav-user-menu">
          <div v-for="(item, idx) in userMenuItems" :key="idx">
            <a
              v-if="item.command"
              class="flex items-center gap-2.5 border-b border-border-light px-4 py-2.5 text-[13px] font-medium !text-text-primary no-underline last:border-b-0 hover:bg-[#f5f5f5]"
              href="#"
              @click.prevent="handleUserMenuCommand(item)"
            >
              <FontAwesomeIcon class="h-4 w-4 shrink-0 text-text-muted" :icon="item.icon" />
              {{ item.label }}
            </a>
            <router-link
              v-else
              class="flex items-center gap-2.5 border-b border-border-light px-4 py-2.5 text-[13px] font-medium !text-text-primary no-underline last:border-b-0 hover:bg-[#f5f5f5]"
              :to="item.route!"
              @click="hideUserMenu"
            >
              <FontAwesomeIcon class="h-4 w-4 shrink-0 text-text-muted" :icon="item.icon" />
              {{ item.label }}
            </router-link>
          </div>
        </Popover>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import Message from 'primevue/message'
import Popover from 'primevue/popover'

import config from '@/config'
import useAuth from '@/composition/auth'
import {MAVEDB_PRODUCTION, ZULIP_BETA_TESTERS} from '@/lib/links'
import type {NavMenuItem} from '@/types/components'

// @ts-expect-error Vuex has no type declarations; see store/index.ts
import {useStore} from 'vuex'

// TODO: replace stub activities with real data from the backend
const STUB_ACTIVITIES = [
  {title: 'CHEK2 Kinase Activity Assay – Draft', verb: 'edited by you', time: '2 days ago', href: '#'},
  {title: 'KCNQ4 Variant Effect – Draft', verb: 'calibration created by you', time: '5 days ago', href: '#'},
  {title: 'BRCA1 Combined Functional Meta-analysis', verb: 'published', time: 'Nov 5, 2024', href: '#'},
  {
    title: 'TP53 Saturation Genome Editing Panel',
    verb: 'you were added as a contributor',
    time: 'Oct 28, 2024',
    href: '#'
  },
  {title: 'BRCA1 SGE Exon 20 – ClinVar', verb: 'calibration published', time: 'Oct 14, 2024', href: '#'}
]

const ADD_MENU_ITEMS = [
  {
    label: 'New Experiment',
    description: 'Group related score sets under a shared experiment',
    route: '/create-experiment'
  },
  {label: 'New Score Set', description: 'Upload variant scores and metadata', route: '/create-score-set'}
]

export default defineComponent({
  name: 'MvNavBar',

  components: {FontAwesomeIcon, Message, Popover},

  setup() {
    const {signIn, signOut, userProfile, userIsAuthenticated} = useAuth()
    const store = useStore()
    return {
      signIn,
      signOut,
      userProfile,
      userIsAuthenticated,
      store,
      config,
      MAVEDB_PRODUCTION,
      ZULIP_BETA_TESTERS,
      addMenuItems: ADD_MENU_ITEMS,
      stubActivities: STUB_ACTIVITIES
    }
  },

  computed: {
    hasElevatedRoles(): boolean {
      return this.activeRoles.length > 0 && !this.activeRoles.every((r) => r === 'ordinary user')
    },

    userInitial(): string {
      const profile = this.userProfile
      if (profile?.given_name) return profile.given_name.charAt(0).toUpperCase()
      return '?'
    },

    userMenuItems(): NavMenuItem[] {
      return [
        {label: 'Settings', route: '/settings', icon: 'fa-solid fa-gear'},
        {label: 'Dashboard', route: '/dashboard', icon: 'fa-solid fa-table-cells-large'},
        {label: 'Sign out', command: () => this.signOut(), icon: 'fa-solid fa-right-from-bracket'}
      ]
    },

    activeRoles(): string[] {
      return this.store.state.auth.activeRoles
    }
  },

  mounted() {
    window.addEventListener('scroll', this.hideAllPopovers, {passive: true})
  },

  beforeUnmount() {
    window.removeEventListener('scroll', this.hideAllPopovers)
  },

  methods: {
    toggleAddMenu(event: Event) {
      ;(this.$refs.bellPopoverRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.userMenuRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.addMenuRef as InstanceType<typeof Popover>)?.toggle(event)
    },

    toggleBell(event: Event) {
      ;(this.$refs.addMenuRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.userMenuRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.bellPopoverRef as InstanceType<typeof Popover>)?.toggle(event)
    },

    toggleUserMenu(event: Event) {
      ;(this.$refs.addMenuRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.bellPopoverRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.userMenuRef as InstanceType<typeof Popover>)?.toggle(event)
    },

    hideAddMenu() {
      ;(this.$refs.addMenuRef as InstanceType<typeof Popover>)?.hide()
    },

    hideUserMenu() {
      ;(this.$refs.userMenuRef as InstanceType<typeof Popover>)?.hide()
    },

    hideAllPopovers() {
      ;(this.$refs.addMenuRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.bellPopoverRef as InstanceType<typeof Popover>)?.hide()
      ;(this.$refs.userMenuRef as InstanceType<typeof Popover>)?.hide()
    },

    handleUserMenuCommand(item: NavMenuItem) {
      if (typeof item.command === 'function') item.command()
      this.hideUserMenu()
    }
  }
})
</script>

<style scoped>
.nav-link {
  color: #444;
  text-decoration: none;
}

.nav-link:hover {
  color: var(--color-sage);
  text-decoration: none;
}

.nav-link-active {
  color: var(--color-sage);
  font-weight: 700;
}
</style>

<!-- Unscoped: Popovers teleport to body, outside component DOM -->
<style>
.nav-popover.p-popover {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 0;
  margin-top: 8px;
}

.nav-popover .p-popover-content {
  padding: 0;
}

.nav-add-menu.p-popover {
  width: 260px;
}

.nav-user-menu.p-popover {
  width: 180px;
}
</style>
