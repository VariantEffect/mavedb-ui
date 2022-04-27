<template>
  <DefaultLayout>
    <h1>Welcome to MaveDB</h1>
    <div>
      This is where we will build a "My MaveDB" page for signed-in users.
    </div>
    <div v-if="false && oidc.isAuthenticated">
      <h3>Profile</h3>
      <p>{{oidc.userProfile}}</p>
      <p>{{oidc.user.id_token}}</p>
      <p>{{validationResult}}</p>
      <p>{{decoded}}</p>
    </div>
  </DefaultLayout>
</template>

<script>

import jwt from 'jsonwebtoken'

import DefaultLayout from '@/components/layout/DefaultLayout'
import {oidc} from '@/lib/auth'

const ORCID_JWT_PUBLIC_KEY = 'jxTIntA7YvdfnYkLSN4wk__E2zf_wbb0SV_HLHFvh6a9ENVRD1_rHK0EijlBzikb-1rgDQihJETcgBLsMoZVQqGj8fDUUuxnVHsuGav_bf41PA7E_58HXKPrB2C0cON41f7K3o9TStKpVJOSXBrRWURmNQ64qnSSryn1nCxMzXpaw7VUo409ohybbvN6ngxVy4QR2NCC7Fr0QVdtapxD7zdlwx6lEwGemuqs_oG5oDtrRuRgeOHmRps2R6gG5oc-JqVMrVRv6F9h4ja3UgxCDBQjOVT1BFPWmMHnHCsVYLqbbXkZUfvP2sO1dJiYd_zrQhi-FtNth9qrLLv3gkgtwQ'
const key = Buffer.from(ORCID_JWT_PUBLIC_KEY, 'base64')

export default {
  name: 'HomeView',
  components: {DefaultLayout},
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
  }
}

</script>
