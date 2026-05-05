<template>
  <router-link
    class="mavedb-collection-badge no-underline"
    :class="{'mavedb-collection-badge--sm': size === 'sm'}"
    :to="{name: 'collection', params: {urn: collection.urn}}"
  >
    <img v-if="badgeImage" :alt="collection.name" :class="`inline ${badgeClassName}`" :src="badgeImage" />
    <img
      v-else-if="badgeNameIsLink"
      :alt="collection.name"
      :class="`inline ${badgeClassName}`"
      :src="collection.badgeName"
    />
    <MvPill v-else :label="collection.badgeName" variant="collection" />
  </router-link>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import igvfTagImage from '@/assets/igvf-tag.png'
import MvPill from '@/components/common/MvPill.vue'

const BUILT_IN_BADGE_CLASSES: {[key: string]: string} = {
  IGVF: 'mavedb-collection-badge-igvf'
}

const BUILT_IN_BADGE_IMAGE_ASSETS: {[key: string]: string} = {
  IGVF: igvfTagImage
}

export default defineComponent({
  name: 'MvCollectionBadge',
  components: {MvPill},

  props: {
    collection: {
      type: Object,
      required: true
    },
    size: {
      type: String as () => 'sm' | 'md',
      default: 'md'
    }
  },

  computed: {
    badgeClassName: function () {
      return BUILT_IN_BADGE_CLASSES[this.collection.badgeName] ?? ''
    },

    badgeImage: function () {
      return BUILT_IN_BADGE_IMAGE_ASSETS[this.collection.badgeName] || undefined
    },

    badgeNameIsLink: function () {
      return this.collection.badgeName?.startsWith('https://') || false
    }
  }
})
</script>

<style scoped>
.mavedb-collection-badge {
  cursor: pointer;
  display: inline;
  padding: 0 7px 0 0;
}

.mavedb-collection-badge .mavedb-collection-badge-igvf {
  height: 30px;
  vertical-align: middle;
}

.mavedb-collection-badge--sm {
  display: inline-flex;
  align-items: center;
  padding: 0;
}

.mavedb-collection-badge--sm .mavedb-collection-badge-igvf {
  height: 18px;
}
</style>
