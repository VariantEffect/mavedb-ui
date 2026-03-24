<template>
  <div class="text-sm leading-relaxed text-text-muted">
    <span v-if="creationDate" class="block tablet:inline">
      Created {{ formatDate(creationDate) }}
      <template v-if="createdBy">
        by
        <MvOrcidLink :first-name="createdBy.firstName" :last-name="createdBy.lastName" :orcid-id="createdBy.orcidId" size="sm" />
      </template>
    </span>
    <span v-if="creationDate && modificationDate" class="mx-1 hidden text-border tablet:inline">&middot;</span>
    <span v-if="modificationDate" class="block tablet:inline">
      Updated {{ formatDate(modificationDate) }}
      <template v-if="modifiedBy">
        by
        <MvOrcidLink
          :first-name="modifiedBy.firstName"
          :last-name="modifiedBy.lastName"
          :orcid-id="modifiedBy.orcidId"
          size="sm"
        />
      </template>
    </span>
    <span v-if="publishedDate && (creationDate || modificationDate)" class="mx-1 hidden text-border tablet:inline">&middot;</span>
    <span v-if="publishedDate" class="block tablet:inline"> Published {{ formatDate(publishedDate) }} </span>
    <button
      v-if="jumpToId"
      class="mt-1 block cursor-pointer text-xs font-semibold text-sage hover:text-sage-dark"
      @click="scrollToId"
    >
      Jump to details &darr;
    </button>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import MvOrcidLink from '@/components/common/MvOrcidLink.vue'
import {formatDate} from '@/lib/formats'

interface UserRef {
  orcidId: string
  firstName?: string | null
  lastName?: string | null
}

export default defineComponent({
  name: 'MvMetadataLine',

  components: {MvOrcidLink},

  props: {
    createdBy: {type: Object as PropType<UserRef | null>, default: null},
    creationDate: {type: String as PropType<string | null>, default: null},
    jumpToId: {type: String as PropType<string | null>, default: null},
    modificationDate: {type: String as PropType<string | null>, default: null},
    modifiedBy: {type: Object as PropType<UserRef | null>, default: null},
    publishedDate: {type: String as PropType<string | null>, default: null}
  },

  methods: {
    formatDate,
    scrollToId() {
      if (!this.jumpToId) return
      document.getElementById(this.jumpToId)?.scrollIntoView({behavior: 'smooth'})
    }
  }
})
</script>
