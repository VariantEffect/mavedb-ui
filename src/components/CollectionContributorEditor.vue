<template>

<div class="collection-contributor-editor">
    <Button
        @click="visible = true"
        class="collection-contributor-editor-button"
        label="Edit"
    ></Button>

    <Dialog
        v-model:visible="visible"
        modal
        header="Edit user permissions"
        :style="{ width: '45rem' }"
        :close-on-escape="false"
        @hide="resetContributorEditor"
    >
        <div class="flex flex-column gap-2">
            <!-- TODO add language to clarify that adding an existing contributor to a different role will automatically remove them from their previous role. -->
            <label :for="$scopedId('input-viewers')">Add Viewers</label>
            <Chips
                ref="viewersInput"
                v-model="contributorsToAdd.viewers"
                :id="$scopedId('input-viewers')"
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
            <label :for="$scopedId('input-editors')">Add Editors</label>
            <Chips
                ref="editorsInput"
                v-model="contributorsToAdd.editors"
                :id="$scopedId('input-editors')"
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
            <label :for="$scopedId('input-admins')">Add Admins</label>
            <Chips
                ref="adminsInput"
                v-model="contributorsToAdd.admins"
                :id="$scopedId('input-admins')"
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
            <label :for="$scopedId('input-remove-contributors')">Remove users from collection</label>
            <MultiSelect
                v-model="contributorsToRemove"
                :options="item.viewers.concat(item.editors, item.admins)"
                :placeholder="`Select users`"
                :maxSelectedLabels="3"
                class="w-full md:w-20rem"
                :id="$scopedId('input-remove-contributors')"
            />
        </div>
        <div class="save-cancel-buttons">
            <Button label="Cancel" severity="secondary" @click="visible = false" />
            <Button label="Save" @click="saveToCollection" />
        </div>
    </Dialog>
</div>

</template>

<script>

import axios from 'axios'
import _ from 'lodash'
import Button from 'primevue/button'
import Chips from 'primevue/chips'
import Dialog from 'primevue/dialog'
import MultiSelect from 'primevue/multiselect'

import config from '@/config'
import useItem from '@/composition/item'
import {ORCID_ID_REGEX} from '@/lib/orcid'

