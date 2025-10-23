<template>
  <DefaultLayout>
    <div v-if="itemStatus === 'Loaded' && item">
      <div class="mave-screen-title-bar">
        <div>Calibrations for: {{ getScoreSetShortName(item) }}</div>
        <div class="calibration-title-actions">
          <PrimeButton
            v-if="userIsAuthorizedToEditScoreSet"
            class="p-button p-component"
            icon="pi pi-plus"
            label="New calibration"
            @click="createCalibration(item.urn)"
          />
          <PrimeButton
            class="p-button p-component"
            icon="pi pi-refresh"
            title="Reload calibrations"
            @click="reloadItem()"
          />
          <PrimeButton
            class="p-button p-component"
            icon="pi pi-download"
            title="Download calibration JSON"
            @click="downloadCalibrations()"
          />
        </div>
      </div>
      <div class="p-d-flex p-flex-column p-ai-center" style="width: 100%">
        <div v-if="item.scoreCalibrations.length === 0">
          <p>No calibrations found for this score set.</p>
        </div>
        <div v-else>
          <DataTable
            v-model:expanded-rows="expandedRows"
            class="mavedb-calibrations-datatable"
            data-key="id"
            :multi-sort-meta="[
              {field: 'primary', order: -1},
              {field: 'private', order: -1},
              {field: 'title', order: 1}
            ]"
            :paginator="item.scoreCalibrations.length > 15"
            :rows="15"
            :sort-mode="'multiple'"
            :striped-rows="true"
            :value="item.scoreCalibrations"
          >
            <Column :expander="true" header-style="width:3rem" />

            <!-- Data columns -->
            <Column field="title" header="Title" :sortable="true">
              <template #body="{data}"> {{ data.title || '—' }} </template>
            </Column>
            <Column field="notes" header="Notes">
              <template #body="{data}">
                <span class="truncate multi-line" :title="data.notes">{{ data.notes || '—' }}</span>
              </template>
            </Column>
            <Column body-class="mave-align-center" field="private" header="Published" :sortable="true">
              <template #body="{data}">
                <Tag
                  :class="`mavedb-calibration-tag ${data.private ? 'tag-private' : 'tag-published'}`"
                  :value="data.private ? 'No' : 'Yes'"
                />
              </template>
            </Column>
            <Column body-class="mave-align-center" field="primary" header="Primary" :sortable="true">
              <template #body="{data}">
                <Tag
                  :class="`mavedb-calibration-tag ${data.primary ? 'tag-primary' : 'tag-non-primary'}`"
                  :value="data.primary ? 'Yes' : 'No'"
                />
              </template>
            </Column>
            <Column body-class="mave-align-center" field="investigatorProvided" header="Investigator" :sortable="true">
              <template #body="{data}">
                <Tag
                  :class="`mavedb-calibration-tag ${data.investigatorProvided ? 'tag-investigator-provided' : 'tag-non-investigator'}`"
                  :value="data.investigatorProvided ? 'Yes' : 'No'"
                />
              </template>
            </Column>
            <Column body-class="mave-align-center" field="researchUseOnly" header="Use type" :sortable="true">
              <template #body="{data}">
                <Tag
                  :class="`mavedb-calibration-tag ${data.researchUseOnly ? 'tag-research-use' : 'tag-general-use'}`"
                  :value="data.researchUseOnly ? 'Research' : 'General'"
                />
              </template>
            </Column>
            <Column body-class="mave-align-center" field="functionalRangeCount" header="#Ranges" :sortable="true">
              <template #body="{data}">{{
                data.functionalRanges ? data.functionalRanges.length : data.functionalRangeCount || 0
              }}</template>
            </Column>
            <Column header="Actions">
              <template #body="{data}">
                <div class="calibration-actions">
                  <router-link
                    :title="'View calibration ' + (data.title || data.urn) + ' in Score Set'"
                    :to="{name: 'scoreSet', params: {urn: item.urn}, query: {calibration: data.urn}}"
                  >
                    <PrimeButton
                      class="p-button p-component p-button-sm p-button-info"
                      icon="pi pi-eye"
                      :rounded="true"
                    />
                  </router-link>
                  <!-- Only an authenticated user will be able to edit these properties -->
                  <template v-if="userIsAuthenticated">
                    <PrimeButton
                      v-if="calibrationAuthorizations[data.urn]?.update && userIsAuthorizedToEditScoreSet"
                      class="p-button p-component p-button-sm"
                      icon="pi pi-pencil"
                      :rounded="true"
                      title="Edit calibration"
                      @click="editCalibration(data.urn)"
                    />
                    <PrimeButton
                      v-if="calibrationAuthorizations[data.urn]?.change_rank && data.primary"
                      class="p-button p-component p-button-sm p-button-warning"
                      icon="pi pi-angle-double-down"
                      :rounded="true"
                      title="Demote calibration to non-primary"
                      @click="demoteCalibration(data.urn)"
                    />
                    <PrimeButton
                      v-if="calibrationAuthorizations[data.urn]?.change_rank && !data.primary"
                      class="p-button p-component p-button-sm p-button-warning"
                      :disabled="data.researchUseOnly || primaryExists"
                      icon="pi pi-angle-double-up"
                      :rounded="true"
                      title="Promote calibration to primary"
                      @click="promoteCalibration(data.urn)"
                    />
                    <PrimeButton
                      v-if="calibrationAuthorizations[data.urn]?.publish && data.private"
                      class="p-button p-component p-button-sm p-button-success"
                      icon="pi pi-check-circle"
                      :rounded="true"
                      title="Publish calibration"
                      @click="publishCalibration(data.urn)"
                    />
                    <PrimeButton
                      v-if="calibrationAuthorizations[data.urn]?.delete"
                      class="p-button p-component p-button-sm p-button-danger"
                      icon="pi pi-trash"
                      :rounded="true"
                      title="Delete calibration"
                      @click="deleteCalibration(data.urn)"
                    />
                  </template>
                </div>
              </template>
            </Column>
            <template #expansion="{data}">
              <div style="padding: 0.75rem 1rem">
                <CalibrationTable
                  v-if="data.functionalRanges && data.functionalRanges.length"
                  :score-calibration="data"
                  :score-calibration-name="data.title || ''"
                />
                <div v-else style="font-size: 0.85rem; color: var(--text-color-secondary)">
                  No functional ranges defined for this calibration.
                </div>
              </div>
            </template>
          </DataTable>
        </div>
      </div>
    </div>
    <div v-else-if="['NotLoaded', 'Loading'].includes(itemStatus)" class="p-m-4">
      <PageLoading />
    </div>
  </DefaultLayout>
  <PrimeDialog
    v-model:visible="editorVisible"
    :close-on-escape="true"
    :header="editingCalibrationUrn ? 'Edit Calibration' : 'Create New Calibration'"
    modal
    :style="{maxWidth: '90%', width: '75rem'}"
  >
    <CalibrationEditor
      :calibration-draft-ref="calibrationDraftRef"
      :calibration-urn="editingCalibrationUrn"
      :score-set-urn="editingScoreSetUrn"
      :validation-errors="editorValidationErrors"
      @canceled="cancelEditCreate"
    />
    <template #footer>
      <PrimeButton
        class="p-button p-component p-button-secondary"
        icon="pi pi-times"
        label="Close"
        @click="cancelEditCreate"
      />
      <PrimeButton
        class="p-button p-component p-button-success"
        icon="pi pi-save"
        label="Save Changes"
        @click="saveChildCalibration"
      />
    </template>
  </PrimeDialog>
