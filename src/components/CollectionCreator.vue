<template>

<div class="collection-creator">
    <!-- TODO use scoped id method to create ids, to ensure global uniqueness -->
    <div class="flex flex-column gap-2">
        <label for="collection-name">Collection name</label>
        <InputText id="collection-name" v-model="collectionName" />
    </div>
    
    <div class="flex flex-column gap-2">
        <label for="collection-description">Description</label>
        <InputText id="collection-description" v-model="collectionDescription" />
    </div>

    <!-- TODO make public instead -->
    <div class="flex flex-column gap-2">
        <label for="private">Private</label>
        <InputSwitch input-id="private" v-model="collectionPrivate" aria-labelledby="private-help" />
        <small id="private-help">Private collections are only visible to you and anyone you select as a contributor.</small>
    </div>

    <!-- TODO if getting here from the collection adder, should not show option to add score sets and experiments,
    but should show that option if getting here another way. probably handle this with a prop
    -->
    <div class="contributors-adder">
        <div class="contributors-adder-title">
            Grant user permissions
        </div>
        <div class="flex flex-column gap-2">
            <label for="input-viewers">Viewers</label>
            <Chips
                ref="viewersInput"
                v-model="contributors.viewers"
                id="input-viewers"
                :addOnBlur="true"
                :allowDuplicate="false"
                placeholder="Type or paste ORCID IDs here."
                @add="newContributorsAdded('viewers', $event)"
                @keyup.escape="clearContributorSearch('viewers')"
            >
                <template #chip="slotProps">
                <div>
                    <div v-if="slotProps.value.firstName || slotProps.value.lastName">{{ slotProps.value.firstName }} {{ slotProps.value.lastName }} ({{ slotProps.value.orcidId }})</div>
                    <div v-else>{{ slotProps.value.orcidId }}</div>
                </div>
                </template>
            </Chips>
            <label for="input-editors">Editors</label>
            <Chips
                ref="editorsInput"
                v-model="contributors.editors"
                id="input-editors"
                :addOnBlur="true"
                :allowDuplicate="false"
                placeholder="Type or paste ORCID IDs here."
                @add="newContributorsAdded('editors', $event)"
                @keyup.escape="clearContributorSearch('editors')"
            >
                <template #chip="slotProps">
                <div>
                    <div v-if="slotProps.value.firstName || slotProps.value.lastName">{{ slotProps.value.firstName }} {{ slotProps.value.lastName }} ({{ slotProps.value.orcidId }})</div>
                    <div v-else>{{ slotProps.value.orcidId }}</div>
                </div>
                </template>
            </Chips>
            <label for="input-admins">Admins</label>
            <Chips
                ref="adminsInput"
                v-model="contributors.admins"
                id="input-admins"
                :addOnBlur="true"
                :allowDuplicate="false"
                placeholder="Type or paste ORCID IDs here."
                @add="newContributorsAdded('admins', $event)"
                @keyup.escape="clearContributorSearch('admins')"
            >
                <template #chip="slotProps">
                <div>
                    <div v-if="slotProps.value.firstName || slotProps.value.lastName">{{ slotProps.value.firstName }} {{ slotProps.value.lastName }} ({{ slotProps.value.orcidId }})</div>
                    <div v-else>{{ slotProps.value.orcidId }}</div>
                </div>
                </template>
            </Chips>
        </div>
    </div>

    <div>
        <Button label="Cancel" severity="secondary" @click="cancel" />
        <Button label="Save" @click="saveCollection" />
    </div>

</div>

</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'

import config from '@/config'
import {ORCID_ID_REGEX} from '@/lib/orcid'

