<template>
  <div class="mave-collection-badge">
    <router-link :to="{name: 'collection', params: {urn: collection.urn}}">
      <img v-if="badgeIsBuiltIn" :alt="collection.name" :class="badgeClassName" :src="builtInBadgeImage"/>
      <img v-else-if="badgeNameIsLink" :alt="collection.name" :class="badgeClassName" :src="collection.badgeName"/>
      <Tag v-else :class="badgeClassName" :value="collection.badgeName" rounded />
    </router-link>
  </div>
</template>

<script>
import Tag from 'primevue/tag'

export default {
  name: 'CollectionBadge',
  components: { Tag },

  props: {
    collection: {
      type: Object,
      required: true
    }
  },

  computed: {
    badgeClassName: function() {
      return {
        IGVF: "mave-collection-badge-igvf"
      }[this.collection.badgeName] || "mave-collection-badge-other"
    },

    badgeIsBuiltIn: function() {
      return this.collection.badgeName === "IGVF"
    },

    // determine whether badgeName is a link to an img or not
    badgeNameIsLink: function() {
      // TODO make this a regex to also allow https
      return this.collection.badgeName?.startsWith("http://") || false
    },

    builtInBadgeImage: function() {
      return {
        IGVF: new URL('../assets/igvf-tag.png', import.meta.url).href
      }[this.collection.badgeName] || null
    },
  }
}
</script>

<style scoped>
.mave-collection-badge {
  cursor: pointer;
  display: inline; /* may need inline-block */
  padding: 0 7px 0 0;
}

.mave-collection-badge .mave-collection-badge-igvf {
  height: 30px;
  vertical-align: middle;
}

.mave-collection-badge .mave-collection-badge-other {
  background-color: cadetblue;
}
</style>
