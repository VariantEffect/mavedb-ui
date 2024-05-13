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
            <InputText :id="$scopedId('input-email')" style="max-width: 400px; width: 100%;" v-model="email" type="text"
              placeholder="Email" />
            <label :for="$scopedId('input-email')">Email</label>
          </span>
        </div>
        <div>
          <span v-if="emailValidationError" class="mave-field-error">{{ emailValidationError }}</span>
        </div>
      </template>
      <template #footer>
        <Button :disabled="!user || email == user.email" icon="pi pi-check" label="Save" @click="saveEmail" />
        <Button :disabled="!user || email == user.email" icon="pi pi-times" label="Cancel" class="p-button-secondary"
          style="margin-left: .5em" @click="cancelEmailEditing" />
      </template>
    </Card>

    <Card>
      <template #title>
        User API Key
      </template>
      <template #content>
        <div v-if="('ordinary user' in accessKeysByRole)">
          <div class="mavedb-access-key-id">
            {{ accessKeysByRole['ordinary user'] }}
            &nbsp;
            <Button icon="pi pi-copy" class="p-button-rounded p-button-outlined"
              @click="copyTextToClipboard(accessKeysByRole['ordinary user'])" />
            &nbsp;
            <Button icon="pi pi-times" class="p-button-rounded p-button-danger"
              @click="deleteAccessKeyWithConfirmation(accessKeysByRole['ordinary user'])" />
          </div>
        </div>
        <div v-else>
          You have not created an API key for your user.
        </div>
      </template>
      <template #footer>
        <Button v-if="!('ordinary user' in accessKeysByRole)" icon="pi pi-check" label="Generate an API key"
          @click="createAccessKey('ordinary user')" />
      </template>
    </Card>

    <div v-if="!user?.roles.every(elem => elem === 'ordinary user')">
      <Card>
        <template #title>
          Acting Roles
        </template>
        <template #content>
          <div v-for="role in user?.roles.concat(['ordinary user'])" :key="role" class="flex align-items-center">
            <Checkbox v-model="activeRoles" :inputId="role" name="roleSelector" :value="role" @update:modelValue="setActiveRoles" :disabled="role == 'ordinary user'" />
            <label :for="role" class="ml-2">{{ role }}</label>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>
          Role Based API keys
        </template>
        <template #content>
          <div v-for="role in user?.roles" class="mavedb-access-key" :key="role">
            <Card>
              <template #title>
                Access Key for role: {{ role }}
              </template>
              <template #content>
                <div v-if="(role in accessKeysByRole)">
                  <div class="mavedb-access-key-id">
                    {{ accessKeysByRole[role] }}
                    &nbsp;
                    <Button icon="pi pi-copy" class="p-button-rounded p-button-outlined"
                      @click="copyTextToClipboard(accessKeysByRole[role])" />
                    &nbsp;
                    <Button icon="pi pi-times" class="p-button-rounded p-button-danger"
                      @click="deleteAccessKeyWithConfirmation(accessKeysByRole[role])" />
                  </div>
                </div>
                <div v-else>
                  You have not created an API key for this role.
                </div>
              </template>
              <template #footer>
                <Button v-if="!(role in accessKeysByRole)" icon="pi pi-check" label="Generate an API key"
                  @click="createAccessKey(role)" />
              </template>
            </Card>
          </div>
        </template>
      </Card>
    </div>
  </DefaultLayout>
</template>

<script>

import axios from 'axios'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import store from '@/store/index'

import config from '@/config'
import DefaultLayout from '@/components/layout/DefaultLayout'
import useClipboard from '@/composition/clipboard'
import useItem from '@/composition/item'
import useItems from '@/composition/items'

import useAuth from '@/composition/auth'

export default {
  name: 'HomeView',
  components: { Button, Card, DefaultLayout, InputText, Checkbox },

  setup: () => {
    const { item: user, setItemId: setUserId, saveItem: saveUser } = useItem({ itemTypeName: 'me' })
    const { items: accessKeys, invalidateItems: invalidateAccessKeys } = useItems({ itemTypeName: 'my-access-key' })
    const {activeRoles, updateActiveRoles} = useAuth()
    console.log(activeRoles)

    return {
      activeRoles,
      updateActiveRoles,
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
      email: null,
      emailValidationError: null
    }
  },

  computed: {
    accessToken: function() {
      return null
    },

    accessKeysByRole: function() {
      if (!this.accessKeys) {
        return {}
      }
      else {
        return this.accessKeys.reduce((acc, cur) => ({ ...acc, [cur.role || 'ordinary user']: cur.keyId }), {})
      }
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
    saveEmail: async function() {
      const email = this.email ? this.email.trim() : null
      if (this.user && email && email != this.user.email) {
        let errorResponse = null
        try {
            await this.saveUser({
            item: {
              ...this.user,
              email
            }
          })
        } catch (error) {
          errorResponse = error.response
        }

        if (errorResponse) {
          if (typeof errorResponse.data.detail === 'string' || errorResponse.data.detail instanceof String) {
            // Handle generic errors that are not surfaced by the API as objects
            this.$toast.add({ severity: 'error', summary: `Encountered an error saving email: ${errorResponse.data.detail}` })
          }
          else {
            // There will only be one validation error surfaced for emails.
            this.emailValidationError = errorResponse.data.detail[0].msg
          }
        }
        else {
          this.emailValidationError = null
          this.user.email = email
          this.$toast.add({ severity: 'success', summary: `Your email was succesfully updated.`, life: 3000 })
        }
      }
    },
    setActiveRoles: function(newRoles) {
      this.updateActiveRoles(newRoles)
    },
    createAccessKey: async function(role) {
      if (role === 'ordinary user') {
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
      }
      else {
        await axios.post(
          `${config.apiBaseUrl}/users/me/access-keys/${role}`,
          {},
          {
            headers: {
              accept: 'application/json'
            }
          }
        )
        this.invalidateAccessKeys()
      }
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

<style scoped src="../../assets/forms.css"></style>

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
