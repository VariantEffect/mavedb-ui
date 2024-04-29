<template>
    <Dialog v-model:visible="visible" :closable="false" :header=title :style="{ width: '25rem' }">
        <span class="p-text-secondary block mb-5">{{ dialog }}</span>
        <div class="flex align-items-center gap-3 mb-3">
            <label for="email" class="font-semibold w-6rem">Email</label>
            <InputText v-model:model-value="email" id="email" class="flex-auto" />
        </div>
        <div><span v-if="emailValidationError" class="mave-field-error">{{ emailValidationError }}</span></div>
        <div class="flex justify-content-end gap-2">
            <Button type="button" label="Ignore" severity="secondary" @click="ignoreEmail"></Button>
            <Button type="button" label="Save" @click="saveEmail"></Button>
        </div>
    </Dialog>
</template>

<script>
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

import useItem from '@/composition/item'
import { ref } from 'vue'

export default {
    components: { Button, Dialog, InputText },

    props: {
        title: {
            type: String,
            required: false,
            default: "Add User Email"
        },
        dialog: {
            type: String,
            required: false,
            default: "Your email is required to use this feature. Please add it below"
        },
        isFirstLoginPrompt: {
            type: Boolean,
            required: true
        }
    },

    setup: () => {
        const { item: user, setItemId: setUserId, saveItem: saveUser } = useItem({ itemTypeName: 'me' })
        const visible = ref(false);

        return {
            user,
            setUserId,
            saveUser,
            visible,
        }
    },

    data: function() {
        return {
            email: null,
            emailValidationError: null
        }
    },

    watch: {
        user: {
            handler: function() {
                this.email = this.user?.email

                if (this.$props.isFirstLoginPrompt) {
                    this.visible = this.user.isFirstLogin && this.user.email == null
                }
                else {
                    this.visible = this.user.email == null
                }
            }
        }
    },

    mounted: function() {
        this.setUserId('me')
    },

    methods: {
        saveEmail: async function() {
            const email = this.email ? this.email.trim() : null

            if (!email) {
                this.emailValidationError = "Email cannot be empty."
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
                    this.visible = false
                }
            }
        },

        ignoreEmail: async function() {
            await this.saveUser({
                item: {
                    ...this.user
                }
            })
            this.visible = false
        }
    }
}

</script>

<style scoped src="../../assets/forms.css"></style>
