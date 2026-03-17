<template>
  <template v-if="visible">
    <EmailPrompt :is-first-login-prompt="false" />
  </template>
  <div>
    <PButton v-if="showTrigger" label="Add items" @click="openEditor" />
    <PDialog
      v-model:visible="visible"
      :close-on-escape="false"
      :header="`Add ${dataSetTypeDisplay[dataSetType]}s to collection`"
      modal
      :style="{width: '45rem', maxWidth: 'calc(100% - 2rem)'}"
      @hide="resetDataSetEditor"
    >
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <AutoComplete
            ref="urnAutoComplete"
            v-model="unvalidatedUrnsToAdd"
            class="flex-auto w-full"
            :multiple="true"
            :placeholder="unvalidatedUrnsToAdd.length ? '' : 'Type or paste comma-separated URNs'"
            :pt="{overlay: () => ({class: ['invisible']})}"
            @keyup.,="newUnvalidatedUrnToAdd"
            @keyup.enter.prevent="fetchDataSetsToAdd"
            @keyup.escape="clearAutoCompleteInput"
            @keyup.space="newUnvalidatedUrnToAdd"
          />
          <PButton class="flex-none" icon="pi pi-plus" label="Add" @click="fetchDataSetsToAdd" />
        </div>
        <DataTable
          v-if="dataSetsToAdd.length > 0"
          data-key="urn"
          table-style="width: 100%; table-layout: fixed"
          :value="dataSetsToAdd"
        >
          <Column
            field="urn"
            header="URN"
            style="width: 35%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          />
          <Column
            field="title"
            header="Title"
            style="width: 58%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          />
          <Column style="width: 7%">
            <template #body="{data}: {data: DataSetItem}">
              <PButton
                aria-label="Remove"
                icon="pi pi-trash"
                rounded
                severity="danger"
                size="small"
                text
                @click="removeDataSetToAdd(data.urn)"
              />
            </template>
          </Column>
        </DataTable>
        <Message v-if="errors.length > 0" severity="error">
          <template v-if="errors.length === 1">{{ errors[0] }}</template>
          <template v-else>
            There were errors:
            <div class="max-h-[100px] overflow-auto w-full">
              <div v-for="errorMessage in errors" :key="errorMessage">{{ errorMessage }}</div>
            </div>
          </template>
        </Message>
      </div>
      <div class="flex justify-end gap-2 mt-5">
        <PButton label="Cancel" severity="secondary" @click="visible = false" />
        <PButton :disabled="dataSetsToAdd.length === 0" label="Save" severity="success" @click="saveChanges" />
      </div>
    </PDialog>
    <PDialog
      v-model:visible="unpreparedChangesDialogVisible"
      :close-on-escape="true"
      header="Warning"
      modal
      :style="{width: '28rem', maxWidth: 'calc(100% - 2rem)'}"
    >
      <p class="mb-4">Please add your new data sets or clear the URNs box before saving changes.</p>
      <div class="flex justify-end">
        <PButton label="OK" severity="warn" @click="unpreparedChangesDialogVisible = false" />
      </div>
    </PDialog>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType} from 'vue'
import AutoComplete from 'primevue/autocomplete'
import PButton from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import PDialog from 'primevue/dialog'
import Message from 'primevue/message'

import useItem from '@/composition/item.ts'
import {addCollectionScoreSet, addCollectionExperiment} from '@/api/mavedb/collections'
import {getScoreSet} from '@/api/mavedb/variants'
import {getExperiment} from '@/api/mavedb/experiments'
import {getErrorResponse} from '@/api/mavedb'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import {components} from '@/schema/openapi'

type Collection = components['schemas']['Collection']

type DataSetType = 'scoreSet' | 'experiment'

interface DataSetItem {
  urn: string
  title: string
}

const TOAST_ITEM_LIMIT = 3

function truncatedList(items: string[], separator = ', '): string {
  if (items.length <= TOAST_ITEM_LIMIT) return items.join(separator)
  return `${items.slice(0, TOAST_ITEM_LIMIT).join(separator)} (+${items.length - TOAST_ITEM_LIMIT} more)`
}

const dataSetTypeDisplay: Record<DataSetType, string> = {
  scoreSet: 'score set',
  experiment: 'experiment'
}

