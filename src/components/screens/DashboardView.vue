<template>
  <DefaultLayout>
    <h1>Welcome to MaveDB</h1>
    <TabView>
      <TabPanel header="Published">
        <div class="mavedb-search-view">
          <div class="mavedb-search-header" style="display: none;">
            <h1>Search MaveDB Experiments and Score Sets</h1>
          </div>
          <h2 class="mave-score-set-section-title">Published Score sets</h2>
          <div class="mavedb-search-form">
            <span class="p-input-icon-left">
              <i class="pi pi-search" />
              <InputText v-model="searchText" ref="searchTextInput" type="text" placeholder="Search" @change="search" />
            </span>
          </div>
          <ScoreSetTable :data="publishedScoreSets" :language="language" :scrollX="true" :scrollY="true" />
        </div>
      </TabPanel>
      <TabPanel header="Unpublished">
        <div class="mavedb-search-view">
          <h2 class="mave-score-set-section-title">Unpublished Score sets</h2>
          <ScoreSetTable :data="unpublishedScoreSets" :language="language" :scrollX="true" :scrollY="true" />
        </div>
      </TabPanel>
    </TabView>
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import InputText from 'primevue/inputtext'

import config from '@/config'
import ScoreSetTable from '@/components/ScoreSetTable.vue'
import DefaultLayout from '@/components/layout/DefaultLayout'

import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'

export default {
  name: 'HomeView',
  components: { DefaultLayout, ScoreSetTable, InputText, TabView, TabPanel },
  computed: {
  },

  data: function () {
    return {
      //currentUser: user,
      searchText: null,
      scoreSets: [],
      publishedScoreSets: [],
      unpublishedScoreSets: [],
      displayedUnplublishedScoreSets: false,
      language: {
        emptyTable: 'You do not have any score sets matching the request.'
      },
    }
  },
  mounted: async function () {
    await this.search()
  },
  watch: {
    searchText: {
      handler: function (oldValue, newValue) {
        if (oldValue != newValue) {
          this.search()
        }
      }
    }
  },
  methods: {
    search: async function () {
      await this.fetchSearchResults()
      /*
      if (this.searchText && this.searchText.length > 0) {
        await this.fetchSearchResults()
      } else {
        this.scoreSets = []
      }
      */
    },
    fetchSearchResults: async function () {
      try {
        // this response should be true to get published data
        let response = await axios.post(
          `${config.apiBaseUrl}/me/score-sets/search`,
          {
            text: this.searchText || null,
          },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        this.scoreSets = response.data || []
        // reset published score sets search results when using search bar
        this.publishedScoreSets = []
        this.unpublishedScoreSets = []
        // Separate the response.data into published score set and unpublished score set.
        for (let i = 0, len = this.scoreSets.length; i < len; i++) {
          if (this.scoreSets[i].publishedDate == null) {
            // do not add to unpublished score sets if it is already populated
            this.unpublishedScoreSets.push(this.scoreSets[i])
          }
          else {
            this.publishedScoreSets.push(this.scoreSets[i])
          }
        }
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    }
  },
}

</script>

<style scoped>
/* (A) FLEX CONTAINER */
.flex-wrap {
  display: flex;
}

/* (B) OPTIONAL COSMETICS */
.flex-wrap>* {
  box-sizing: border-box;
  width: 50%;
  padding: 10px;
  background: #ffe2e0;
}

/* Layout */
.mavedb-search-view {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

.mavedb-search-header {
  flex: 0 0 auto;
  text-align: center;
}

.mavedb-search-header h1 {
  font-size: 20px;
  text-align: center;
}

.mavedb-search-form {
  flex: 0 0 auto;
  padding: 10px 0;
  text-align: center;
}

</style>
