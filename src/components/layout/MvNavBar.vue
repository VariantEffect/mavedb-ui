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
  <nav aria-label="Main navigation" class="sticky top-0 z-100 border-b border-border bg-white">
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

      <!-- Nav links (desktop) -->
      <ul class="ml-auto hidden list-none items-center gap-5 text-sm font-medium md:flex">
        <li>
          <router-link active-class="nav-link-active" class="nav-link" to="/mavemd">MaveMD</router-link>
        </li>
        <li>
          <router-link active-class="nav-link-active" class="nav-link" to="/search">Search</router-link>
        </li>

        <!-- Add Dataset dropdown -->
        <li v-if="userIsAuthenticated" class="relative">
          <a
            aria-haspopup="true"
            aria-label="Add dataset menu"
            class="nav-link flex items-center gap-1"
            href="#"
            @click.prevent="toggleAddMenu"
          >
            Add Dataset
            <FontAwesomeIcon class="text-[0.625rem]" icon="fa-solid fa-chevron-down" />
          </a>
          <Popover ref="addMenuRef" class="nav-popover nav-add-menu">
            <router-link
              v-for="item in addMenuItems"
              :key="item.route"
              class="block border-b border-border-light px-4 py-3 !text-text-primary no-underline last:border-b-0 hover:bg-neutral-100"
              :to="item.route"
              @click="hideAddMenu"
            >
              <div class="text-sm font-semibold text-text-primary">{{ item.label }}</div>
              <div class="mt-0.5 text-xs text-text-muted">{{ item.description }}</div>
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

      <!-- Notification bell (authenticated, desktop) -->
      <div v-if="userIsAuthenticated" class="relative hidden shrink-0 md:block">
        <button
          aria-haspopup="true"
          aria-label="Recent activity notifications"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-text-secondary transition-colors hover:bg-border-light"
          title="Recent activity"
          @click="toggleBell"
        >
          <FontAwesomeIcon class="text-lg" icon="fa-solid fa-bell" />
          <span
            class="pointer-events-none absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[0.625rem] font-bold text-white"
            >5</span
          >
        </button>
        <Popover ref="bellPopoverRef" class="nav-popover nav-bell-popover">
          <div class="w-[340px]">
            <div
              class="border-b border-border-light px-4 py-3 text-xs font-bold uppercase tracking-wider text-text-muted"
            >
              Recent Activity
            </div>
            <div class="py-2">
              <div
                v-for="(activity, idx) in stubActivities"
                :key="idx"
                class="flex flex-col gap-1 border-b border-border-light px-4 py-3 text-sm text-text-secondary last:border-b-0"
              >
                <span>
                  <a class="font-semibold text-link" :href="activity.href">{{ activity.title }}</a>
                  {{ ' ' }}
                  <span class="text-text-muted">{{ activity.verb }}</span>
                </span>
                <span class="text-xs text-neutral-400">{{ activity.time }}</span>
              </div>
            </div>
          </div>
        </Popover>
      </div>

      <!-- User avatar (authenticated, desktop) -->
      <div v-if="userIsAuthenticated" class="relative hidden shrink-0 md:block">
        <button
          aria-haspopup="true"
          aria-label="User account menu"
          class="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0"
          @click="toggleUserMenu"
        >
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage font-body text-sm font-bold text-white"
          >
            {{ userInitial }}
          </span>
          <FontAwesomeIcon class="text-[0.625rem] text-text-muted" icon="fa-solid fa-chevron-down" />
        </button>
        <Popover ref="userMenuRef" class="nav-popover nav-user-menu">
          <div v-for="(item, idx) in userMenuItems" :key="idx">
            <a
              v-if="item.command"
              class="flex items-center gap-2.5 border-b border-border-light px-4 py-2.5 text-sm font-medium !text-text-primary no-underline last:border-b-0 hover:bg-neutral-100"
              href="#"
              @click.prevent="handleUserMenuCommand(item)"
            >
              <FontAwesomeIcon class="h-4 w-4 shrink-0 text-text-muted" :icon="item.icon" />
              {{ item.label }}
            </a>
            <router-link
              v-else
              class="flex items-center gap-2.5 border-b border-border-light px-4 py-2.5 text-sm font-medium !text-text-primary no-underline last:border-b-0 hover:bg-neutral-100"
              :to="item.route!"
              @click="hideUserMenu"
            >
              <FontAwesomeIcon class="h-4 w-4 shrink-0 text-text-muted" :icon="item.icon" />
              {{ item.label }}
            </router-link>
          </div>
        </Popover>
      </div>

      <!-- Hamburger button (mobile) -->
      <button
        aria-controls="mobile-nav-menu"
        :aria-expanded="mobileMenuOpen"
        aria-label="Main menu"
        class="ml-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-secondary md:hidden"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <FontAwesomeIcon class="text-lg" :icon="mobileMenuOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'" />
      </button>
    </div>

    <!-- Mobile menu panel -->
    <Transition name="mobile-menu">
      <div v-if="mobileMenuOpen" id="mobile-nav-menu" class="border-t border-border-light bg-white px-6 py-4 md:hidden">
        <nav aria-label="Mobile navigation" class="flex flex-col gap-1">
        <router-link class="mobile-nav-link" to="/mavemd" @click="mobileMenuOpen = false">MaveMD</router-link>
        <router-link class="mobile-nav-link" to="/search" @click="mobileMenuOpen = false">Search</router-link>
        <template v-if="userIsAuthenticated">
          <router-link class="mobile-nav-link" to="/create-experiment" @click="mobileMenuOpen = false"
            >New Experiment</router-link
          >
          <router-link class="mobile-nav-link" to="/create-score-set" @click="mobileMenuOpen = false"
            >New Score Set</router-link
          >
        </template>
        <router-link class="mobile-nav-link" to="/about" @click="mobileMenuOpen = false">About</router-link>
        <router-link class="mobile-nav-link" to="/help" @click="mobileMenuOpen = false">Help</router-link>

        <hr class="my-2 border-border-light" />

        <template v-if="userIsAuthenticated">
          <router-link class="mobile-nav-link" to="/settings" @click="mobileMenuOpen = false">Settings</router-link>
          <router-link class="mobile-nav-link" to="/dashboard" @click="mobileMenuOpen = false">Dashboard</router-link>
          <a class="mobile-nav-link" href="#" @click.prevent="mobileSignOut">Sign out</a>
        </template>
        <a v-else class="mobile-nav-link" href="#" @click.prevent="mobileSignIn">Sign in</a>
      </nav>
    </div>
    </Transition>
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

  data() {
    return {mobileMenuOpen: false}
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

  watch: {
    $route() {
      this.mobileMenuOpen = false
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
    },

    mobileSignIn() {
      this.signIn()
      this.mobileMenuOpen = false
    },

    mobileSignOut() {
      this.signOut()
      this.mobileMenuOpen = false
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

.mobile-nav-link {
  display: block;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #444;
  text-decoration: none;
}

.mobile-nav-link:hover {
  color: var(--color-sage);
  text-decoration: none;
}

.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.mobile-menu-enter-to,
.mobile-menu-leave-from {
  opacity: 1;
  max-height: 500px;
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
