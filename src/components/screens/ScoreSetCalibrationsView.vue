<template>
  <EmailPrompt
    v-if="editorVisible"
    dialog="You must add an email address to your account to create or edit calibrations. You can do so below, or on the 'Settings' page."
    :is-first-login-prompt="false"
  />
  <MvLayout>
    <template #header>
      <MvPageHeader
        v-if="itemStatus === 'Loaded' && item"
        eyebrow="Calibrations"
        max-width="max-w-5xl"
        :title="item.title || 'Untitled Score Set'"
        variant="editor"
      >
        <template #subtitle>
          <router-link
            class="inline-block font-mono text-xs text-link"
            :to="{name: 'scoreSet', params: {urn: item.urn}}"
            >&larr; Back to score set view</router-link
          >
        </template>
        <template #actions>
          <PButton
            v-if="userIsAuthorizedToAddCalibration"
            icon="pi pi-plus"
            label="New calibration"
            @click="openCalibrationEditor(item.urn)"
          />
          <PButton icon="pi pi-refresh" severity="secondary" title="Reload calibrations" @click="reloadItem()" />
          <PButton
            icon="pi pi-download"
            severity="secondary"
            title="Download calibration JSON"
            @click="downloadCalibrations()"
          />
        </template>
      </MvPageHeader>
    </template>

    <div v-if="itemStatus === 'Loaded' && item" class="max-w-screen-xl px-4 py-7 tablet:px-6">
      <MvEmptyState
        v-if="!item.scoreCalibrations?.length"
        :action-label="userIsAuthorizedToAddCalibration ? '+ Create a calibration' : undefined"
        description="Score calibrations define functional classification ranges for clinical variant interpretation. Add one to help users interpret scores from this dataset."
        title="No calibrations yet"
        @action="openCalibrationEditor(item.urn)"
      />
      <div v-else class="cal-card">
        <DataTable
          v-model:expanded-rows="expandedRows"
          class="cal-datatable"
          data-key="id"
          :multi-sort-meta="[
            {field: 'primary', order: -1},
            {field: 'private', order: -1},
            {field: 'title', order: 1}
          ]"
          :paginator="(item.scoreCalibrations?.length ?? 0) > 15"
          :rows="15"
          :sort-mode="'multiple'"
          :striped-rows="true"
          :value="item.scoreCalibrations ?? []"
        >
          <Column :expander="true" header-style="width:3rem" />

          <Column field="title" header="Title" :sortable="true">
            <template #body="{data}">
              <span class="font-semibold text-text-primary">{{ data.title || '—' }}</span>
            </template>
          </Column>
          <Column field="notes" header="Notes">
            <template #body="{data}">
              <span :class="expandedNotes[data.id] ? 'notes-expanded' : 'notes-truncated'" :title="data.notes">
                {{ data.notes || '—' }}
              </span>
              <button
                v-if="data.notes && data.notes.length > 100 && !expandedNotes[data.id]"
                class="ml-1 text-xs font-medium text-link hover:underline"
                @click="expandedNotes[data.id] = true"
              >
                See more
              </button>
              <button
                v-if="data.notes && expandedNotes[data.id]"
                class="ml-1 text-xs font-medium text-link hover:underline"
                @click="expandedNotes[data.id] = false"
              >
                See less
              </button>
            </template>
          </Column>
          <Column body-class="text-center" field="private" header="Published" :sortable="true">
            <template #body="{data}">
              <span :class="data.private ? 'cal-tag cal-tag-red' : 'cal-tag cal-tag-green'">
                {{ data.private ? 'No' : 'Yes' }}
              </span>
            </template>
          </Column>
          <Column body-class="text-center" field="primary" header="Primary" :sortable="true">
            <template #body="{data}">
              <span :class="data.primary ? 'cal-tag cal-tag-green' : 'cal-tag cal-tag-red'">
                {{ data.primary ? 'Yes' : 'No' }}
              </span>
            </template>
          </Column>
          <Column body-class="text-center" field="investigatorProvided" header="Type" :sortable="true">
            <template #body="{data}">
              <span :class="data.investigatorProvided ? 'cal-tag cal-tag-blue' : 'cal-tag cal-tag-purple'">
                {{ data.investigatorProvided ? 'Investigator' : 'Community' }}
              </span>
            </template>
          </Column>
          <Column body-class="text-center" field="researchUseOnly" header="Use" :sortable="true">
            <template #body="{data}">
              <span :class="data.researchUseOnly ? 'cal-tag cal-tag-red' : 'cal-tag cal-tag-green'">
                {{ data.researchUseOnly ? 'Research' : 'General' }}
              </span>
            </template>
          </Column>
          <Column body-class="text-center" field="functionalClassificationCount" header="Ranges" :sortable="true">
            <template #body="{data}">{{
              data.functionalClassifications
                ? data.functionalClassifications.length
                : data.functionalClassificationCount || 0
            }}</template>
          </Column>
          <Column header="Actions">
            <template #body="{data}">
              <div class="flex flex-wrap gap-0.5" style="min-width: 4rem">
                <router-link
                  :title="'View calibration ' + (data.title || data.urn) + ' in Score Set'"
                  :to="{name: 'scoreSet', params: {urn: item.urn}, query: {calibration: data.urn}}"
                >
                  <PButton icon="pi pi-eye" rounded severity="info" size="small" />
                </router-link>
                <template v-if="userIsAuthenticated">
                  <PButton
                    v-if="calibrationAuthorizations[data.urn]?.update"
                    icon="pi pi-pencil"
                    :rounded="true"
                    size="small"
                    title="Edit calibration"
                    @click="editCalibrationInEditor(data.urn)"
                  />
                  <PButton
                    v-if="calibrationAuthorizations[data.urn]?.change_rank && data.primary"
                    icon="pi pi-angle-double-down"
                    :rounded="true"
                    severity="warn"
                    size="small"
                    title="Demote calibration to non-primary"
                    @click="demoteCalibration(data.urn)"
                  />
                  <PButton
                    v-if="calibrationAuthorizations[data.urn]?.change_rank && !data.primary"
                    :disabled="data.researchUseOnly || primaryExists"
                    icon="pi pi-angle-double-up"
                    :rounded="true"
                    severity="warn"
                    size="small"
                    title="Promote calibration to primary"
                    @click="promoteCalibration(data.urn)"
                  />
                  <PButton
                    v-if="calibrationAuthorizations[data.urn]?.publish && data.private"
                    icon="pi pi-check-circle"
                    :rounded="true"
                    severity="success"
                    size="small"
                    title="Publish calibration"
                    @click="publishCalibration(data.urn)"
                  />
                  <PButton
                    v-if="calibrationAuthorizations[data.urn]?.delete"
                    icon="pi pi-trash"
                    :rounded="true"
                    severity="danger"
                    size="small"
                    title="Delete calibration"
                    @click="deleteCalibration(data.urn)"
                  />
                </template>
              </div>
            </template>
          </Column>
          <template #expansion="{data}">
            <div class="bg-[#f8faf9] px-6 py-5">
              <CalibrationTable
                v-if="data.functionalClassifications && data.functionalClassifications.length"
                :score-calibration="data"
                :score-calibration-name="data.title || ''"
              />
              <div v-else class="text-sm text-text-secondary">
                No functional classifications defined for this calibration.
              </div>
            </div>
          </template>
        </DataTable>
      </div>
    </div>
    <div v-else-if="['NotLoaded', 'Loading'].includes(itemStatus)" class="p-8">
      <PageLoading />
    </div>
    <div v-else>
      <ItemNotFound :item-id="itemId" model="Score Set" />
    </div>
  </MvLayout>
  <PrimeDialog
    v-model:visible="editorVisible"
    :close-on-escape="false"
    :header="editorDialogHeader"
    modal
    :style="{maxWidth: '90%', width: '75rem'}"
    @hide="closeCalibrationEditor"
  >
    <CalibrationEditor
      ref="calibrationEditorRef"
      :calibration-urn="editingCalibrationUrn"
      :score-set-urn="editingScoreSetUrn"
      @canceled="closeCalibrationEditor"
      @saved="onCalibrationSaved"
    />
    <template #footer>
      <PButton icon="pi pi-times" label="Close" severity="secondary" @click="closeCalibrationEditor" />
      <PButton icon="pi pi-save" label="Save Changes" severity="success" @click="saveChildCalibration" />
    </template>
  </PrimeDialog>
