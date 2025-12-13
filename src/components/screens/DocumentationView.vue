<template>
  <DefaultLayout>
    <div class="ml-12 mt-4">
      <h1 class="text-2xl font-extrabold mb-4">Documentation</h1>
      <p class="mb-4">Welcome to the documentation page for MaveDB and its associated packages.</p>
      <ul class="ml-10 list-disc">
        <li><a href="/docs/mavedb/index.html">MaveDB documentation homepage</a></li>
        <ul class="ml-10 list-disc">
          <li>View project on <a href="https://github.com/VariantEffect/mavedb-api">GitHub</a></li>
          <li><a :href="apiDocumentationUrl">API documentation</a></li>
        </ul>
        <li><a href="/docs/mavehgvs/index.html">MAVE-HGVS documentation homepage</a></li>
        <ul class="ml-10 list-disc">
          <li>View project on <a href="https://github.com/VariantEffect/mavehgvs">GitHub</a></li>
          <li>View project on <a href="https://pypi.org/project/mavehgvs/">PyPI</a></li>
        </ul>
        <li><a href="/docs/mavetools/index.html">MaveTools documentation homepage</a></li>
        <ul class="ml-10 list-disc">
          <li>View project on <a href="https://github.com/VariantEffect/MaveTools">GitHub</a></li>
          <li>View project on <a href="https://pypi.org/project/mavetools/">PyPI</a></li>
        </ul>
      </ul>
    </div>
  </DefaultLayout>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'

import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import config from '@/config'

export default defineComponent({
  name: 'DocumentationView',

  components: {DefaultLayout},

  setup: () => {
    useHead({title: 'Documentation'})
  },

  computed: {
    apiDocumentationUrl: function () {
      return new URL('/docs', config.apiBaseUrl)
    }
  }
})
</script>
