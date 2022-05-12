<template>
  <AlternativeLayout>
    <h1>Welcome to MaveDB</h1>

    <div class="flex-wrap">

      <div id="column1">
        <div class="mavedb-search-view">

          <div class="mavedb-search-header" style="display: none;">
            <h1>Search MaveDB Experiments and Score Sets</h1>
          </div>

          <h2 class="mave-scoreset-section-title">Published Scoresets</h2>
            <div class="mavedb-search-form">
              <span class="p-input-icon-left">
                <i class="pi pi-search" />
                <InputText v-model="searchText" ref="searchTextInput" type="text" placeholder="Search" @change="search" />
              </span>
            </div>
            <div class="mavedb-search-results">
              <FlexDataTable
                  :data="publishedScoresets"
                  :options="tableOptions"
                  :scrollX="true"
                  :scrollY="true"
              />
            </div>
        </div>
      </div>

      <div id="column2">
        <h2 class="mave-scoreset-section-title">Unpublished Scoresets</h2>
        <div class="mavedb-search-view">
          <div class="mavedb-search-results">
            <FlexDataTable
                :data="unpublishedScoresets"
                :options="tableOptions"
                :scrollX="true"
                :scrollY="true"
            />
          </div>
        </div>
      </div>
    </div>   
    

    <div v-if="false && oidc.isAuthenticated">
      <h3>Profile</h3>
      <p>{{oidc.userProfile}}</p>
      <p>{{oidc.user.id_token}}</p>
      <p>{{validationResult}}</p>
      <p>{{decoded}}</p>
    </div>
  </AlternativeLayout>
</template>

<script>
//this is the path we will want to use: /api/v1/me/scoresets/search
import jwt from 'jsonwebtoken'

import AlternativeLayout from '@/components/layout/AlternativeLayout'
import {oidc} from '@/lib/auth'

import _ from 'lodash'

import config from '@/config'

import axios from 'axios'
import $ from 'jquery'
import InputText from 'primevue/inputtext'
import FlexDataTable from '@/components/common/FlexDataTable'
//import SelectList from '@/components/common/SelectList'

const ORCID_JWT_PUBLIC_KEY = 'jxTIntA7YvdfnYkLSN4wk__E2zf_wbb0SV_HLHFvh6a9ENVRD1_rHK0EijlBzikb-1rgDQihJETcgBLsMoZVQqGj8fDUUuxnVHsuGav_bf41PA7E_58HXKPrB2C0cON41f7K3o9TStKpVJOSXBrRWURmNQ64qnSSryn1nCxMzXpaw7VUo409ohybbvN6ngxVy4QR2NCC7Fr0QVdtapxD7zdlwx6lEwGemuqs_oG5oDtrRuRgeOHmRps2R6gG5oc-JqVMrVRv6F9h4ja3UgxCDBQjOVT1BFPWmMHnHCsVYLqbbXkZUfvP2sO1dJiYd_zrQhi-FtNth9qrLLv3gkgtwQ'
const key = Buffer.from(ORCID_JWT_PUBLIC_KEY, 'base64')

