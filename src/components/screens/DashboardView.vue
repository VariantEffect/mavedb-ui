<template>
  <DefaultLayout :require-auth="true">
    <h1 class="text-4xl font-bold py-4">Welcome to MaveDB</h1>
    <Tabs value="0">
      <TabList>
        <Tab value="0">Published</Tab>
        <Tab value="1">Unpublished</Tab>
      </TabList>
      <TabPanels>
        <TabPanel header="Published" value="0">
          <div class="mavedb-search-view">
            <h2 class="text-xl font-bold py-2">Published Score sets</h2>
            <div class="mavedb-search-form">
              <!-- <span class="p-input-icon-left">
                <i class="pi pi-search" />
                <InputText ref="searchTextInput" v-model="searchText" placeholder="Search" type="text" @change="search" />
              </span> -->
              <div style="display: inline-block; margin-left: 40px">
                <div class="p-inputgroup" style="max-width: 300px; width: 300px; display: flex; align-items: stretch;">
                  <InputText
                    ref="searchTextInput"
                    v-model="searchText"
                    class="p-inputtext-sm rounded-r-none!"
                    placeholder="Search"
                    style="width: 200px; height: auto;"
                    type="text"
                    @change="search"
                  />
                  <Button
                    class="p-button-default p-button-sm rounded-l-none!"
                    :enabled="searchText && searchText.length > 0"
                    icon="pi pi-search"
                    @click="search"
                  />
                  <ProgressSpinner
                    v-if="isSearching"
                    class="size-8! m-1"
                  />
                </div>
              </div>
            </div>

            <ScoreSetTable :data="publishedScoreSets" :language="language" :scroll-x="true" :scroll-y="true" />
          </div>
        </TabPanel>
        <TabPanel header="Unpublished" value="1">
          <div class="mavedb-search-view">
            <h2 class="text-xl font-bold py-2">Unpublished Score sets</h2>
            <ScoreSetTable :data="unpublishedScoreSets" :language="language" :scroll-x="true" :scroll-y="true" />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </DefaultLayout>
</template>

<script>
import axios from 'axios'
import InputText from 'primevue/inputtext'
import TabPanel from 'primevue/tabpanel'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import {useHead} from '@unhead/vue'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'

import config from '@/config'
import ScoreSetTable from '@/components/ScoreSetTable.vue'
import DefaultLayout from '@/components/layout/DefaultLayout'

export default {
  name: 'HomeView',

  components: {DefaultLayout, ScoreSetTable, InputText, Tabs, TabList, Tab, TabPanels, TabPanel, Button, ProgressSpinner},

  setup: () => {
    useHead({title: 'My dashboard'})
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
      isSearching: false,
    }
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

  mounted: async function () {
    await this.search()
  },

  methods: {
    search: async function () {
      this.isSearching = true
      await this.fetchSearchResults()
      this.isSearching = false
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
        const response = await axios.post(
          `${config.apiBaseUrl}/me/score-sets/search`,
          {
            text: this.searchText || null
          },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        this.scoreSets = response.data?.scoreSets || []
        // reset published score sets search results when using search bar
        this.publishedScoreSets = []
        this.unpublishedScoreSets = []
        // Separate the response.data into published score set and unpublished score set.
        for (let i = 0, len = this.scoreSets.length; i < len; i++) {
          if (this.scoreSets[i].publishedDate == null) {
            // do not add to unpublished score sets if it is already populated
            this.unpublishedScoreSets.push(this.scoreSets[i])
          } else {
            this.publishedScoreSets.push(this.scoreSets[i])
          }
        }
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    }
  }
}
</script>

<style scoped>
/* (A) FLEX CONTAINER */
.flex-wrap {
  display: flex;
}

/* (B) OPTIONAL COSMETICS */
.flex-wrap > * {
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
