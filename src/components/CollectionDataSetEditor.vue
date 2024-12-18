<template>

<div class="collection-data-set-editor">
    <Button
        @click="visible = true"
        class="collection-data-set-editor-button"
        label="Edit"
    ></Button>

    <Dialog
        v-model:visible="visible"
        modal
        :header="`Add and remove ${dataSetTypeDisplay[dataSetType]}s from collection`"
        :style="{ width: '45rem' }"
        :close-on-escape="false"
        @hide="resetDataSetEditor"
    >
        <div class="flex flex-column gap-2">
            <Button label="Remove" icon="pi pi-trash" severity="danger" class="remove-data-set-button" @click="markDataSetsToRemove" :disabled="!selectedDataSets || !selectedDataSets.length" />
            <DataTable v-model:selection="selectedDataSets" :value="allDataSets" data-key="urn" :row-style="rowStyle" tableStyle="min-width: 50rem">
                <Column selectionMode="multiple"></Column>
                <Column field="urn" header="URN"></Column>
                <!-- TODO add title column once we have full data set objects in allDataSets -->
            </DataTable>
            <Chips
                v-model="addDataSetInput"
                separator=","
                :addOnBlur="true"
                :allowDuplicate="false"
                @keyup.escape="addDataSetInput = []"
                placeholder="Type or paste comma-separated URNs"
                class="add-data-set-input"
            />
            <Button label="Add" icon="pi pi-plus" class="add-data-set-button" @click="validateUrns" />
        </div>
        <div class="save-cancel-buttons">
            <Button label="Cancel" severity="secondary" @click="visible = false" />
            <!-- TODO if user has entered input into the add panel but hasn't validated, should maybe prompt before accepting save? It could be easy to forget to validate -->
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
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'

import config from '@/config'
import useItem from '@/composition/item'

