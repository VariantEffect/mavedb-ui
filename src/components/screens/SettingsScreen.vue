<template>
  <DefaultLayout>
    <h1>Welcome to MaveDB</h1>
    <Card>
      <template #title>
        Profile
      </template>
      <template #content>
        <div class="field">
          <span class="p-float-label">
            <InputText :id="$scopedId('input-email')" style="max-width: 400px; width: 100%;" v-model="email" type="text" placeholder="Email" />
            <label :for="$scopedId('input-email')">Email</label>
          </span>
        </div>
      </template>
      <template #footer>
        <Button :disabled="!user || email == user.email" icon="pi pi-check" label="Save" @click="saveEmail" />
        <Button :disabled="!user || email == user.email" icon="pi pi-times" label="Cancel" class="p-button-secondary" style="margin-left: .5em" @click="cancelEmailEditing" />
      </template>
    </Card>

    <Card>
      <template #title>
        API key
      </template>
      <template #content>
        <div v-if="accessKeys && accessKeys.length == 0">
          You have not created an API key.
        </div>
        <div v-for="accessKey in accessKeys || []" class="mavedb-access-key" :key="accessKey">
          <div class="mavedb-access-key-id">
            {{accessKey.keyId}}
          </div>
          &nbsp;
          <Button icon="pi pi-copy" class="p-button-rounded p-button-outlined" @click="copyTextToClipboard(accessKey.keyId)" />
          &nbsp;
          <Button icon="pi pi-times" class="p-button-rounded p-button-danger" @click="deleteAccessKeyWithConfirmation(accessKey.keyId)" />
        </div>
      </template>
      <template #footer>
        <Button v-if="accessKeys && accessKeys.length == 0" icon="pi pi-check" label="Generate an API key" @click="createAccessKey" />
      </template>
    </Card>

  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useClipboard from '@/composition/clipboard'
import useItem from '@/composition/item'
import useItems from '@/composition/items'

export default {
  name: 'HomeView',
  components: {Button, Card, DefaultLayout, InputText},

  setup: () => {
    const {item: user, setItemId: setUserId, saveItem: saveUser} = useItem({itemTypeName: 'me'})
    const {items: accessKeys, invalidateItems: invalidateAccessKeys} = useItems({itemTypeName: 'my-access-key'})
    return {
      ...useClipboard(),
      user,
      setUserId,
      saveUser,
      accessKeys,
      invalidateAccessKeys
    }
  },

  data: function() {
    return {
      email: null
    }
  },

  computed: {
    accessToken: function() {
      return null
    }
  },

  watch: {
    user: {
      handler: function() {
        this.email = this.user?.email
      }
    }
  },

  mounted: function() {
    this.setUserId('me')
  },

  methods: {
    cancelEmailEditing: function() {
      this.email = this.user?.email
    },
    saveEmail: function() {
      const email = this.email ? this.email.trim() : null
      if (this.user && email && email != this.user.email) {
        this.saveUser({
          item: {
            ...this.user,
            email
          }
        })
      }
    },
    createAccessKey: async function() {
      await axios.post(
        `${config.apiBaseUrl}/users/me/access-keys`,
        {},
        {
          headers: {
            accept: 'application/json'
          }
        }
      )
      this.invalidateAccessKeys()
    },
    deleteAccessKeyWithConfirmation: function(keyId) {
      this.$confirm.require({
        message: 'Are you sure you want to delete this key? This action cannot be undone, but you can generate a new key.',
        header: 'Delete API key',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          await axios.delete(`${config.apiBaseUrl}/users/me/access-keys/${keyId}`)
          this.invalidateAccessKeys()
        }
      })
    }
  }
}

</script>

<style scoped>

.p-card {
  margin-bottom: 1em;
}

.mavedb-access-key {
  display: flex;
  flex-direction: row;
  margin: 5px 0;
  align-items: center;
}

.mavedb-access-key-id {
  flex: 1 0;
  padding: 0.75rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.38);
  border-radius: 4px;
}

</style>