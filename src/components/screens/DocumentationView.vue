<template>
  <DefaultLayout>
    <h1>Documentation</h1>
    <p>Welcome to the documentation page for MaveDB and its associated packages.</p>
    <ul>
        <li><a href="/docs/mavedb/">MaveDB documentation homepage</a></li>
        <ul>
            <li>View project on <a href="https://github.com/VariantEffect/MaveDB">GitHub</a></li>
            <li><a :href="apiDocumentationUrl">API documentation</a></li>
        </ul>
        <li><a href="/docs/mavehgvs/">MAVE-HGVS documentation homepage</a></li>
        <ul>
            <li>View project on <a href="https://github.com/VariantEffect/mavehgvs">GitHub</a></li>
            <li>View project on <a href="https://pypi.org/project/mavehgvs/">PyPI</a></li>
        </ul>
        <li><a href="/docs/mavetools/">MaveTools documentation homepage</a></li>
        <ul>
            <li>View project on <a href="https://github.com/VariantEffect/MaveTools">GitHub</a></li>
            <li>View project on <a href="https://pypi.org/project/mavetools/">PyPI</a></li>
        </ul>
    </ul>
  </DefaultLayout>
</template>

<script>

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout'

export default {
  name: 'DocumentationView',
  components: {DefaultLayout},
  computed: {
    apiDocumentationUrl: function() {
      return new URL('/docs', config.apiBaseUrl)
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