export default {
    name: 'CollectionCreator',

    emits: ['createdCollection', 'canceled'],

    components: { Button, Chips, InputSwitch, InputText },

    data: () => ({
        collectionName: null,
        collectionDescription: null,
        collectionPrivate: true,
        contributors: {
            viewers: [],
            editors: [],
            admins: []
        }
    }),

    methods: {
        clearContributorSearch: function(contributorType) {
            // This could change with a new PrimeVue version.
            const input = this.$refs[`${contributorType}Input`]
            input.$refs.input.value = ''
        },

        lookupUser: async function(orcidId) {
            // look up MaveDB user by Orcid ID
            let user = null
            try {
                user = (await axios.get(`${config.apiBaseUrl}/users/${orcidId}`)).data
            } catch (err) {
                // Assume that the error was 404 Not Found.
            }

            return user
        },

        newContributorsAdded: async function(contributorType, event) {
            // TODO enforce that contributorType can only be "viewers", "editors", or "admins"
            const newContributors = event.value

            // Convert any strings to ORCID users without names,
            // and create all contributors list, which will be checked against for duplicates
            const contributorTypes = ["viewers", "editors", "admins"]
            let allContributors = []
            for (const contributorTypeTemp of contributorTypes) {
                this.contributors[contributorTypeTemp] = this.contributors[contributorTypeTemp].map((c) => _.isString(c) ? {orcidId: c} : c)
                allContributors = allContributors.concat(this.contributors[contributorTypeTemp])
            }

            // Validate and look up each new contributor.
            for (const newContributor of newContributors) {
                if (_.isString(newContributor)) {
                    const orcidId = newContributor.trim()
                    // check for duplicates in contributorType, and then in entire list
                    // need to check in contributorType separately because if there is a duplicate within
                    // that list, then we need the index
                    // use else if, because there are already no duplicates between lists.
                    // so if there is a match in one list, there will be no matches in the other lists
                    if (orcidId && this.contributors[contributorType].filter((c) => c.orcidId == orcidId).length > 1) {
                        const firstIndex = _.findIndex(this.contributors[contributorType], (c) => c.orcidId == orcidId)
                        _.remove(this.contributors[contributorType], (c, i) => i > firstIndex && c.orcidId == orcidId)
                    } else if (orcidId && allContributors.filter((c) => c.orcidId == orcidId).length > 1) {
                        // if there is a match with another contributor type, remove the contributor
                        // from the list it was just added to (this.$contributorType)
                        _.remove(this.contributors[contributorType], (c) => c.orcidId == orcidId)
                        this.$toast.add({
                            life: 3000,
                            severity: 'warn',
                            summary: "Each contributor can only be assigned to one role per collection."
                        })
                    } else if (orcidId && ORCID_ID_REGEX.test(orcidId)) {
                        // Look up the ORCID ID in MaveDB (only allow for existing MaveDB users to be listed as contributors).
                        const user = await this.lookupUser(orcidId)

                        if (user) {
                            // If found, update matching contributors. (There should only be one.)
                            for (const contributor of this.contributors[contributorType]) {
                                if (contributor.orcidId == user.orcidId) {
                                _.merge(contributor, user)
                                }
                            }
                        } else {
                            // Otherwise remove the contributor.
                            _.remove(this.contributors[contributorType], (c) => c.orcidId == orcidId)
                            this.$toast.add({
                                life: 3000,
                                severity: 'warn',
                                summary: `No MaveDB user was found with ORCID ID ${orcidId}.`
                            })
                        }
                    } else {
                        _.remove(this.contributors[contributorType], (c) => c.orcidId == orcidId)
                        this.$toast.add({
                            life: 3000,
                            severity: 'warn',
                            summary: `${orcidId} is not a valid ORCID ID`
                        })
                    }
                }
            }

        },

        saveCollection: async function() {
            // check that collection name is not null or empty string
            if (this.collectionName) {
                // create object that has field names assigned to this.<field name>
                const newCollection = {
                    name: this.collectionName,
                    description: this.collectionDescription,
                    private: this.collectionPrivate,
                    viewers: this.contributors.viewers, 
                    editors: this.contributors.editors,
                    admins: this.contributors.admins
                }
                // then, try to call the api with the object as body and catch errors - if error, send toast message with severity = error
                let response = null
                try {
                    response = await axios.post(`${config.apiBaseUrl}/collections`, newCollection)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.$toast.add({ severity: 'error', summary: 'Error', life: 3000 })
                }
                // if there is an error, probably keep the dialog open. log errors to console?
                // then, if status is 200, throw toast success message and emit the saved collection
                if (response.status == 200) {
                    const savedCollection = response.data
                    this.$toast.add({ severity: 'success', summary: 'Created new collection.', life: 3000 })
                    this.$emit('createdCollection', savedCollection)
                } else {
                    // TODO log errors to console here
                }
            } else {
                this.$toast.add({
                    life: 3000,
                    severity: 'warn',
                    summary: "Must provide collection name"
                })                
            }
        },

        cancel: function() {
            this.$emit('canceled')
        }

    }
}

</script>

<style scoped>

</style>
