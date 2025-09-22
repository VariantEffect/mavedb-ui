<template>
  <Dialog v-model:visible="visible" :closable="false" :header="title" :style="{width: '25rem'}">
    <span class="p-text-secondary block mb-5">{{ dialog }}</span>
    <div class="flex align-items-center gap-3 mb-3 p-float-label">
      <InputText :id="scopedId('email-input')" v-model:model-value="email" class="flex-auto" />
      <label :for="scopedId('email-input')">Email</label>
    </div>
    <div>
      <span v-if="emailValidationError" class="mave-field-error">{{ emailValidationError }}</span>
    </div>
    <div class="flex justify-content-end gap-2">
      <Button label="Not now" severity="secondary" type="button" @click="ignoreEmail" />
      <Button label="Add email" type="button" @click="saveEmail" />
    </div>
  </Dialog>
</template>

<script>
import axios from 'axios'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

import useScopedId from '@/composables/scoped-id'
import useItem from '@/composition/item'
import config from '@/config'
import {ref} from 'vue'

export default {
  components: {Button, Dialog, InputText},

  props: {
    title: {
      type: String,
      required: false,
      default: 'Add User Email'
    },
    dialog: {
      type: String,
      required: false,
      default:
        "You must add an email address to your account to use this feature. You can do so below, or on the 'Settings' page."
    },
    isFirstLoginPrompt: {
      type: Boolean,
      required: true
    }
  },

  setup: () => {
    const {item: user, setItemId: setUserId, saveItem: saveUser} = useItem({itemTypeName: 'me'})
    const visible = ref(false)

    return {
      ...useScopedId(),
      user,
      setUserId,
      saveUser,
      visible
    }
  },

  data: function () {
    return {
      email: null,
      emailValidationError: null
    }
  },

  watch: {
    user: {
      handler: function () {
        this.email = this.user?.email

        if (this.$props.isFirstLoginPrompt) {
          this.visible = this.user.isFirstLogin && this.user.email == null
        } else {
          this.visible = this.user.email == null
        }
      }
    }
  },

  mounted: function () {
    this.setUserId('me')
  },

  methods: {
    saveEmail: async function () {
      const email = this.email ? this.email.trim() : null

      if (!email) {
        this.emailValidationError = 'Email cannot be empty.'
      }

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
            this.$toast.add({
              severity: 'error',
              summary: `Encountered an error saving email: ${errorResponse.data.detail}`
            })
          } else {
            // There will only be one validation error surfaced for emails.
            this.emailValidationError = errorResponse.data.detail[0].msg
          }
        } else {
          this.emailValidationError = null
          this.user.email = email
          this.$toast.add({severity: 'success', summary: `Your email was succesfully updated.`, life: 3000})
          this.visible = false
        }
      }
    },

    // Save the user with a null email. Saving the user ensures their `is_first_login` value is set to `False`, which
    // makes sure they are not prompted with this component again.
    ignoreEmail: async function () {
      await axios.put(
        `${config.apiBaseUrl}/users/me/has-logged-in`,
        {},
        {
          headers: {
            accept: 'application/json'
          }
        }
      )
      this.visible = false
    }
  }
}
</script>

<style scoped src="../../assets/forms.css"></style>
