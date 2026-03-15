<template>
  <div class="flex min-h-screen flex-col bg-bg">
    <a
      class="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[200] focus:rounded focus:bg-sage focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:no-underline"
      href="#main-content"
    >
      Skip to content
    </a>
    <MvNavBar v-if="withNav" />
    <EmailPrompt
      v-if="withEmailPrompt"
      dialog="We're glad you're here! We require a valid email address to upload data to MaveDB, so that we can get in touch if there are any issues. You may add an email now, or do so at any time on the 'Settings' page."
      :is-first-login-prompt="true"
      title="Welcome to MaveDB!"
    />

    <div id="main-content" class="flex flex-1 flex-col">
      <slot name="header" />

      <main class="mx-auto flex w-full max-w-screen-xl flex-1 flex-col px-6">
        <template v-if="requireAuth && !userIsAuthenticated">
          <div class="flex items-center justify-center py-20">
            <p>You may <a href="#" @click.prevent="signInWithRedirect">sign in</a> to view this page.</p>
          </div>
        </template>
        <template v-else>
          <slot />
        </template>
      </main>
    </div>

    <MvFooter v-if="withNav" />
  </div>
</template>

<script lang="ts">
import '@fontsource/raleway'
import '@fontsource/exo-2/700.css'
import '@fontsource/exo-2/800.css'
import '@fontsource/exo-2/900.css'

import '@/assets/app.css'

import {defineComponent} from 'vue'

import MvNavBar from '@/components/layout/MvNavBar.vue'
import MvFooter from '@/components/layout/MvFooter.vue'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import useAuth from '@/composition/auth'

export default defineComponent({
  name: 'MvLayout',

  components: {EmailPrompt, MvFooter, MvNavBar},

  props: {
    requireAuth: {
      type: Boolean,
      default: false
    },
    withEmailPrompt: {
      type: Boolean,
      default: true
    },
    withNav: {
      type: Boolean,
      default: true
    }
  },

  setup() {
    return {...useAuth()}
  },

  methods: {
    signInWithRedirect() {
      const currentFullPath = window.location.pathname + window.location.search + window.location.hash
      localStorage.setItem('redirectAfterLogin', currentFullPath)
      this.signIn()
    }
  }
})
</script>

<style src="../../assets/layout.css"></style>
