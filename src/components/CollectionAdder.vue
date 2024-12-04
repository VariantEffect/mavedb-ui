<template>

<div class="collection-adder">
    <Button
        @click="visible = true"
        icon="pi pi-plus"
        class="collection-adder-button"
        label="Add to collection"
    ></Button>

    <Dialog
        v-model:visible="visible"
        modal
        header="Add to collection"
        :style="{ width: '25rem' }"
        :close-on-escape="false"
    >
        <div class="flex align-items-center gap-3 mb-3">
            <!-- TODO currently multiple collections with same name are allowed in db, so may need to show urns in the dropdown alongside the name -->
            <!-- TODO maybe show more information, such as public/private status and who or number of users the collection has been shared with -->
            <Dropdown
                v-model="selectedCollectionUrn"
                :options="collections" 
                option-label="name"
                option-value="urn"
                placeholder="Select a collection" 
                class="w-full md:w-14rem" 
            />
        </div>
        <div class="add-collection-buttons">
            <Button label="Create new collection" class="create-new-collection-button" @click="creatorVisible = true"></Button>
            <div class="add-collection-save-cancel">
                <!-- TODO fix bug: when dialog buttons happen to lie on top of the score histogram, score range info displays off to the side when dialog is closed -->
                <Button label="Cancel" severity="secondary" @click="visible = false" />
                <Button label="Save" @click="saveToCollection" />
            </div>
        </div>
    </Dialog>

    <Dialog
        v-model:visible="creatorVisible"
        modal
        header="Create collection"
        :style="{ width: '25rem' }"
        :close-on-escape="false"
    >
        <CollectionCreator
            @canceled="creatorVisible = false"
            @created-collection="childComponentCreatedCollection"
        />
    </Dialog>
</div>

</template>

<script>

import axios from 'axios'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'

import config from '@/config'
import CollectionCreator from '@/components/CollectionCreator'

export default {
    name: 'CollectionAdder',

    components: { Button, CollectionCreator, Dialog, Dropdown },

    props: {
        dataSetUrn: {
            type: String,
            required: true
        },
        dataSetType: {
            type: String, // TODO make enum
            required: true
        }
    },

    data: () => ({
        selectedCollectionUrn: null,
        collections: null,
        visible: false,
        creatorVisible: false
    }),

    created: async function() {
        // TODO have we confirmed that the user is logged in already?
        let response = null
        try {
            response = await axios.get(`${config.apiBaseUrl}/users/me/collections`)
        } catch (e) {
            response = e.response || { status: 500 }
        }

        if (response.status == 200) {
            const allCollections = response.data
            const adminCollections = allCollections["admin"]
            const editorCollections = allCollections["editor"]
            this.collections = adminCollections.concat(editorCollections)
        } else if (response.data && response.data.detail) {
            // TODO what to do in event of error?
        }

        // TODO other things to handle:
        // user logs out (don't show previous user's list of collections, refresh correctly)
        // user adds a new collection (refresh list of collections to show in dropdown)
        // TODO filter response so that it only includes collections for which the current user is an editor or admin (or change/add API)

    },

    methods: {
        saveToCollection: async function(dataSet) {
            // determine whether data set is a score set or an experiment
            // call the relevant function
            // if no errors, set visible to false and show a toast notification
            if (this.dataSetType === "scoreSet") {
                this.saveScoreSetToCollection(this.dataSetUrn)
            } else if (this.dataSetType === "experiment") {
                this.saveExperimentToCollection(this.dataSetUrn)
            } // TODO make this an enum so we don't need an else block here?
            this.visible = false

            // TODO should the dialog box remain open if there was an error? yes
        },

        saveScoreSetToCollection: async function(scoreSetUrn) {
            let response = null
            try {
                response = await axios.post(
                    `${config.apiBaseUrl}/collections/${this.selectedCollectionUrn}/score-sets`,
                    {scoreSetUrn}
                )
            } catch (e) {
                response = e.response || { status: 500 }
            }

            if (response.status == 200) {
                // TODO add details to toast message?
                this.$toast.add({ severity: 'success', summary: 'Score set successfully added to collection.', life: 3000 })
            } else if (response.data && response.data.detail) {
                // TODO what to do in event of error?
                // look at http status code and determine whether to display error information
                    // would probably be useful to display information related to authentication errors
                // add to toast message and log to console
            }
        },

        saveExperimentToCollection: async function(experimentUrn) {
            let response = null
            try {
                response = await axios.post(
                    `${config.apiBaseUrl}/collections/${this.selectedCollectionUrn}/experiments`,
                    {experimentUrn}
                )
            } catch (e) {
                response = e.response || { status: 500 }
            }

            if (response.status == 200) {
                // TODO logging
                // TODO add details to toast message?
                this.$toast.add({ severity: 'success', summary: 'Experiment successfully added to collection.', life: 3000 })
            } else if (response.data && response.data.detail) {
                // TODO what to do in event of error?
            }
        },

        childComponentCreatedCollection: function(collection) {
            // set creatorVisible to false
            this.creatorVisible = false
            // refresh the list of collections to display (or at least add the new collection)
            this.collections.push(collection)
            // select the new collection in the dropdown
            this.selectedCollectionUrn = collection.urn
        }
    }
}

</script>

<style scoped>

.collection-adder-button {
    width: fit-content;
}

.add-collection-buttons {
    justify-content: space-between;
    display: flex;
}

.add-collection-buttons .add-collection-save-cancel {
    display: inline;
}

.add-collection-buttons .add-collection-save-cancel Button {
    margin: 0 0 0 3px;
}

.create-new-collection-button {
    display: inline;
}

</style>