export default defineComponent({
  name: 'CollectionDataSetEditor',

  components: {AutoComplete, PButton, Column, DataTable, PDialog, EmailPrompt, Message},

  props: {
    collectionUrn: {
      type: String,
      required: true
    },
    dataSetType: {
      type: String as PropType<DataSetType>,
      required: true
    },
    showTrigger: {
      type: Boolean,
      default: true
    }
  },

  emits: ['saved'],

  setup: () => useItem<Collection>({itemTypeName: 'collection'}),

  data: () => ({
    visible: false,

    unvalidatedUrnsToAdd: [] as string[],
    dataSetsToAdd: [] as DataSetItem[],
    errors: [] as string[],

    dataSetTypeDisplay,
    unpreparedChangesDialogVisible: false
  }),

  watch: {
    collectionUrn: {
      handler(newValue: string, oldValue: string) {
        if (newValue != oldValue) {
          this.setItemId(newValue)
        }
      },
      immediate: true
    }
  },

  methods: {
    openEditor(): void {
      this.visible = true
    },

    clearAutoCompleteInput(event: KeyboardEvent): void {
      const target = event.target as HTMLInputElement | null
      if (target) {
        target.value = ''
      }
    },

    newUnvalidatedUrnToAdd(event: KeyboardEvent): void {
      const target = event.target as HTMLInputElement
      const val = (target?.value || '').replace(',', '').trim()
      if (val !== '') {
        if (!this.unvalidatedUrnsToAdd.includes(val)) {
          this.unvalidatedUrnsToAdd.push(val)
        }
      }
      target.value = ''
    },

    flushPendingUrnInput(): void {
      const autoComplete = this.$refs.urnAutoComplete as {$el?: HTMLElement} | undefined
      const input = autoComplete?.$el?.querySelector('input') as HTMLInputElement | null
      const pendingUrn = (input?.value || '').replace(',', '').trim()
      if (pendingUrn !== '' && !this.unvalidatedUrnsToAdd.includes(pendingUrn)) {
        this.unvalidatedUrnsToAdd.push(pendingUrn)
      }
      if (input) {
        input.value = ''
      }
    },

    async saveChanges(): Promise<void> {
      if (this.unvalidatedUrnsToAdd.length > 0) {
        this.unpreparedChangesDialogVisible = true
        return
      }

      this.errors = []

      const failedUrns = new Set<string>()
      for (const dataSetToAdd of this.dataSetsToAdd) {
        try {
          if (this.dataSetType == 'experiment') {
            await addCollectionExperiment(this.collectionUrn, dataSetToAdd.urn)
          } else if (this.dataSetType == 'scoreSet') {
            await addCollectionScoreSet(this.collectionUrn, dataSetToAdd.urn)
          }
        } catch (error) {
          failedUrns.add(dataSetToAdd.urn)
          this.errors.push(
            `${dataSetToAdd.urn}: ${error instanceof Error ? error.message : 'Could not be added to the collection'}`
          )
        }
      }
      this.dataSetsToAdd = this.dataSetsToAdd.filter((ds) => failedUrns.has(ds.urn))

      if (this.errors.length === 0) {
        this.visible = false
        this.$toast.add({
          severity: 'success',
          summary: `Successfully added ${this.dataSetTypeDisplay[this.dataSetType]}s.`,
          life: 3000
        })
      }

      // Always emit 'saved', because if any API calls succeed (even if others fail), we need to reload collection's data sets.
      this.$emit('saved')
    },

    removeDataSetToAdd(urn: string): void {
      this.dataSetsToAdd = this.dataSetsToAdd.filter((ds) => ds.urn !== urn)
    },

    async fetchDataSetsToAdd(): Promise<void> {
      this.errors = []
      this.flushPendingUrnInput()

      if (!this.item) {
        this.errors.push('Collection is still loading. Please try again in a moment.')
        return
      }

      if (this.unvalidatedUrnsToAdd.length === 0) {
        this.errors.push('Please enter at least one URN.')
        return
      }

      const urnKey = this.dataSetType === 'experiment' ? 'experimentUrns' : 'scoreSetUrns'
      const existingUrns = new Set(this.item[urnKey])
      const queuedUrns = new Set(this.dataSetsToAdd.map((ds) => ds.urn))

      const skipped: string[] = []
      const failed: string[] = []

      for (const raw of this.unvalidatedUrnsToAdd) {
        const urn = raw.trim()
        if (existingUrns.has(urn)) {
          skipped.push(urn)
        } else if (queuedUrns.has(urn)) {
          skipped.push(urn)
        } else {
          try {
            const data = this.dataSetType === 'experiment' ? await getExperiment(urn) : await getScoreSet(urn)
            this.dataSetsToAdd.push(data)
            queuedUrns.add(urn)
          } catch (e) {
            const response = getErrorResponse(e)
            const detail = response.data?.detail || (e instanceof Error ? e.message : 'Invalid URN')
            this.errors.push(`${urn}: ${detail}`)
            failed.push(urn)
          }
        }
      }
      this.unvalidatedUrnsToAdd = []

      if (failed.length > 0) {
        this.$toast.add({
          severity: 'warn',
          summary: 'Some URNs could not be added',
          detail: truncatedList(failed, ' • '),
          life: 6000
        })
      }

      if (skipped.length > 0) {
        this.$toast.add({
          severity: 'info',
          summary: 'Some URNs were skipped',
          detail: `Already in collection or queued: ${truncatedList(skipped)}`,
          life: 5000
        })
      }
    },

    resetDataSetEditor(): void {
      this.unvalidatedUrnsToAdd = []
      this.dataSetsToAdd = []
      this.errors = []
    }
  }
})
</script>