export default {
  name: 'HomeView',
  components: {AlternativeLayout, FlexDataTable, InputText},
  computed: {
    oidc: function() {
      return oidc
    },
    decoded: function() {
      return jwt.decode(oidc.user.id_token)
    },
    validationResult: function() {
      console.log(key)
      console.log(oidc.user)
      /* console.log(jwt.verify(oidc.user.id_token, ORCID_JWT_PUBLIC_KEY, {
        algorithms: ['RS256']
      })) */
      return ''
    }
  },

  data: function() {
    const self = this
    return {
      searchText: null,
      scoresets: [],
      publishedScoresets: [],
      unpublishedScoresets: [],
      displayedUnplublishedScoresets: false,
      tableOptions: {
        columns: [
          {
            data: 'urn',
            title: 'URN',
            width: '17.5%',
            render: function (data) { // }, type, row) {
              var urn = data
              var urnDisplay = urn  // row['urnDisplay']
              const url = self.$router.resolve({path: `/scoresets/${urn}`}).href
              return ('<a href="' + url + '">' + urnDisplay + '</a>')  // TODO Escape the text.
            },
          },
          {data: 'shortDescription', title: 'Description', width: '40%'},
          {data: (x) => _.get(x, 'targetGene.name', null), title: 'Target'},
          {data: (x) => _.get(
            _.get(x, 'targetGene.referenceMaps.0', null),
                // .find((rm) => rm.isPrimary),
            'genome.organismName'
          ), title: 'Target organism'},
        ],
        language: {
          emptyTable: 'You do not have any scoresets matching the request.'
        },
        rowGroup: {
          dataSrc: 'experiment.urn',
          startRender: function(rows, group) {
            const experimentUrn = group
            const experimentUrnDisplay = experimentUrn // rows.data()[0]['parentUrnDisplay']
            const experimentDescription = _.get(rows.data()[0], 'shortDescription', null)
            const url = self.$router.resolve({path: `/experiments/${experimentUrn}`}).href

            const link = ('<a href="' + url + '">' + experimentUrnDisplay + '</a>');

            return $('<tr/>').append(
              '<td colSpan="1">' + link + '</td>').append('<td colSpan="4">' + experimentDescription + '</td>'
            )
          },
        },
        searching: false
      }
    }
  },

  mounted: async function() {
    await this.search()
  },

  watch: {
    searchText: {
      handler: function(oldValue, newValue) {
        if (oldValue != newValue) {
          this.search()
        }
      }
    }
  },

  methods: {
    search: async function() {
      await this.fetchSearchResults()
      /*      
      if (this.searchText && this.searchText.length > 0) {
        await this.fetchSearchResults()
      } else {
        this.scoresets = []
      }
      */
    },
    fetchSearchResults: async function() {
      try {
        // this response should be true to get published data
        let response = await axios.post(
          `${config.apiBaseUrl}/scoresets/search`,
          {
            text: this.searchText || null,
          },
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        this.scoresets = response.data || []
        // reset published scoresets search results when using search bar
        this.publishedScoresets = []
        //this.unpublishedScoresets = []
        // Separate the response.data into published scoreset and unpublished scoreset.
        for (let i=0, len = this.scoresets.length; i<len; i++){
          if (this.scoresets[i].publishedDate == null){
            // do not add to unpublished scoresets if it is already populated
            if (this.displayedUnplublishedScoresets == false){
              this.unpublishedScoresets.push(this.scoresets[i])
            }
          }
          else{
            this.publishedScoresets.push(this.scoresets[i])
          }
        }
        this.displayedUnplublishedScoresets = true
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    }
  }
}

</script>

<style scoped>

/* (A) FLEX CONTAINER */
.flex-wrap { display: flex; }

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

.mavedb-search-filters {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  max-width: 1000px;
  margin: 10px auto;
}

.mavedb-search-filter-option-picker {
  max-width: 300px;
  width: 30%;
}

.mavedb-organism-picker::v-deep .p-listbox-item {
  font-style: italic;
}

.mavedb-organism-picker::v-deep .p-listbox-item .p-badge {
  font-style: normal;
}

.mavedb-search-results {
  flex: 1 1 400px;
  position: relative;
}

/* Table */

/* Override control bar padding applied in FlexDataTable. */
.mavedb-search-results::v-deep .samplify-data-table .dataTables_wrapper {
  padding-top: 0;
}

/* Override background applied in FlexDataTable. */
.mavedb-search-results::v-deep .samplify-data-table .dataTables_wrapper {
  background-color: #fff;
}

.mavedb-search-results::v-deep .samplify-data-table thead th {
  background-color: #dadff1;
}

.mavedb-search-results::v-deep .samplify-data-table td,
.mavedb-search-results::v-deep .samplify-data-table th {
  padding: 0.75rem;
  border: 1px solid #fff;
  font-size: 14px;
}

.mavedb-search-results::v-deep .samplify-data-table td:first-child {
  padding-left: 2em;
}

.mavedb-search-results::v-deep .samplify-data-table td:last-child {
  font-style: italic;
}

.mavedb-search-results::v-deep .samplify-data-table tr.samplify-data-table-group-row {
  background-color: #eeeeee;
  font-weight: bold;
}

.mavedb-search-results::v-deep .samplify-data-table tr.samplify-data-table-group-row td:first-child {
  padding-left: 0.75rem;
}

.mavedb-search-results::v-deep .samplify-data-table tr.samplify-data-table-group-row td:last-child {
  font-style: normal;
}

</style>