export default {
    name: 'CollectionDataSetEditor',

    emits: ['saved'],

    components: { Button, Chips, Column, DataTable, Dialog, Dropdown, MultiSelect },

    props: {
        collectionUrn: {
            type: String,
            required: true
        },
        dataSetType: {
            type: String, // TODO make enum (can only be scoreSet or experiment)
            required: true
        },
    },

    setup: () => {
        return {
            ...useItem({ itemTypeName: 'collection' }),
        }
    },

    watch: {
        collectionUrn: {
            handler: function(newValue, oldValue) {
                if (newValue != oldValue) {
                    this.setItemId(newValue)
                }
            },
            immediate: true
        }
    },

    computed: {
        allDataSets() {
            // for now, just using urns, but will want to grab actual score sets and add title to table
            const savedDataSets = this.item[`${this.dataSetType}Urns`].map((str) => ({ urn: str, saved: true }))
            const newDataSets = this.validDataSetUrnsToAdd.map((str) =>({ urn: str, saved: false }))
            return savedDataSets.concat(newDataSets)
        }
    },

    data: () => ({
        visible: false,
        addDataSetInput: [],
        validDataSetUrnsToAdd: [],
        validationErrors: [],
        dataSetUrnsToRemove: [],
        selectedDataSets: [],
        additionErrors: [],
        removalErrors: [],
        dataSetTypeDisplay: {
            scoreSet: "score set",
            experiment: "experiment"
        },
    }),

    methods: {
        rowStyle: function(data) {
            //if (this.dataSetUrnsToRemove.includes(data.urn)) {
            if (this.selectedDataSets.includes(data)) {
                return { backgroundColor: '#FFCCCB' } // light red
            } else if (data.saved === false) {
                return { backgroundColor: '#D1FFBD'} // light green
            }
            // else if (this.validDataSetUrnsToAdd.includes(data.urn)) {
            //     return { backgroundColor: '#D1FFBD'} // light green
            // }
        },

        markDataSetsToRemove: function() {
            for (const dataSet of this.selectedDataSets) {
                if (dataSet.saved) {
                    this.dataSetUrnsToRemove.push(dataSet.urn)
                } else {
                    _.remove(this.validDataSetUrnsToAdd, (u) => u == dataSet.urn)
                }
            }
        },

        saveToCollection: async function(dataSet) {
            if (this.dataSetType === "scoreSet") {
                this.saveScoreSetChangesToCollection(dataSet)
            } else if (this.dataSetType === "experiment") {
                this.saveExperimentChangesToCollection(dataSet)
            } // TODO else
        },

        saveScoreSetChangesToCollection: async function(scoreSet) {
            // add each item in this.validScoreSetUrnsToAdd
            // what should we do if there is an error? catch, move on, and save the rest, close dialog and have a toast message with info about error (probably need something more static than a toast message; could keep dialog open and display what was saved and what had errors) or abort save function?
            // I think since we already validated these score sets, any error in saving them would be unexpected, so we should probably abort the whole save function. But what do we say to the user? Try again? Or let them know the error?
            // actually, since we are making one API request at a time, it's not like we can roll back, so we should probably just do everything and then display errors and successes in the dialog box (if mixed or all failed), or success toast message and close dialog box (if all succeeded)
            // same questions with removing score sets
            // for now I will just abort and display the errors (and keep dialog open) if there is any error at all, but this would probably be frustrating for the user.
            // if there is an error, should we break and display that error? or keep going and display all errors?
            // TODO error handling

            this.additionErrors = []
            this.removalErrors = []
            for (const urn of this.validDataSetUrnsToAdd) {
                let response = null
                try {
                    const body = {"score_set_urn": urn}
                    response = await axios.post(`${config.apiBaseUrl}/collections/${this.collectionUrn}/score-sets`, body)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.additionErrors.push(`${urn}: ${e.message}`)
                }
            }

            for (const urn of this.dataSetUrnsToRemove) {
                let response = null
                try {
                    response = await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/score-sets/${urn}`)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.removalErrors.push(`${urn}: ${e.message}`)
                }
            }

            // emit addition and removal errors, as well as successfully saved data sets?
            // I think that would work better than emitting them within the dialog
            
            // should we change the back end to accept multiple data sets at once? That way, it would be all or nothing,
            // which I think would be easier for the user to keep track of.
            
            // only if fully successful:
            // TODO should we check for all 200 status here, or is checking for lack of errors adequate?
            if (_.isEmpty(this.additionErrors) && _.isEmpty(this.removalErrors)) {
                this.visible = false
                this.$toast.add({ severity: 'success', summary: "Successfully updated collection's score sets.", life: 3000 })
            }

            // always emit 'saved', because if any API calls succeed (even if others fail), need to reload collection's data sets
            this.$emit('saved')
        },

        // TODO DRY this up (very similar to score set function above)
        saveExperimentChangesToCollection: async function(experiment) {
            this.additionErrors = []
            this.removalErrors = []
            for (const urn of this.validDataSetUrnsToAdd) {
                let response = null
                try {
                    const body = {"experiment_urn": urn}
                    response = await axios.post(`${config.apiBaseUrl}/collections/${this.collectionUrn}/experiments`, body)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.additionErrors.push(`${urn}: ${e.message}`)
                }
            }

            for (const urn of this.dataSetUrnsToRemove) {
                let response = null
                try {
                    response = await axios.delete(`${config.apiBaseUrl}/collections/${this.collectionUrn}/experiments/${urn}`)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.removalErrors.push(`${urn}: ${e.message}`)
                }
            }

            // emit addition and removal errors, as well as successfully saved data sets?
            // I think that would work better than emitting them within the dialog
            
            // should we change the back end to accept multiple data sets at once? That way, it would be all or nothing,
            // which I think would be easier for the user to keep track of.
            
            // only if fully successful:
            // TODO should we check for all 200 status here, or is checking for lack of errors adequate?
            if (_.isEmpty(this.additionErrors) && _.isEmpty(this.removalErrors)) {
                this.visible = false
                this.$toast.add({ severity: 'success', summary: "Successfully updated collection's experiments.", life: 3000 })
            }

            // always emit 'saved', because if any API calls succeed (even if others fail), need to reload collection's data sets
            this.$emit('saved')
        },

        validateUrns: async function() {
            if (this.dataSetType === "scoreSet") {
                this.validateScoreSetUrns()
            } else if (this.dataSetType === "experiment") {
                this.validateExperimentUrns()
            } // TODO else  
        },

        validateScoreSetUrns: async function() {
            this.validationErrors = []
            // iterate backwards to remove urns from addScoreSetInput as we loop through the array
            // TODO iterating backwards means that validation errors are listed in reverse, which is not ideal
            for (let i = this.addDataSetInput.length - 1; i >= 0; i--) {
                const urn = this.addDataSetInput[i].trim()
                // TODO check regex first? would need to include tmp and watch out for old urns that follow outdated regex, which we would still want to include
                // check score set not already in validated list
                if (this.validDataSetUrnsToAdd.includes(urn)) {
                    // silently remove duplicates
                    _.remove(this.addDataSetInput, (u) => u == urn)
                    continue
                }
                // check score set not already in collection
                if (this.item.scoreSetUrns.includes(urn)) {
                    this.validationErrors.push(`${urn}: Score set already in collection`)
                    continue
                }
                // check that score set exists
                let response = null
                try {
                    response = await axios.get(`${config.apiBaseUrl}/score-sets/${urn}`)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.validationErrors.push(`${urn}: ${e.message}`)
                }
                if (response.status == 200) {
                    // if it validates, remove from addScoreSetInput and add to validScoreSetUrnsToAdd
                    _.remove(this.addDataSetInput, (u) => u == urn)
                    this.validDataSetUrnsToAdd.push(urn)
                }
            }
        },

        // TODO DRY
        validateExperimentSetUrns: async function() {
            // iterate backwards to remove urns from addScoreSetInput as we loop through the array
            // TODO iterating backwards means that validation errors are listed in reverse, which is not ideal
            for (var i = this.addDataSetInput.length - 1; i >= 0; i--) {
                const urn = this.addDataSetInput[i].trim()
                // TODO check regex first? would need to include tmp and watch out for old urns that follow outdated regex, which we would still want to include
                // check score set not already in validated list
                if (this.validDataSetUrnsToAdd.includes(urn)) {
                    // silently remove duplicates
                    _.remove(this.addDataSetInput, (u) => u == urn)
                    continue
                }
                // check score set not already in collection
                if (this.item.experimentUrns.includes(urn)) {
                    this.validationErrors.push(`${urn}: Experiment already in collection`)
                    continue
                }
                // check that score set exists
                let response = null
                try {
                    response = await axios.get(`${config.apiBaseUrl}/experiments/${urn}`)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.validationErrors.push(`${urn}: ${e.message}`)
                }
                if (response.status == 200) {
                    // if it validates, remove from addScoreSetInput and add to validScoreSetUrnsToAdd
                    _.remove(this.addDataSetInput, (u) => u == urn)
                    this.validDataSetUrnsToAdd.push(urn)
                }
            }
        },

        resetDataSetEditor: function() {
            this.addDataSetInput = []
            this.validDataSetUrnsToAdd = []
            this.dataSetUrnsToRemove = []
            this.validationErrors = []
            this.additionErrors = []
            this.removalErrors = []
        }
    }
}

</script>

<style scoped>

.collection-data-set-editor-button {
    width: fit-content;
}

.add-data-set-button {
    width: fit-content;
}

.remove-data-set-button {
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