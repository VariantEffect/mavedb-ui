<template>
  <div class="mavedb-collection-badge">
    <router-link :to="{name: 'collection', params: {urn: collection.urn}}">
      <img v-if="badgeImage" :alt="collection.name" :class="badgeClassName" :src="badgeImage" />
      <img v-else-if="badgeNameIsLink" :alt="collection.name" :class="badgeClassName" :src="collection.badgeName" />
      <Tag v-else :class="badgeClassName" rounded :value="collection.badgeName" />
    </router-link>
  </div>
</template>

<script lang="ts">
import Tag from 'primevue/tag'
import {defineComponent} from 'vue'

const BUILT_IN_BADGE_CLASSES: {[key: string]: string} = {
  IGVF: 'mavedb-collection-badge-igvf'
}

const BUILT_IN_BADGE_IMAGE_ASSETS: {[key: string]: string} = {
  IGVF: '../assets/igvf-tag.png'
}

export default defineComponent({
  name: 'CollectionBadge',
  components: {Tag},

  props: {
    collection: {
      type: Object,
      required: true
    }
  },

  computed: {
    badgeClassName: function () {
      return BUILT_IN_BADGE_CLASSES[this.collection.badgeName] ?? 'mavedb-collection-badge-other'
    },

    badgeImage: function () {
      const asset = BUILT_IN_BADGE_IMAGE_ASSETS[this.collection.badgeName]
      return asset ? new URL(asset, import.meta.url).href : undefined
    },

    badgeNameIsLink: function () {
      // TODO make this a regex to also allow https.
      return this.collection.badgeName?.startsWith('http://') || false
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

.mavedb-collection-badge .mavedb-collection-badge-other {
  background-color: cadetblue;
  color: white;
}
</style>
