<template>
  <div class="mave-collection-badge">
    <router-link :to="{name: 'collection', params: {urn: collection.urn}}">
      <img v-if="badgeNameIsLink" :alt="collection.name" :src="collection.badgeName"/>
      <Tag v-else :class="tagClassName" :value="collection.badgeName" rounded />
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
    // determine whether badgeName is a link to an img or not
    badgeNameIsLink: function() {
      // TODO make this a regex to also allow https
      return this.collection.badgeName?.startsWith("http://") || false
    },

    tagClassName: function() {
      return {
        IGVF: "mave-collection-badge-igvf"
      }[this.collection.badgeName] || "mave-collection-badge-other"
    }
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
  background-color: rgb(227, 35, 176);
}

.mave-collection-badge .mave-collection-badge-other {
  background-color: cadetblue;
}
</style>
