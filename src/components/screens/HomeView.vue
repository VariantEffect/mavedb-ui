<template>
  <DefaultLayout>
    <h1>Welcome to MaveDB</h1>

    <!--<div class="flex-wrap">-->
    <div class="tab">
      <button class="tablinks" @click="openScoreset(event, 'Published')" id="defaultOpen">Published Scoreset</button>
      <button class="tablinks" @click="openScoreset(event, 'Unpublished')">Unpublished Scoreset</button>
    </div>
    
    <!-- Tab content -->
    <div id="Published" class="tabcontent">
      <!--<div id="column1">-->
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
      <!-- </div>-->
    </div>
    <div id="Unpublished" class="tabcontent"> 
      <!--<div id="column1">-->
        <div class="mavedb-search-view">
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
      <!-- </div>-->
    </div>
    <!--</div> -->
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import $ from 'jquery'
import _ from 'lodash'
import InputText from 'primevue/inputtext'

import config from '@/config'
import FlexDataTable from '@/components/common/FlexDataTable'
import DefaultLayout from '@/components/layout/DefaultLayout'

export default {
  name: 'HomeView',
  components: {DefaultLayout, FlexDataTable, InputText},
  computed: {
  },

  data: function() {
    const self = this
    return {
      //currentUser: user,
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
          `${config.apiBaseUrl}/me/scoresets/search`,
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
        this.unpublishedScoresets = []
        // Separate the response.data into published scoreset and unpublished scoreset.
        for (let i=0, len = this.scoresets.length; i<len; i++){
          console.log(this.scoresets[i])
          if (this.scoresets[i].publishedDate == null){
            // do not add to unpublished scoresets if it is already populated
            this.unpublishedScoresets.push(this.scoresets[i])
            //if (this.displayedUnplublishedScoresets == false){
            //  this.unpublishedScoresets.push(this.scoresets[i])
            //}
          }
          else{
            this.publishedScoresets.push(this.scoresets[i])
          }
        }
        //this.displayedUnplublishedScoresets = true
        // Get the element with id="defaultOpen" and click on it
        document.getElementById("defaultOpen").click()
      } catch (err) {
        console.log(`Error while loading search results")`, err)
      }
    },
    openScoreset: function(evt, scoresetType) {
      // Declare all variables
      var i, tabcontent, tablinks;

      // Get all elements with class="tabcontent" and hide them
      tabcontent = document.getElementsByClassName("tabcontent");
      for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
      }

      // Get all elements with class="tablinks" and remove the class "active"
      tablinks = document.getElementsByClassName("tablinks");
      for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
      }

      // Show the current tab, and add an "active" class to the button that opened the tab
      document.getElementById(scoresetType).style.display = "block";
      evt.currentTarget.className += " active";
    }
  },
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

/* Style the tab */
.tab {
  overflow: hidden;
  border: 1px solid #ccc;
  background-color: #f1f1f1;
}

/* Style the buttons that are used to open the tab content */
.tab button {
  background-color: inherit;
  float: left;
  border: none;
  outline: none;
  cursor: pointer;
  padding: 14px 16px;
  transition: 0.3s;
}

/* Change background color of buttons on hover */
.tab button:hover {
  background-color: #ddd;
}

/* Create an active/current tablink class */
.tab button.active {
  background-color: #ccc;
}

/* Style the tab content */
.tabcontent {
  display: none;
  padding: 6px 12px;
  border: 1px solid #ccc;
  border-top: none;
}
</style>