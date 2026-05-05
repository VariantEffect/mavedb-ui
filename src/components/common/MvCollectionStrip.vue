<template>
  <div v-if="officialCollections?.length || userIsAuthenticated">
    <div
      class="mx-auto flex items-center justify-between gap-2 border-b border-border px-4 py-2 tablet:px-6"
      :style="{maxWidth}"
    >
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <!-- Official collection badges -->
        <div v-if="officialCollections?.length" class="flex flex-wrap items-center gap-1.5">
          <CollectionBadge
            v-for="collection in officialCollections"
            :key="collection.urn"
            :collection="collection"
            size="sm"
          />
        </div>

        <!-- No collections -->
        <span
          v-if="!officialCollections?.length && memberCollections.length === 0"
          class="text-xs italic text-text-muted"
        >
          Not in any collections
        </span>

        <!-- "Also in" user collections -->
        <div v-if="memberCollections.length > 0" class="flex flex-wrap items-center gap-1 text-xs text-text-muted">
          <i class="pi pi-bookmark-fill text-text-muted" style="font-size: 10px" />
          <span>{{ officialCollections?.length ? 'Also in:' : 'Member of:' }}</span>
          <template v-for="(col, i) in visibleMemberCollections" :key="col.urn">
            <span v-if="i > 0" class="text-border">&middot;</span>
            <router-link class="font-medium text-link no-underline" :to="{name: 'collection', params: {urn: col.urn}}">
              {{ col.name }}
            </router-link>
          </template>
          <template v-if="memberCollections.length > maxVisible">
            <span class="text-border">&middot;</span>
            <button v-if="!showAllMembers" class="cursor-pointer font-medium text-link" @click="showAllMembers = true">
              +{{ memberCollections.length - maxVisible }} more
            </button>
            <template v-else>
              <template v-for="(col, i) in overflowMemberCollections" :key="col.urn">
                <span v-if="i > 0" class="text-border">&middot;</span>
                <router-link
                  class="font-medium text-link no-underline"
                  :to="{name: 'collection', params: {urn: col.urn}}"
                >
                  {{ col.name }}
                </router-link>
              </template>
            </template>
          </template>
        </div>
      </div>

      <CollectionAdder
        :data-set-type="dataSetType"
        :data-set-urn="dataSetUrn"
        @collections-updated="fetchMemberCollections"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'

import {getMyCollections} from '@/api/mavedb'
import CollectionAdder from '@/components/collection/CollectionAdder.vue'
import CollectionBadge from '@/components/common/MvCollectionBadge.vue'
import useAuth from '@/composition/auth'

interface UserCollection {
  urn: string
  name: string
  scoreSetUrns?: string[]
  experimentUrns?: string[]
}

const MAX_VISIBLE = 3

export default defineComponent({
  name: 'MvCollectionStrip',

  components: {CollectionAdder, CollectionBadge},

  props: {
    dataSetType: {type: String, required: true},
    dataSetUrn: {type: String, required: true},
    maxWidth: {type: String, default: '1000px'},
    officialCollections: {
      type: Array as PropType<Array<{urn: string; name: string; badgeName?: string}>>,
      default: () => []
    }
  },

  setup() {
    const {userIsAuthenticated} = useAuth()
    return {userIsAuthenticated}
  },

  data() {
    return {
      memberCollections: [] as UserCollection[],
      showAllMembers: false
    }
  },

  computed: {
    maxVisible(): number {
      return MAX_VISIBLE
    },
    visibleMemberCollections(): UserCollection[] {
      return this.memberCollections.slice(0, MAX_VISIBLE)
    },
    overflowMemberCollections(): UserCollection[] {
      return this.memberCollections.slice(MAX_VISIBLE)
    }
  },

  mounted() {
    this.fetchMemberCollections()
  },

  methods: {
    async fetchMemberCollections() {
      if (!this.userIsAuthenticated) return

      try {
        const data = await getMyCollections()
        const all = [...(data.admin || []), ...(data.editor || []), ...(data.viewer || [])] as UserCollection[]

        const urnField = this.dataSetType === 'scoreSet' ? 'scoreSetUrns' : 'experimentUrns'
        const officialUrns = new Set((this.officialCollections || []).map((c) => c.urn))
        this.memberCollections = all.filter(
          (c) => (c[urnField] || []).includes(this.dataSetUrn) && !officialUrns.has(c.urn)
        )
      } catch {
        this.memberCollections = []
      }
    }
  }
})
</script>
