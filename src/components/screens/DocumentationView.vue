<template>
  <DefaultLayout>
    <h1>Documentation</h1>
    <p>Welcome to the documentation page for MaveDB and its associated packages.</p>
    <ul>
        <li><a href="/docs/mavedb/index.html">MaveDB documentation homepage</a></li>
        <ul>
            <li>View project on <a href="https://github.com/VariantEffect/mavedb-api">GitHub</a></li>
            <li><a :href="apiDocumentationUrl">API documentation</a></li>
        </ul>
        <li><a href="/docs/mavehgvs/index.html">MAVE-HGVS documentation homepage</a></li>
        <ul>
            <li>View project on <a href="https://github.com/VariantEffect/mavehgvs">GitHub</a></li>
            <li>View project on <a href="https://pypi.org/project/mavehgvs/">PyPI</a></li>
        </ul>
        <li><a href="/docs/mavetools/index.html">MaveTools documentation homepage</a></li>
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
