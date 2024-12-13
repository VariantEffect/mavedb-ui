<template>

<div class="collection-score-set-editor">
    <Button
        @click="visible = true"
        class="collection-score-set-editor-button"
        label="Edit"
    ></Button>

    <Dialog
        v-model:visible="visible"
        modal
        header="Add and remove score sets from collection"
        :style="{ width: '45rem' }"
        :close-on-escape="false"
        @hide="addScoreSetInput = null; validScoreSetsToAdd = []; scoreSetsToRemove = null"
    >
        <div>
            Add score sets
            <div class="add-score-set-panels">
                <Chips
                    v-model="addScoreSetInput"
                    separator=","
                    :addOnBlur="true"
                    :allowDuplicate="false"
                    @keyup.escape="addScoreSetInput = null"
                    placeholder="Type or paste comma-separated URNs"
                    class="add-score-set-panel"
                />
                <!-- TODO allow client to remove individual URNs that have already been validated? -->
                <Chips
                    :disabled="true"
                    v-model="validScoreSetsToAdd"
                    placeholder="Validated score set URNs"
                    class="add-score-set-panel"
                />
            </div>
            <!-- TODO move button to bottom right of left-hand (input) panel -->
            <Button label="Validate" @click="validateUrns" />
            <!-- TODO display validation errors -->
        </div>
        <div class="flex flex-column gap-2">
            <label :for="$scopedId('input-remove-score-sets')">Remove score sets</label>
            <MultiSelect
                v-model="scoreSetsToRemove"
                :options="item.scoreSetUrns"
                placeholder="Select score sets"
                :maxSelectedLabels="3"
                class="w-full md:w-20rem"
                :id="$scopedId('input-remove-score-sets')"
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
import Dropdown from 'primevue/dropdown'
import MultiSelect from 'primevue/multiselect'

import config from '@/config'
import useItem from '@/composition/item'

export default {
    name: 'CollectionScoreSetEditor',

    components: { Button, Chips, Dialog, Dropdown, MultiSelect },

    props: {
        collectionUrn: {
            type: String,
            required: true
        }
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

    data: () => ({
        visible: false,
        addScoreSetInput: null,
        validScoreSetsToAdd: [],
        validationErrors: [],
        scoreSetsToRemove: null,
    }),

    methods: {
        saveToCollection: async function(dataSet) {
            // TODO
            this.visible = false
        },

        validateUrns: async function() {
            // each chip should be validated
            for (const newUrn of this.addScoreSetInput) {
                const urn = newUrn.trim()
                // TODO check regex first? would need to include tmp and watch out for old urns that follow outdated regex, which we would still want to include
                // check score set not already in validated list
                if (this.validScoreSetsToAdd.includes(urn)) {
                    // silently remove?
                    _.remove(this.addScoreSetInput, (u) => u == urn)
                    continue
                }
                // check score set not already in collection
                if (this.item.scoreSetUrns.includes(urn)) {
                    // silently remove? TODO probably want to give validation error here 
                    _.remove(this.addScoreSetInput, (u) => u == urn)
                    continue  
                }
                // check that score set exists
                let response = null
                try {
                    response = await axios.get(`${config.apiBaseUrl}/score-sets/${urn}`)
                } catch (e) {
                    response = e.response || { status: 500 }
                    this.validationErrors.push(response)
                }
                if (response.status == 200) {
                    // if it validates, remove from addScoreSetInput and add to validScoreSetsToAdd
                    _.remove(this.addScoreSetInput, (u) => u == urn)
                    this.validScoreSetsToAdd.push(urn)
                }
            }
        }
    }
}

</script>

<style scoped>

.collection-score-set-editor-button {
    width: fit-content;
}

.add-score-set-panels {
    display: flex;
    justify-content: space-between;
    gap: 30px;
}

.add-score-set-panels .p-chips {
    flex-grow: 1;
    min-width: 0;
    max-width: 50%;
}

.add-score-set-panel:deep(.p-chips-multiple-container) {
    width: 100%;
    overflow-x: scroll;
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