</template>

<script lang="ts">
import {useHead} from '@unhead/vue'
import DefaultLayout from '@/components/layout/DefaultLayout.vue'
import config from '@/config'
import PrimeButton from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import useItem from '@/composition/item'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import PageLoading from '../common/PageLoading.vue'
import CalibrationTable from '../CalibrationTable.vue'
import {getScoreSetShortName} from '@/lib/score-sets'
import axios from 'axios'
import {useConfirm} from 'primevue/useconfirm'
import CalibrationEditor, {DraftScoreCalibration} from '../CalibrationEditor.vue'
import {ref} from 'vue'
import PrimeDialog from 'primevue/dialog'

interface CalibrationAuthorizations {
  update: boolean
  delete: boolean
  publish: boolean
  change_rank: boolean
}

export default {
  name: 'ScoreSetCalibrationsView',
  components: {
    CalibrationEditor,
    PrimeButton,
    DefaultLayout,
    DataTable,
    Column,
    Tag,
    PageLoading,
    CalibrationTable,
    PrimeDialog
  },
  props: {
    itemId: {
      type: String,
      required: true
    }
  },
  setup: (props) => {
    const head = useHead({title: `Calibrations for ${props.itemId}`})

    const {userIsAuthenticated} = useAuth()
    const confirm = useConfirm()
    const editorVisible = ref(false)
    const editingCalibrationUrn = ref<string | undefined>(undefined)
    const editingScoreSetUrn = ref<string | undefined>(undefined)

    const calibrationDraftRef = ref<{value: DraftScoreCalibration | null}>({value: null})
    const editorValidationErrors = ref<Record<string, string>>({})

    const userIsAuthorizedToEditScoreSet = ref(false)
    const calibrationAuthorizations = ref<Record<string, CalibrationAuthorizations>>({})

    return {
      head,
      config,
      userIsAuthenticated,
      userIsAuthorizedToEditScoreSet,
      calibrationAuthorizations,
      confirm,
      calibrationDraftRef,
      editorValidationErrors,
      editorVisible,
      editingCalibrationUrn,
      editingScoreSetUrn,
      getScoreSetShortName,
      // @ts-expect-error dynamic store module typing
      ...useItem({itemTypeName: 'scoreSet'}),
      ...useScopedId()
    }
  },
  data() {
    return {
      // Expanded calibration rows (PrimeVue expects raw row objects)
      expandedRows: [] as Array<Record<string, unknown>>
    }
  },
  computed: {
    primaryExists(): boolean {
      if (this.item && this.item.scoreCalibrations) {
        // Treat each item as calibration with a boolean primary
        return this.item.scoreCalibrations.some((calibration: {primary?: boolean}) => !!calibration.primary)
      }
      return false
    }
  },
  watch: {
    item(newValue) {
      this.head.patch({title: newValue ? `Calibrations for ${getScoreSetShortName(newValue)}` : undefined})
      // Clear expanded rows when underlying item changes (avoid stale expanded state)
      this.expandedRows = []
    },
    itemId: {
      handler: async function (newValue, oldValue) {
        if (newValue !== oldValue) {
          this.setItemId(newValue)
          await this.ensureItemLoaded()
          await this.checkScoreSetAuthorization()
          for (const calibration of this.item.scoreCalibrations) {
            await this.checkCalibrationAuthorization(calibration.urn)
          }
        }
      },
      immediate: true
    }
  },
  methods: {
    checkScoreSetAuthorization: async function () {
      // Response should be true to get authorization
      try {
        const response = await axios.get(
          `${config.apiBaseUrl}/permissions/user-is-permitted/score-set/${this.itemId}/update`
        )
        this.userIsAuthorizedToEditScoreSet = response.data
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }
    },

    checkCalibrationAuthorization: async function (calibrationUrn: string) {
      const calibrationAuthorizations: CalibrationAuthorizations = {
        update: false,
        delete: false,
        publish: false,
        change_rank: false
      }

      try {
        for (const action of Object.keys(calibrationAuthorizations) as Array<keyof CalibrationAuthorizations>) {
          const response = await axios.get(
            `${config.apiBaseUrl}/permissions/user-is-permitted/score-calibration/${calibrationUrn}/${action}`
          )
          calibrationAuthorizations[action] = response.data
        }
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }

      this.calibrationAuthorizations = {
        ...this.calibrationAuthorizations,
        [calibrationUrn]: calibrationAuthorizations
      }
    },

    editCalibration(calibrationUrn: string) {
      this.editorVisible = true
      this.editingCalibrationUrn = calibrationUrn
      this.editingScoreSetUrn = undefined
    },

    createCalibration(scoreSetUrn: string) {
      this.editorVisible = true
      this.editingCalibrationUrn = undefined
      this.editingScoreSetUrn = scoreSetUrn
    },

    cancelEditCreate: function () {
      this.editorVisible = false
      this.editingCalibrationUrn = undefined
      this.editingScoreSetUrn = undefined
    },

    saveChildCalibration: async function () {
      if (this.calibrationDraftRef.value) {
        try {
          const draft = this.calibrationDraftRef.value
          if (this.editingCalibrationUrn) {
            // Existing calibration, perform update
            await axios.put(`${config.apiBaseUrl}/score-calibrations/${draft.urn}`, {
              ...draft
            })
          } else {
            // New calibration, perform create
            await axios.post(`${config.apiBaseUrl}/score-calibrations`, {
              ...draft
            })
          }
          this.$toast.add({
            severity: 'success',
            summary: 'Calibration Saved',
            detail: 'Calibration saved successfully.',
            life: 4000
          })
          this.editorVisible = false
          this.editingCalibrationUrn = undefined
          this.editingScoreSetUrn = undefined
          this.editorValidationErrors = {}
          await this.reloadItem()
        } catch (error: unknown) {
          if (axios.isAxiosError(error) && error.response && error.response.data && error.response.data.detail) {
            const formValidationErrors: Record<string, string> = {}
            if (typeof error.response.data.detail === 'string' || error.response.data.detail instanceof String) {
              // Handle generic errors that are not surfaced by the API as objects
              this.$toast.add({
                severity: 'error',
                summary: `Encountered an error saving score set: ${error.response.data.detail}`
              })
            } else {
              for (const err of error.response.data.detail) {
                let path = err.loc
                if (path[0] == 'body') {
                  path = path.slice(1)
                }

                let customPath = err.ctx.error.custom_loc
                if (customPath) {
                  if (customPath[0] == 'body') {
                    customPath = customPath.slice(1)
                  }
                }

                if (customPath) {
                  path = path.concat(customPath)
                }

                path = path.join('.')
                formValidationErrors[path] = err.msg
              }
              this.editorValidationErrors = {...formValidationErrors}
            }
          } else {
            console.error('Error saving calibration:', error)
            this.$toast.add({
              severity: 'error',
              summary: 'Calibration Not Saved',
              detail: `An error occurred while saving the calibration: ${error}. Please try again later.`,
              life: 4000
            })
          }
        }
      }
    },

    publishCalibration: async function (calibrationUrn: string) {
      this.confirm.require({
        message:
          'Are you sure you want to publish this score calibration? Once published, you will be unable to edit its functional ranges or other details.',
        header: 'Confirm Score Set Publication',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Publish',
        acceptClass: 'p-button-success',
        rejectLabel: 'Cancel',
        rejectClass: 'p-button',
        acceptIcon: 'pi pi-check',
        rejectIcon: 'pi pi-times',
        accept: async () => {
          try {
            await axios.post(`${config.apiBaseUrl}/score-calibrations/${calibrationUrn}/publish`)
            this.$toast.add({
              severity: 'success',
              summary: 'Calibration Published',
              detail: 'Calibration published successfully.',
              life: 4000
            })
            await this.reloadItem()
          } catch (error) {
            console.error('Error publishing calibration:', error)
            this.$toast.add({
              severity: 'error',
              summary: 'Calibration Not Published',
              detail: `An error occurred while publishing the calibration: ${error}. Please try again later.`,
              life: 4000
            })
          }
        },
        reject: () => {
          //callback to execute when user rejects the action
          //do nothing
        }
      })
    },

    demoteCalibration: async function (calibrationUrn: string) {
      try {
        await axios.post(`${config.apiBaseUrl}/score-calibrations/${calibrationUrn}/demote-from-primary`)
        this.$toast.add({
          severity: 'success',
          summary: 'Calibration Demoted',
          detail: 'Calibration demoted to non-primary successfully.',
          life: 4000
        })
        await this.reloadItem()
      } catch (error) {
        console.error('Error demoting calibration:', error)
        this.$toast.add({
          severity: 'error',
          summary: 'Calibration Not Demoted',
          detail: `An error occurred while demoting the calibration: ${error}. Please try again later.`,
          life: 4000
        })
      }
    },

    promoteCalibration: async function (calibrationUrn: string) {
      try {
        await axios.post(`${config.apiBaseUrl}/score-calibrations/${calibrationUrn}/promote-to-primary`)
        this.$toast.add({
          severity: 'success',
          summary: 'Calibration Promoted',
          detail: 'Calibration promoted to primary successfully.',
          life: 4000
        })
        await this.reloadItem()
      } catch (error) {
        console.error('Error promoting calibration:', error)
        this.$toast.add({
          severity: 'error',
          summary: 'Calibration Not Promoted',
          detail: `An error occurred while promoting the calibration: ${error}. Please try again later.`,
          life: 4000
        })
      }
    },

    deleteCalibration: async function (calibrationUrn: string) {
      this.confirm.require({
        message: 'Are you sure you want to delete this score calibration? This action cannot be undone.',
        header: 'Confirm Calibration Deletion',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Delete',
        acceptClass: 'p-button-danger',
        rejectLabel: 'Cancel',
        rejectClass: 'p-button',
        acceptIcon: 'pi pi-trash',
        rejectIcon: 'pi pi-times',
        accept: async () => {
          try {
            await axios.delete(`${config.apiBaseUrl}/score-calibrations/${calibrationUrn}`)
            this.$toast.add({
              severity: 'success',
              summary: 'Calibration Deleted',
              detail: 'Calibration deleted successfully.',
              life: 4000
            })
            await this.reloadItem()
          } catch (error) {
            console.error('Error deleting calibration:', error)
            this.$toast.add({
              severity: 'error',
              summary: 'Calibration Not Deleted',
              detail: `An error occurred while deleting the calibration: ${error}. Please try again later.`,
              life: 4000
            })
          }
        },
        reject: () => {
          //callback to execute when user rejects the action
          //do nothing
        }
      })
    },

    downloadCalibrations: async function () {
      try {
        const response = await axios.get(`${config.apiBaseUrl}/score-calibrations/score-set/${this.itemId}`)
        const dataStr = JSON.stringify(response.data, null, 2)
        const blob = new Blob([dataStr], {type: 'application/json'})
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `score-set-${this.itemId}-calibrations.json`
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
      } catch (error) {
        console.error('Error downloading calibrations:', error)
        this.$toast.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: `An error occurred while downloading the calibrations: ${error}. Please try again later.`,
          life: 4000
        })
      }
    }
  }
}
</script>

