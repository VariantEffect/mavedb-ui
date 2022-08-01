<template>

  <div class="mavedb-default-layout mavedb-fill-parent">
    <Toolbar />
    <div :class="wrapperClass">
      <div class="mavedb-main">
        <slot />
      </div>
    </div>
  </div>

</template>

<script>

import Toolbar from '@/components/layout/Toolbar'
import '@fontsource/raleway'
import '@/assets/app.css'

export default {
  components: {Toolbar},

  props: {
    width: {
      type: String,
      default: 'fixed'
    }
  },

  computed: {
    wrapperClass: function() {
      switch (this.width) {
        case 'full':
          return 'mavedb-main-wrapper mavedb-full-width'
        case 'fixed':
        default:
          return 'mavedb-main-wrapper mavedb-fixed-width'
      }
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
  display: flex;
  flex-direction: row;
  flex: 1 1 auto;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

.mavedb-fixed-width {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.mavedb-full-width {
  width: 100%;
  margin: 0 auto;
}

.mavedb-main {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
}

.sfs-draft-batches-list-pane {
  flex: 0 1 auto;
  position: relative;
  overflow: hidden;
  min-width: 250px;
  border-top: 1px solid #ccc;
  border-left: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.sfs-draft-batches-list-pane > .sfs-pane-close-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
}

.sfs-draft-batches-list {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  overflow: auto;
}

</style>

<style src="../../assets/layout.css"></style>
