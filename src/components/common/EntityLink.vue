<template>
  <router-link v-if="routerLink" :to="routerLink">{{linkText}}</router-link>
</template>

<script lang="ts">

import _ from 'lodash'

import useItem from '@/composition/item'

/**
 * A link to an experiment set, experiment, or score set.
 *
 * Initially, the URN is displayed as the link text. The entity's details are loaded, and then the link text is
 * recalculated using the "display" property.
 */
// TODO This can be enhanced easily to show a preview in a pop-over view when the cursor hovers over the link.
export default {
  name: 'SelectList',
  components: {},

  props: {
    /**
     * What to display as the link text.
     *
     * This may be
     * - A property name or property path in dot notation ("title" or "some.nexted.property")
     * - Or A function of the form (entity) => string.
     */
    display: {
      type: [String, Function],
      default: 'title'
    },
    /** The entity type. This should be "experiment," "experimentSet," or "scoreSet." */
    entityType: {
      type: String,
      required: true
    },
    /** The entity's URN. */
    urn: {
      type: String,
      required: true
    }
  },

  setup: (props) => useItem({itemTypeName: props.entityType}),

  data: function() {
    return {
      selectedOptionValues: this.value
    }
  },

  computed: {
    linkText: function() {
      if (!this.item) {
        return this.urn
      } else {
        if (_.isString(this.display)) {
          return _.get(this.item, this.display)
        } else if (_.isFunction(this.display)) {
          return this.display(this.item)
        } else {
          return this.urn
        }
      }
    },
    routerLink: function() {
      const name = {
        experiment: 'experiment',
        experimentSet: 'experimentSet',
        scoreSet: 'scoreSet'
      }[this.entityType]
      if (!name || !this.urn) {
        return null
      }
      return {name, params: {urn: this.urn}}
    }
  },

  watch: {
    urn: {
      handler: function() {
        this.setItemId(this.urn)
      },
      immediate: true
    }
  },
}

</script>