</template>

<script lang="ts">
import {useHead} from '@unhead/vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import MvPageHeader from '@/components/layout/MvPageHeader.vue'
import MvEmptyState from '@/components/common/MvEmptyState.vue'
import {
  checkPermission,
  checkPermissions,
  publishScoreCalibration,
  demoteScoreCalibration,
  promoteScoreCalibration,
  deleteScoreCalibration,
  getScoreSetCalibrations
} from '@/api/mavedb'
import axios from 'axios'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import useItem from '@/composition/item.ts'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import {useCalibrationDialog} from '@/composables/use-calibration-dialog'
import PageLoading from '../common/PageLoading.vue'
import CalibrationTable from '../CalibrationTable.vue'
import {getScoreSetShortName} from '@/lib/score-sets'
import {useConfirm} from 'primevue/useconfirm'
import CalibrationEditor from '../forms/CalibrationEditor.vue'
import EmailPrompt from '@/components/common/EmailPrompt.vue'
import {ref} from 'vue'
import PrimeDialog from 'primevue/dialog'
import ItemNotFound from '../common/ItemNotFound.vue'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']

const CALIBRATION_ACTIONS = ['update', 'delete', 'publish', 'change_rank'] as const
type CalibrationAuthorizations = Record<(typeof CALIBRATION_ACTIONS)[number], boolean>

