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


    add people to collection by their orcid id:
        viewers (Chips)
        editors (Chips)
        admins (Chips) -->
    <div class="contributors-adder">
        <div class="contributors-adder-title">
            Add contributors
        </div>
        <div class="flex flex-column gap-2">
            <label for="input-viewers">Viewers</label>
            <Chips
                ref="viewersInput"
                v-model="viewers"
                id="input-viewers"
                :addOnBlur="true"
                :allowDuplicate="false"
                placeholder="Type or paste ORCID IDs here."
                @add="newViewersAdded"
                @keyup.escape="clearViewerSearch"
            >
                <template #chip="slotProps">
                <div>
                    <div v-if="slotProps.value.givenName || slotProps.value.familyName">{{ slotProps.value.givenName }} {{ slotProps.value.familyName }} ({{ slotProps.value.orcidId }})</div>
                    <div v-else>{{ slotProps.value.orcidId }}</div>
                </div>
                </template>
            </Chips>
            <!-- TODO add validation error logging here -->
        </div>

    </div>


</div>

</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import Chips from 'primevue/chips'
import InputSwitch from 'primevue/inputswitch'
import InputText from 'primevue/inputtext'

import config from '@/config'
import {ORCID_ID_REGEX} from '@/lib/orcid'

export default {
    name: 'CollectionCreator',

    components: { Chips, InputSwitch, InputText },

    data: () => ({
        collectionName: null,
        collectionDescription: null,
        collectionPrivate: true,
        viewers: [],
        editors: [],
        admins: []
    }),

    methods: {

        clearViewerSearch: function() {
            // This could change with a new PrimeVue version.
            const input = this.$refs.viewersInput
            input.$refs.input.value = ''
        },

        lookupUser: async function(orcidId) {
            // look up MaveDB user by Orcid ID
            let allUsers = null
            let user = null
            try {
                allUsers = (await axios.get(`${config.apiBaseUrl}/users`)).data
                user = allUsers.filter((u) => u.username == orcidId)
                // TODO is this too inefficient?
                // should we load all users ahead of time so we don't have to do this call every time a new user is added?

            } catch (err) {
                // Assume that the error was 404 Not Found.
            }

            if (user) {
                return orcidUser
            } else {
                // TODO throw error
            }
        },

        //TODO when validating orcid id, do not allow duplicates between viewers, editors, and admins

        newViewersAdded: async function(event) {
            const newViewers = event.value

            // Convert any strings to ORCID users without names.
            this.viewers = this.viewers.map((c) => _.isString(c) ? {orcidId: c} : c)

            // Validate and look up each new contributor.
            for (const newViewer of newViewers) {
                if (_.isString(newViewer)) {
                    const orcidId = newViewer.trim()
                    if (orcidId && this.viewers.filter((v) => v.orcidId == orcidId).length > 1) {
                        const firstIndex = _.findIndex(this.viewers, (c) => c.orcidId == orcidId)
                        _.remove(this.viewers, (v, i) => i > firstIndex && v.orcidId == orcidId)
                    } else if (orcidId && ORCID_ID_REGEX.test(orcidId)) {
                        // Look up the ORCID ID in MaveDB (only allow for existing MaveDB users to be listed as contributors).
                        //const orcidUser = await this.lookupOrcidUser(orcidId)
                        const user = await this.lookupUser(orcidId)

                        if (user) {
                        // If found, update matching viewers. (There should only be one.)
                        for (const viewer of this.viewers) {
                            if (viewer.orcidId == user.orcidId) {
                            _.merge(viewer, user)
                            }
                        }
                        } else {
                        // Otherwise remove the ciewer.
                        _.remove(this.viewers, (c) => c.orcidId == orcidId)
                        this.$toast.add({
                            life: 3000,
                            severity: 'warn',
                            summary: `No MaveDB user was found with ORCID ID ${orcidId}.`
                        })
                        }
                    } else {
                        _.remove(this.contributors, (c) => c.orcidId == orcidId)
                        this.$toast.add({
                        life: 3000,
                        severity: 'warn',
                        summary: `${orcidId} is not a valid ORCID ID`
                        })
                    }
                }
            }
        },

    }
}

</script>

<style scoped>

</style>
