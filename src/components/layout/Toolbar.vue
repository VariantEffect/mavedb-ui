<template>

  <div class="mavedb-toolbar">
    <Menubar :model="availableMenuItems" class="mavedb-menubar">
      <template #start>
        <router-link to="/" class="mavedb-logo">
          <img src="@/assets/logo-mave.png" alt="MAVE" />
          <span>DB</span>
        </router-link>
      </template>
      <template #end>
      </template>
    </Menubar>
  </div>

</template>

<script>

import _ from 'lodash'
import Menubar from 'primevue/menubar'

import {oidc} from '@/lib/auth'

export default {
  components: {Menubar},

  data: () => ({
    availableMenuItems: []
  }),

  watch: {
    user: {
      handler: function() {
        this.availableMenuItems = this.filterAvailableMenuItems(this.menuItems)
      },
      immediate: true
    }
  },

  computed: {
    userName: function() {
      const profile = oidc?.user?.profile
      return profile ? [profile.given_name, profile.family_name].filter(Boolean).join(' ') : null
    },
    menuItems: function() {
      return [{
        label: 'Dashboard',
        to: '/my-data',
        available: ()=> oidc.isAuthenticated
      },
        {
        label: 'Search',
        to: '/search'
      }, {
        label: 'New experiment',
        to: '/create-experiment',
        available: () => oidc.isAuthenticated
      }, {
        label: 'New scoreset',
        to: '/create-scoreset',
        available: () => oidc.isAuthenticated
      }, {
        label: this.userName,
        icon:'pi pi-fw pi-user',
        items:[{
          label: 'Settings',
          to: '/settings',
          available: () => oidc.isAuthenticated
        }, {
          label: 'Sign out',
          command: () => self.signOut(),
          available: () => oidc.isAuthenticated
        }]
      }, {
        label: 'Sign in',
        to: '/my-data',
        available: () => !oidc.isAuthenticated
      }]
    }
  },

  methods: {
    filterAvailableMenuItems: function(menuItems) {
      return menuItems.filter((menuItem) => {
        if (_.isFunction(menuItem.available)) {
          return menuItem.available()
        } else {
          return true
        }
      })
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

.mavedb-menubar::v-deep .p-menubar-start {
  flex: 1 0 auto;
  text-align: left;
}

.mavedb-menubar.p-menubar::v-deep .p-menubar-root-list {
  margin: 0 2em;
}

.mavedb-menubar.p-menubar::v-deep .p-menubar-root-list > .p-menuitem > .p-menuitem-link .p-menuitem-icon:empty {
  margin: 0;
}

.mavedb-menubar .mavedb-title {
  font-size: 2rem;
}

.sfs-nav-button {
  margin: 0 0.5em;
}

.sfs-navbar .p-button {
  background: #bbb;
}

.sfs-navbar a {
  text-decoration: none;
}

.sfs-navbar .router-link-active .p-button {
  background: #999;
}

</style>