function extractErrorDetail(error: unknown): string {
  if (
    axios.isAxiosError(error) &&
    error.response?.data?.detail &&
    (typeof error.response.data.detail === 'string' || error.response.data.detail instanceof String)
  ) {
    return error.response.data.detail as string
  }
  return String(error)
}

export default {
  name: 'ScoreSetCalibrationsView',
  components: {
    CalibrationEditor,
    EmailPrompt,
    MvEmptyState,
    PButton: Button,
    MvLayout,
    MvPageHeader,
    DataTable,
    ItemNotFound,
    Column,
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

    const userIsAuthorizedToAddCalibration = ref(false)
    const calibrationAuthorizations = ref<Record<string, CalibrationAuthorizations>>({})

    return {
      head,
      userIsAuthenticated,
      userIsAuthorizedToAddCalibration,
      calibrationAuthorizations,
      confirm,
      getScoreSetShortName,
      ...useCalibrationDialog(),
      ...useItem<ScoreSet>({itemTypeName: 'scoreSet'}),
      ...useScopedId()
    }
  },
  data() {
    return {
      expandedRows: [] as Array<Record<string, unknown>>,
      expandedNotes: {} as Record<string, boolean>
    }
  },
  computed: {
    primaryExists(): boolean {
      if (this.item && this.item.scoreCalibrations) {
        return this.item.scoreCalibrations.some((calibration) => !!calibration.primary)
      }
      return false
    }
  },
  watch: {
    item(newValue) {
      this.head.patch({title: newValue ? `Calibrations for ${getScoreSetShortName(newValue)}` : undefined})
      this.expandedRows = []
    },
    itemId: {
      handler: async function (newValue, oldValue) {
        if (newValue !== oldValue) {
          this.setItemId(newValue)
          await this.ensureItemLoaded()
          await this.checkScoreSetAuthorization()
          for (const calibration of this.item?.scoreCalibrations || []) {
            await this.checkCalibrationAuthorization(calibration.urn)
          }
        }
      },
      immediate: true
    }
  },
  methods: {
    checkScoreSetAuthorization: async function () {
      try {
        this.userIsAuthorizedToAddCalibration = await checkPermission('score-set', this.itemId, 'add_calibration')
      } catch (err) {
        console.log(`Error to get authorization:`, err)
      }
    },

    checkCalibrationAuthorization: async function (calibrationUrn: string) {
      const result = await checkPermissions('score-calibration', calibrationUrn, CALIBRATION_ACTIONS)
      this.calibrationAuthorizations = {
        ...this.calibrationAuthorizations,
        [calibrationUrn]: result
      }
    },

    async saveChildCalibration() {
      const editor = this.$refs.calibrationEditorRef as InstanceType<typeof CalibrationEditor> | undefined
      if (!editor) return

      const result = await editor.saveCalibration()
      if (!result || result.success) return

      // Save succeeded — handled via @saved event / onCalibrationSaved.
      // Only error cases reach here.
      if (result.error === 'email_required') {
        this.$toast.add({
          severity: 'error',
          summary: 'Email Required',
          detail:
            'You must add an email address to your account to create or edit calibrations. Please update your email in Settings.',
          life: 6000
        })
      } else if (result.error === 'validation') {
        const count = Object.keys(result.validationErrors).length
        this.$toast.add({
          severity: 'error',
          summary: `Please fix ${count} validation ${count === 1 ? 'error' : 'errors'} before saving.`,
          life: 5000
        })
      } else if (result.error === 'generic') {
        this.$toast.add({
          severity: 'error',
          summary: `Encountered an error saving calibration: ${result.message}`,
          life: 4000
        })
      } else if (result.error === 'unknown') {
        console.error('Error saving calibration:', result.raw)
        this.$toast.add({
          severity: 'error',
          summary: 'Calibration Not Saved',
          detail: `An error occurred while saving the calibration. Please try again later.`,
          life: 4000
        })
      }
    },

    async onCalibrationSaved() {
      this.$toast.add({
        severity: 'success',
        summary: 'Calibration Saved',
        detail: 'Calibration saved successfully.',
        life: 4000
      })
      this.closeCalibrationEditor()
      await this.reloadItem()
    },

    publishCalibration: async function (calibrationUrn: string) {
      this.confirm.require({
        message:
          'Are you sure you want to publish this score calibration? Once published, you will be unable to edit its functional ranges or other details.',
        header: 'Confirm Score Set Publication',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Publish', severity: 'success', icon: 'pi pi-check'},
        rejectProps: {label: 'Cancel', severity: 'secondary', icon: 'pi pi-times'},
        accept: async () => {
          try {
            await publishScoreCalibration(calibrationUrn)
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
              detail: `An error occurred while publishing the calibration: ${extractErrorDetail(error)}. Please try again later.`,
              life: 4000
            })
          }
        },
        reject: () => {}
      })
    },

    demoteCalibration: async function (calibrationUrn: string) {
      try {
        await demoteScoreCalibration(calibrationUrn)
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
          detail: `An error occurred while demoting the calibration: ${extractErrorDetail(error)}. Please try again later.`,
          life: 4000
        })
      }
    },

    promoteCalibration: async function (calibrationUrn: string) {
      try {
        await promoteScoreCalibration(calibrationUrn)
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
          detail: `An error occurred while promoting the calibration: ${extractErrorDetail(error)}. Please try again later.`,
          life: 4000
        })
      }
    },

    deleteCalibration: async function (calibrationUrn: string) {
      this.confirm.require({
        message: 'Are you sure you want to delete this score calibration? This action cannot be undone.',
        header: 'Confirm Calibration Deletion',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Delete', severity: 'danger', icon: 'pi pi-trash'},
        rejectProps: {label: 'Cancel', severity: 'secondary', icon: 'pi pi-times'},
        accept: async () => {
          try {
            await deleteScoreCalibration(calibrationUrn)
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
              detail: `An error occurred while deleting the calibration: ${extractErrorDetail(error)}. Please try again later.`,
              life: 4000
            })
          }
        },
        reject: () => {}
      })
    },

    downloadCalibrations: async function () {
      try {
        const data = await getScoreSetCalibrations(this.itemId)
        const dataStr = JSON.stringify(data, null, 2)
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
          detail: `An error occurred while downloading the calibrations: ${extractErrorDetail(error)}. Please try again later.`,
          life: 4000
        })
      }
    }
  }
}
</script>

<style scoped>
/* Card wrapper with gradient top accent */
.cal-card {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: white;
}

.cal-card::before {
  content: '';
  position: absolute;
  inset: 0;
  bottom: auto;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--color-sage),
    var(--color-mint),
    var(--color-yellow-accent),
    var(--color-orange-cta)
  );
  z-index: 1;
}

/* DataTable overrides */
.cal-datatable {
  width: 100%;
}

.cal-datatable :deep(.p-datatable-thead > tr > th) {
  white-space: nowrap;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #555;
  background: #fafafa;
}

.cal-datatable :deep(.p-datatable-tbody > tr > td) {
  vertical-align: top;
  font-size: 13px;
}

/* Tags */
.cal-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

.cal-tag-green {
  background: var(--color-published-light);
  color: var(--color-published);
}

.cal-tag-red {
  background: var(--color-danger-hover);
  color: var(--color-danger);
}

.cal-tag-blue {
  background: #e3f2fd;
  color: #1565c0;
}

.cal-tag-purple {
  background: #ede7f6;
  color: #5e35b1;
}

/* Notes truncation */
.notes-truncated {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  line-height: 1.2;
  max-height: 2.4em;
}

.notes-expanded {
  white-space: normal;
  line-height: 1.2;
}
</style>
