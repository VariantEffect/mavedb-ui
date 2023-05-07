<template>
  <div class="mavedb-toolbar">
    <Menubar :model="availableMenuItems" class="mavedb-menubar">
      <template #start>
        <router-link to="/" class="mavedb-logo">
          <img src="@/assets/logo-mave.png" alt="MAVE" />
          <span>DB</span>
        </router-link>
        <div style="display: inline-block; margin-left: 40px;">
          <div class="p-inputgroup" style="max-width: 300px; wdith: 300px;">
            <InputText v-model="searchText" ref="searchTextInput" type="search" class="p-inputtext-sm" placeholder="Search" @keyup.enter="search" style="width: 200px;" />
            <Button :enabled="searchText && searchText.length > 0" icon="pi pi-search" class="p-button-default p-button-sm" @click="search" />
          </div>
        </div>
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
import {mapState} from 'vuex'

import {oidc} from '@/lib/auth'

export default {
  components: {Button, InputText, Menubar},

  data: () => ({
    availableMenuItems: [],
    searchText: ''
  }),

  watch: {
    authenticated: {
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
    ...mapState('auth', ['authenticated', 'orcidProfile', 'roles']),
    userName: function() {
      const profile = this.orcidProfile // oidc?.user?.profile
      return profile ? [profile.given_name, profile.family_name].filter(Boolean).join(' ') : null
    },
    menuItems: function() {
      return [{
        label: 'Dashboard',
        to: '/dashboard',
        available: ({authenticated}) => authenticated // oidc.isAuthenticated
      },
      {
        label: 'Search',
        to: '/search'
      }, {
        label: 'Documentation',
        to: '/docs'
      }, {
        label: 'New experiment',
        to: '/create-experiment',
        available: ({authenticated}) => authenticated // oidc.isAuthenticated
      }, {
        label: 'New scoreset',
        to: '/create-scoreset',
        available: ({authenticated}) => authenticated // oidc.isAuthenticated
      }, {
        label: 'Users',
        to: '/users',
        available: ({roles}) => roles.includes('admin') // oidc.isAuthenticated
      }, {
        label: this.userName,
        icon:'pi pi-fw pi-user',
        items:[{
          label: 'Settings',
          to: '/settings',
          available: ({authenticated}) => authenticated // oidc.isAuthenticated
        }, {
          label: 'Sign out',
          command: () => this.signOut(),
          available: ({authenticated}) => authenticated // oidc.isAuthenticated
        }]
        /*
          available: () => oidc.isAuthenticated
        }],
        available: () => oidc.isAuthenticated
        */
      }, {
        label: 'Sign in',
        command: () => {oidc.signIn()},
        // to: '/dashboard',
        available: ({authenticated}) => !authenticated // !oidc.isAuthenticated
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
      const self = this
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
          authenticated: self.authenticated,
          roles: self.roles || []
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
    },
    signOut: function() {
      oidc.signOut()
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
  color: #222;
  font-size: 20px;
  transition: none;
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
