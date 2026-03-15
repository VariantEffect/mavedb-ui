<template>
  <PDialog
    v-model:visible="visible"
    :base-z-index="3000"
    :closable="false"
    :header="title"
    modal
    :style="{width: '25rem'}"
  >
    <span class="p-text-secondary block mb-5">{{ dialog }}</span>
    <FloatLabel class="mb-2" variant="on">
      <InputText :id="scopedId('email-input')" v-model:model-value="email" class="w-full" />
      <label :for="scopedId('email-input')">Email</label>
    </FloatLabel>
    <div>
      <span v-if="emailValidationError" class="text-sm text-danger">{{ emailValidationError }}</span>
    </div>
    <div class="flex justify-content-end gap-2">
      <PButton label="Not now" severity="secondary" type="button" @click="ignoreEmail" />
      <PButton label="Add email" type="button" @click="saveEmail" />
    </div>
  </PDialog>
</template>

<script lang="ts">
import axios, {isAxiosError} from 'axios'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import FloatLabel from 'primevue/floatlabel'
import InputText from 'primevue/inputtext'

import useScopedId from '@/composables/scoped-id'
import useItem from '@/composition/item.ts'
import config from '@/config'
import {ref} from 'vue'
import {components} from '@/schema/openapi'

type User = components['schemas']['CurrentUser']

export default {
  components: {PButton: Button, PDialog: Dialog, FloatLabel, InputText},

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
    const {item: user, setItemId: setUserId, saveItem: saveUser} = useItem<User>({itemTypeName: 'me'})
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
      email: null as string | null,
      emailValidationError: null as string | null
    }
  },

  watch: {
    user: {
      handler: function () {
        this.email = this.user?.email ?? null

        if (this.$props.isFirstLoginPrompt) {
          this.visible = (this.user?.isFirstLogin ?? false) && this.user?.email == null
        } else {
          this.visible = this.user?.email == null
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
        return
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
        } catch (error: unknown) {
          errorResponse = isAxiosError(error) ? (error.response ?? {status: 500}) : {status: 500}
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
