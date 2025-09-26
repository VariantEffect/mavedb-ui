<template>
  <div />
</template>

<script>
import {continueAuthenticationFromRedirect} from '@/lib/orcid'

export default {
  name: 'OidcCallback',
  created() {
    continueAuthenticationFromRedirect()
      .then((redirectPath) => {
        this.$router.push(redirectPath)
      })
      .catch(() => {
        this.$router.push('/oidc-callback-error')
      })
  }
}
</script>
