<template>

  <div class="mavedb-default-layout mavedb-fill-parent">
    <Toolbar />
    <EmailPrompt
      title="Welcome to MaveDB!"
      dialog="We're glad you're here! We require a valid email address to upload data to MaveDB, so that we can get in touch if there are any issues. You may add an email now, or do so at any time on the 'Settings' page."
      :isFirstLoginPrompt="true"
    />
    <div :class="wrapperClasses">
      <div :class="mainClasses">
        <slot />
      </div>
    </div>
  </div>

</template>

<script>

import Toolbar from '@/components/layout/Toolbar'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import '@fontsource/raleway'
import '@/assets/app.css'

export default {
  components: {Toolbar, EmailPrompt},

  props: {
    height: {
      type: String, // default or full
      default: 'full'
    },
    overflowY: {
      type: String, // hidden or scroll
      default: 'scroll'
    },
    width: {
      type: String, // fixed or full
      default: 'fixed'
    }
  },

  computed: {
    mainClasses: function() {
      const classNames = ['mavedb-main']
      switch (this.height) {
        case 'full':
          classNames.push('mavedb-main-full-height')
      }
      return classNames
    },

    wrapperClasses: function() {
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
          classNames.push('mave-scroll-vertical')
      }
      return classNames
    }
  }
}

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
}

.mavedb-main.mavedb-main-full-height {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

.mavedb-overflow-y-hidden {
  overflow-y: hidden;
}

</style>

<style src="../../assets/layout.css"></style>
