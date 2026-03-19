<template>
  <router-link v-if="routerLink" :to="routerLink">{{ linkText }}</router-link>
</template>

<script lang="ts">
import _ from 'lodash'
import {defineComponent} from 'vue'

import useItem from '@/composition/item'
import {useEntityCache} from '@/composables/entity-cache'

/**
 * A link to an experiment set, experiment, or score set.
 *
 * Initially, the URN is displayed as the link text. The entity's details are loaded, and then the link text is
 * recalculated using the "display" property.
 */
// TODO This can be enhanced easily to show a preview in a pop-over view when the cursor hovers over the link.
export default defineComponent({
  name: 'EntityLink',
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
    },
    /** Use cached entity data to avoid redundant API calls. Useful in lists. */
    useCache: {
      type: Boolean,
      default: false
    }
  },

  setup: (props) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemComposition = useItem({itemTypeName: props.entityType as any})
    const {getEntity} = useEntityCache()

    return {
      ...itemComposition,
      getEntity
    }
  },

  data: function () {
    return {
      selectedOptionValues: this.value,
      cachedEntity: null as Record<string, unknown> | null,
      loadingCache: false
    }
  },

  computed: {
    linkText: function () {
      const entity = this.useCache ? this.cachedEntity : this.item

      if (!entity) {
        return this.urn
      } else {
        if (_.isString(this.display)) {
          return _.get(entity, this.display)
        } else if (_.isFunction(this.display)) {
          return this.display(entity)
        } else {
          return this.urn
        }
      }
    },
    routerLink: function () {
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
      handler: function () {
        if (this.useCache) {
          this.loadCachedEntity()
        } else {
          this.setItemId(this.urn)
        }
      },
      immediate: true
    }
  },

  methods: {
    async loadCachedEntity() {
      if (!this.urn) return

      this.loadingCache = true
      try {
        this.cachedEntity = (await this.getEntity(this.entityType, this.urn)) as Record<string, unknown>
      } catch (error) {
        console.error('Failed to load cached entity:', this.urn, error)
      } finally {
        this.loadingCache = false
      }
    }
  }
})
</script>