export default {
    name: 'CollectionContributorEditor',

    emits: ['saved'],

    components: { Button, Chips, Dialog, MultiSelect },

    props: {
        collectionUrn: {
            type: String,
            required: true
        },
    },

    setup: () => {
        const {userProfile} = useAuth()
        return {
            userProfile,
            ...useItem({ itemTypeName: 'collection' }),
        }
    },

    watch: {
        collectionUrn: {
            handler: function(newValue, oldValue) {
                if (newValue != oldValue) {
                    this.setItemId(newValue)
                    // this.getContributorsList()
                }
            },
            immediate: true
        }
    },

    data: () => ({
        visible: false,
        contributorsToAdd: {
            viewers: [],
            editors: [],
            admins: []
        },
        additionErrors: [],
        removalErrors: [],
        contributorsToRemove: [],
    }),

    // computed property for contributors list

    methods: {
        resetContributorEditor: function() {
            // TODO determine if necessary. desired behavior is that when client closes the dialog and reopens it, anything previously entered will have been cleared
            this.additionErrors = []
            this.removalErrors = []
            this.contributorsToAdd = {
                viewers: [],
                editors: [],
                admins: []
            }
            this.contributorsToRemove = []
        },

        getContributorsList: function() {
            const allCurrentContributors = this.item.viewers.concat(this.item.editors, this.item.admins)
            // TODO VERY IMPORTANT cannot remove oneself from contributors list
            // get user's info if not immediately available?
            // and then remove user from array
            //this.userProfile.sub is logged in user's orcid id
            this.currentContributors = allCurrentContributors
        },

        // TODO many of these methods are copied directly from CollectionCreator. See if we can DRY this up

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
                this.contributorsToAdd[contributorTypeTemp] = this.contributorsToAdd[contributorTypeTemp].map((c) => _.isString(c) ? {orcidId: c} : c)
                allContributors = allContributors.concat(this.contributorsToAdd[contributorTypeTemp])
            }

            // Validate and look up each new contributor.
            // TODO should we also validate not already in item[`${contributorType}s`]?
            for (const newContributor of newContributors) {
                if (_.isString(newContributor)) {
                    const orcidId = newContributor.trim()
                    // check for duplicates in contributorType, and then in entire list
                    // need to check in contributorType separately because if there is a duplicate within
                    // that list, then we need the index
                    // use else if, because there are already no duplicates between lists.
                    // so if there is a match in one list, there will be no matches in the other lists
                    if (orcidId && this.contributorsToAdd[contributorType].filter((c) => c.orcidId == orcidId).length > 1) {
                        const firstIndex = _.findIndex(this.contributorsToAdd[contributorType], (c) => c.orcidId == orcidId)
                        _.remove(this.contributorsToAdd[contributorType], (c, i) => i > firstIndex && c.orcidId == orcidId)
                    } else if (orcidId && allContributors.filter((c) => c.orcidId == orcidId).length > 1) {
                        // if there is a match with another contributor type, remove the contributor
                        // from the list it was just added to (this.$contributorType)
                        _.remove(this.contributorsToAdd[contributorType], (c) => c.orcidId == orcidId)
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
                            for (const contributor of this.contributorsToAdd[contributorType]) {
                                if (contributor.orcidId == user.orcidId) {
                                _.merge(contributor, user)
                                }
                            }
                        } else {
                            // Otherwise remove the contributor.
                            _.remove(this.contributorsToAdd[contributorType], (c) => c.orcidId == orcidId)
                            this.$toast.add({
                                life: 3000,
                                severity: 'warn',
                                summary: `No MaveDB user was found with ORCID ID ${orcidId}.`
                            })
                        }
                    } else {
                        _.remove(this.contributorsToAdd[contributorType], (c) => c.orcidId == orcidId)
                        this.$toast.add({
                            life: 3000,
                            severity: 'warn',
                            summary: `${orcidId} is not a valid ORCID ID`
                        })
                    }
                }
            }

        },

        saveToCollection: async function() {
            // same issue as with the data set editor, where since we are making one API request at a time, if there is an error part way through, then we can't roll everything back.
            // for each add list: for each contributor: add to collection role
            // TODO for now making contributor types singular here for the API, but this should be consistent throughout the component.
            // TODO error handling
            const contributorTypes = ["viewer", "editor", "admin"]
            for (const contributorType of contributorTypes) {
                for (const contributor of this.contributorsToAdd[`${contributorType}s`]) {
                    let response = null
                    try {
                        const body = {"orcid_id": contributor.orcidId}
                        response = await axios.post(`${config.apiBaseUrl}/collections/${this.collectionUrn}/${contributorType}`, body)
                    } catch (e) {
                        // push response anywhere? if not, don't need to keep track of it here
                        response = e.response || { status: 500 }
                        this.additionErrors.push(`${contributor.orcidId}: ${e.message}`)
                    }
                }
            } 
            // for each contributor in remove list: if they're in this.item.admins, remove from admins, etc.
            for (const contributor of this.contributorsToRemove) {
                // API request requires knowing role
                // TODO error handling
                // TODO check if this works. not sure if need to compare orcid ids or if we can compare contributor objects here
                if (this.item.viewers.includes(contributor)) {
                    let response = null
                    try {
                        response = await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/viewer/${contributor.orcidId}`)
                    } catch (e) {
                        this.removalErrors.push(`${contributor.orcidId}: ${e.message}`)
                    }
                } else if (this.item.editors.includes(contributor)) {
                    let response = null
                    try {
                        response = await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/editor/${contributor.orcidId}`)
                    } catch (e) {
                        this.removalErrors.push(`${contributor.orcidId}: ${e.message}`)
                    }
                } else if (this.item.admins.includes(contributor)) {
                    let response = null
                    try {
                        response = await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/admin/${contributor.orcidId}`)
                    } catch (e) {
                        this.removalErrors.push(`${contributor.orcidId}: ${e.message}`)
                    }
                } // TODO else?
            }

            // TODO should we check for all 200 status here, or is checking for lack of errors adequate?
            if (_.isEmpty(this.additionErrors) && _.isEmpty(this.removalErrors)) {
                this.visible = false
                this.$toast.add({ severity: 'success', summary: "Successfully updated collection's permissions.", life: 3000 })
            }
            // TODO if keeping open if there are failures, make sure we display errors in template

            // always emit 'saved', because if any API calls succeed (even if others fail), need to reload collection's contributors
            this.$emit('saved')
        }
    }
}

</script>

<style scoped>

.collection-contributor-editor-button {
width: fit-content;
}

.save-cancel-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 2px;
    margin: 5px 0 0 0;
}

.save-cancel-buttons Button {
    margin: 0 0 0 3px;
}

</style>