<style scoped>
.mavedb-calibrations-datatable {
  width: 100%;
}
.mavedb-calibrations-datatable :deep(.p-datatable-thead > tr > th) {
  white-space: nowrap;
}
.mavedb-calibrations-datatable :deep(.p-datatable-tbody > tr > td) {
  vertical-align: top;
}
.mavedb-calibrations-datatable :deep(.mave-align-center) {
  text-align: center;
}
.calibration-actions {
  display: flex;
  /*
  Crude, but the approximate width of two buttons so
  we can always have at least two of them side-by-side
  even when wrapped.
  */
  min-width: 4rem;
  flex-wrap: wrap;
  gap: 0.15rem;
}
.calibration-title-actions {
  display: flex;
  /*
  Crude, but the approximate width of two buttons so
  we can always have at least two of them side-by-side
  even when wrapped.
  */
  flex-wrap: wrap;
  gap: 0.15rem;
}
.truncate {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.multi-line {
  white-space: normal;
  line-height: 1.2;
  max-height: 2.4em;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.mavedb-calibration-tag {
  display: inline-block;
  padding: 0.15em 0.7em;
  margin-right: 0.3em;
  border-radius: 1em;
  font-size: 0.85em;
  font-weight: 500;
  background: var(--surface-border);
  color: var(--text-color-secondary);
}
.tag-primary,
.tag-general-use,
.tag-published {
  background: var(--green-100);
  color: var(--green-700);
  border: 1px solid var(--green-300);
}
.tag-non-primary,
.tag-private,
.tag-research-use {
  background: var(--red-100);
  color: var(--red-700);
  border: 1px solid var(--red-300);
}
.tag-investigator-provided {
  background: var(--blue-100);
  color: var(--blue-700);
  border: 1px solid var(--blue-300);
}
.tag-non-investigator {
  background: var(--purple-100);
  color: var(--purple-700);
  border: 1px solid var(--purple-300);
}
</style>

<style scoped>
.calibration-group-row td {
  background: var(--surface-ground);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding-top: 0.6rem !important;
  padding-bottom: 0.4rem !important;
  border-top: 2px solid var(--surface-border);
}
.group-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.group-count {
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  color: var(--text-color-secondary);
}
</style>
