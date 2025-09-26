<template>
  <div class="mavedb-default-layout mavedb-fill-parent">
    <Toolbar v-if="withToolbar" />
    <EmailPrompt
      v-if="withEmailPrompt"
      dialog="We're glad you're here! We require a valid email address to upload data to MaveDB, so that we can get in touch if there are any issues. You may add an email now, or do so at any time on the 'Settings' page."
      :is-first-login-prompt="true"
      title="Welcome to MaveDB!"
    />
    <div :class="wrapperClasses">
      <div :class="mainClasses">
        <slot />
        <Footer v-if="footer == 'flow'" />
      </div>
    </div>
    <Footer v-if="footer == 'pinned'" class="mavedb-footer-pinned" />
  </div>
</template>

<script lang="ts">
import '@fontsource/raleway'

import '@/assets/app.css'
import Toolbar from '@/components/layout/Toolbar.vue'
import Footer from '@/components/layout/Footer.vue'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import {defineComponent, PropType} from 'vue'

export default defineComponent({
  name: 'DefaultLayout',

  components: {Footer, Toolbar, EmailPrompt},

  props: {
    footer: {
      type: String as PropType<'flow' | 'pinned'>,
      default: 'flow'
    },
    height: {
      type: String as PropType<'default' | 'full'>,
      default: 'full'
    },
    overflowY: {
      type: String as PropType<'hidden' | 'scroll'>,
      default: 'scroll'
    },
    width: {
      type: String as PropType<'fixed' | 'full'>,
      default: 'fixed'
    },
    withToolbar: {
      type: Boolean,
      default: true
    },
    withEmailPrompt: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    mainClasses: function () {
      const classNames = ['mavedb-main']
      switch (this.height) {
        case 'full':
          classNames.push('mavedb-main-full-height')
          break
      }
      return classNames
    },

    wrapperClasses: function () {
      const classNames = ['mavedb-main-wrapper']
      switch (this.width) {
        case 'full':
          classNames.push('mavedb-full-width')
          break
        case 'fixed':
        default:
          classNames.push('mavedb-fixed-width')
      }
      switch (this.overflowY) {
        case 'hidden':
          classNames.push('mavedb-overflow-y-hidden')
          break
        case 'scroll':
        default:
          classNames.push('mavedb-scroll-vertical')
      }
      return classNames
    }
  }
})
</script>

<style scoped>
.mavedb-default-layout {
  display: flex;
  flex-direction: column;
  position: relative;
}

.mavedb-fill-parent {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

.mavedb-main-wrapper {
  flex: 1 1 auto;
  position: relative;
  overflow-x: hidden;
  /*overflow-y: auto;*/
}

.mavedb-full-width {
  width: 100%;
  margin: 0 auto;
}

.mavedb-fixed-width .mavedb-main {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.mavedb-main {
  position: relative;
  display: flex;
  flex-direction: column;
}

.mavedb-main.mavedb-main-full-height {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
}

.mavedb-overflow-y-hidden {
  overflow-y: hidden;
}

.mavedb-dataset-footer {
  margin-top: auto;
}

.mavedb-footer-pinned {

}
</style>

<style src="../../assets/layout.css"></style>
