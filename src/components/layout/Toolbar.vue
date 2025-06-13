<template>
  <div v-if="(activeRoles.length > 0 && !activeRoles.every(elem => elem === 'ordinary user'))">
    <Message severity="warn">
      You are currently acting as a user with the {{ activeRoles }} role(s). These roles may grant you additional permissions. To change your
      active role(s), use the menu in your <a :href="`${config.appBaseUrl}/#/settings`">settings screen</a>.
    </Message>
  </div>
  <div class="mavedb-toolbar">
    <Menubar :model="availableMenuItems" class="mavedb-menubar">
      <template #start>
        <router-link to="/" class="mavedb-logo">
          <img src="@/assets/logo-mavedb.png" alt="MaveDB" />
        </router-link>
        <div style="display: inline-block; margin-left: 40px;">
          <div class="p-inputgroup" style="max-width: 300px; width: 300px;">
            <InputText v-model="searchText" ref="searchTextInput" type="search" class="p-inputtext-sm" placeholder="Search" @keyup.enter="search" style="width: 200px;" />
            <Button :enabled="searchText && searchText.length > 0" icon="pi pi-search" class="p-button-default p-button-sm" @click="search" />
          </div>
        </div>
      </template>
      <template #item="{item, props, hasSubmenu}">
        <router-link v-if="item.route" v-slot="{href, navigate}" :to="item.route" custom>
          <a v-bind="props.action" class="p-menuitem-link" :href="href" @click="navigate">
            <span v-if="item.icon" :class="['p-menuitem-icon', item.icon]"></span>
            <span class="p-menuitem-text">{{ item.label }}</span>
          </a>
        </router-link>
        <a v-else class="p-menuitem-link" :href="item.url" :target="item.target" v-bind="props.action">
          <span v-if="item.icon" :class="['p-menuitem-icon', item.icon]"></span>
          <span class="p-menuitem-text">{{ item.label }}</span>
          <span v-if="hasSubmenu" class="pi pi-fw pi-angle-down ml-2"></span>
        </a>
      </template>
      <template #end>
      </template>
    </Menubar>
  </div>

</template>

<script>

import _ from 'lodash'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Menubar from 'primevue/menubar'
import Message from 'primevue/message'
import config from '@/config'
import {mapActions, mapState} from 'vuex'

import useAuth from '@/composition/auth'

export default {
  components: {Button, InputText, Menubar, Message},

  setup: () => {
    const {signIn, signOut, userProfile, userIsAuthenticated} = useAuth()

    return {signIn, signOut, userProfile, userIsAuthenticated}
  },

  data: () => ({
    config: config,

    availableMenuItems: [],
    searchText: ''
  }),

  watch: {
    userIsAuthenticated: {
      handler: function() {
        this.availableMenuItems = this.filterAvailableMenuItems(this.menuItems)
      },
      immediate: true
    },
    roles: {
      handler: function() {
        this.availableMenuItems = this.filterAvailableMenuItems(this.menuItems)
      }
    }
  },

  computed: {
    ...mapState('auth', ['roles', 'activeRoles']),
    userName: function() {
      const profile = this.userProfile
      return profile ? [profile.given_name, profile.family_name].filter(Boolean).join(' ') : null
    },
    menuItems: function() {
      return [{
        label: 'Dashboard',
        route: '/dashboard',
        available: ({authenticated}) => authenticated
      }, {
        label: 'Home',
        route: '/'
      }, {
        label: 'Search',
        route: '/search',
      }, ...config.CLINICAL_FEATURES_ENABLED ? [{
        label: 'Find a Variant',
        route: '/search-variants',
      }] : [], {
        label: 'Documentation',
        route: '/docs'
      }, {
        label: 'New experiment',
        route: '/create-experiment',
        available: ({authenticated}) => authenticated
      }, {
        label: 'New score set',
        route: '/create-score-set',
        available: ({authenticated}) => authenticated
      }, {
        label: 'Users',
        route: '/users',
        available: ({roles}) => roles.includes('admin')
      }, {
        label: this.userName,
        icon:'pi pi-fw pi-user',
        items:[{
          label: 'Settings',
          route: '/settings',
          available: ({authenticated}) => authenticated
        }, {
          label: 'Collections',
          route: '/collections',
          available: ({authenticated}) => authenticated
        }, {
          label: 'Sign out',
          command: () => this.signOut(),
          available: ({authenticated}) => authenticated
        }]
      }, {
        label: 'Sign in',
        command: () => this.signIn(),
        available: ({authenticated}) => !authenticated
      }]
    }
  },

  methods: {
    search() {
      if (this.searchText && this.searchText.length > 0) {
        this.$router.push({name: 'search', query: {search: this.searchText}})
      }
    },

    filterAvailableMenuItems(menuItems) {
      return menuItems.map((item) => {
        if (item.items) {
          let newSubitems = this.filterAvailableMenuItems(item.items)
          if (newSubitems.length == 0) {
            return null
          }
          item = _.clone(item)
          item.items = newSubitems
        }
        const available = !item.available || item.available({
          authenticated: this.userIsAuthenticated,
          roles: this.roles || []
        }) // && (!item.to || this.userMayAccessPath(item.to))
        if (!available) {
          if (!item.items || item.items.length == 0) {
            return null
          } else {
            item.command = null
            item.to = null
            item.url = null
          }
        }
        return item
      }).filter(Boolean)
    }
  }
}

</script>

<style scoped>

.mavedb-toolbar {
  border-bottom: 1px solid #dee2e6;
  background: #fff;
}

.mavedb-logo {
  flex: 0 0 auto;
  display: inline-block;
  vertical-align: middle;
}

.mavedb-logo img {
  height: 42px;
  vertical-align: middle;
}

.mavedb-menubar {
  flex: 1 0 auto;
  width: 100%;
  max-width: 1200px;
  padding: 10px 12px;
  border: 0 none;
  margin: 0 auto;
  text-align: left;
}

.mavedb-menubar:deep(.p-menubar-start) {
  flex: 1 0 auto;
  text-align: left;
}

.mavedb-menubar.p-menubar:deep(.p-menubar-root-list) {
  margin: 0 2em;
}

.mavedb-menubar.p-menubar:deep(.p-menubar-root-list > .p-menuitem > .p-menuitem-link .p-menuitem-icon:empty) {
  margin: 0;
}

.mavedb-menubar.p-menubar:deep(.p-menubar-root-list > .p-menuitem > .p-menuitem-link .p-menuitem-icon.pi) {
  margin-right: 0.5rem;
}

.mavedb-menubar .mavedb-title {
  font-size: 2rem;
}

</style>
