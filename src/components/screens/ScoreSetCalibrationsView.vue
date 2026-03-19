<template>
  <MvEmailPrompt
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
          <!-- Desktop: individual buttons -->
          <div class="hidden tablet:contents">
            <PButton
              v-if="scoreSetPermissions.add_calibration"
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
          </div>
          <!-- Mobile: collapsed menu -->
          <MvRowActionMenu class="tablet:hidden" :actions="headerActions" />
        </template>
      </MvPageHeader>
    </template>

    <div v-if="itemStatus === 'Loaded' && item" class="max-w-screen-xl px-4 py-7 tablet:px-6">
      <MvEmptyState
        v-if="!item.scoreCalibrations?.length"
        :action-label="scoreSetPermissions.add_calibration ? '+ Create a calibration' : undefined"
        description="Score calibrations define functional classification ranges for clinical variant interpretation. Add one to help users interpret scores from this dataset."
        title="No calibrations yet"
        @action="openCalibrationEditor(item.urn)"
      />
      <template v-else>
        <!-- ── MOBILE: Card layout ────────────────────────── -->
        <div class="flex flex-col gap-4 tablet:hidden">
          <div v-for="cal in sortedCalibrations" :key="cal.id" class="relative overflow-hidden rounded-lg border border-border bg-white mave-gradient-bar">
            <div class="px-4 py-4">
              <div class="mb-2 flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <span class="text-sm font-semibold text-text-primary">{{ cal.title || '—' }}</span>
                </div>
                <MvRowActionMenu :actions="calibrationActions(cal)" />
              </div>

              <div class="mb-3 flex flex-wrap items-center gap-1.5">
                <MvBadge :value="cal.private ? 'unpublished' : 'published'" />
                <MvBadge v-if="cal.primary" value="primary" />
                <MvBadge :value="cal.investigatorProvided ? 'investigator' : 'community'" />
                <MvBadge :value="cal.researchUseOnly ? 'research' : 'general'" />
              </div>

              <p v-if="cal.notes" class="mb-3 text-xs leading-relaxed text-text-secondary">{{ cal.notes }}</p>

              <div class="text-xs text-text-muted">
                <strong>{{ cal.functionalClassifications?.length ?? 0 }}</strong>
                classification {{ (cal.functionalClassifications?.length ?? 0) === 1 ? 'range' : 'ranges' }}
              </div>

              <!-- Expandable classification ranges -->
              <div v-if="cal.functionalClassifications && cal.functionalClassifications.length" class="mt-3">
                <button
                  class="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-gray-50 active:bg-gray-100"
                  @click="expandedRanges[cal.id] = !expandedRanges[cal.id]"
                >
                  <i class="pi pi-list text-[11px]" />
                  {{ expandedRanges[cal.id] ? 'Hide classification ranges' : 'Show classification ranges' }}
                </button>
                <div v-if="expandedRanges[cal.id]" class="mt-2">
                  <CalibrationTable :score-calibration="cal" :score-calibration-name="cal.title || ''" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── DESKTOP: DataTable layout ─────────────────── -->
        <div class="cal-card mave-gradient-bar hidden tablet:block">
          <DataTable
            v-model:expanded-rows="expandedRows"
            class="cal-datatable"
            data-key="id"
            :paginator="(item.scoreCalibrations?.length ?? 0) > 15"
            :rows="15"
            :striped-rows="true"
            :value="sortedCalibrations"
          >
            <Column :expander="true" header-style="width:3rem" />

            <Column field="title" header="Title" :sortable="true">
              <template #body="{data}">
                <div>
                  <span class="font-semibold text-text-primary">{{ data.title || '—' }}</span>
                  <p
                    v-if="data.notes"
                    class="mt-0.5 text-xs leading-snug text-text-muted line-clamp-2"
                    :title="data.notes"
                  >
                    {{ data.notes }}
                  </p>
                </div>
              </template>
            </Column>
            <Column
              body-class="text-center"
              field="private"
              header="Status"
              header-style="width:5.5rem"
              :sortable="true"
            >
              <template #body="{data}">
                <MvBadge :value="data.private ? 'unpublished' : 'published'" />
              </template>
            </Column>
            <Column body-class="text-center" field="primary" header="Rank" header-style="width:4.5rem" :sortable="true">
              <template #body="{data}">
                <MvBadge v-if="data.primary" value="primary" />
                <span v-else class="text-xs text-text-muted">&mdash;</span>
              </template>
            </Column>
            <Column
              body-class="text-center"
              field="investigatorProvided"
              header="Type"
              header-style="width:7rem"
              :sortable="true"
            >
              <template #body="{data}">
                <MvBadge :value="data.investigatorProvided ? 'investigator' : 'community'" />
              </template>
            </Column>
            <Column
              body-class="text-center"
              field="researchUseOnly"
              header="Use"
              header-style="width:5rem"
              :sortable="true"
            >
              <template #body="{data}">
                <MvBadge :value="data.researchUseOnly ? 'research' : 'general'" />
              </template>
            </Column>
            <Column
              body-class="text-center"
              header="Ranges"
              header-style="width:3rem"
              :sortable="true"
            >
              <template #body="{data}">{{ data.functionalClassifications?.length ?? 0 }}</template>
            </Column>
            <Column header-style="width:3rem">
              <template #body="{data}">
                <MvRowActionMenu :actions="calibrationActions(data)" />
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
      </template>
    </div>
    <div v-else-if="['NotLoaded', 'Loading'].includes(itemStatus)" class="p-8">
      <MvPageLoading />
    </div>
    <div v-else>
      <MvItemNotFound :item-id="itemId" model="Score Set" />
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
  checkPermissions,
  publishScoreCalibration,
  demoteScoreCalibration,
  promoteScoreCalibration,
  deleteScoreCalibration,
  getScoreSetCalibrations
} from '@/api/mavedb'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'
import axios from 'axios'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import useItem from '@/composition/item.ts'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import {useCalibrationDialog} from '@/composables/use-calibration-dialog'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import CalibrationTable from '@/components/calibration/CalibrationTable.vue'
import {getScoreSetShortName} from '@/lib/score-sets'
import {useConfirm} from 'primevue/useconfirm'
import CalibrationEditor from '@/components/calibration/CalibrationEditor.vue'
import MvEmailPrompt from '@/components/common/MvEmailPrompt.vue'
import {ref, toRef} from 'vue'
import PrimeDialog from 'primevue/dialog'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvBadge from '@/components/common/MvBadge.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
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
    MvEmailPrompt,
    MvBadge,
    MvEmptyState,
    MvRowActionMenu,
    PButton: Button,
    MvLayout,
    MvPageHeader,
    DataTable,
    MvItemNotFound,
    Column,
    MvPageLoading,
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
    const urnRef = toRef(props, 'itemId')
    const {permissions: scoreSetPermissions} = useDatasetPermissions('score-set', urnRef, ['add_calibration'] as const)

    const calibrationAuthorizations = ref<Record<string, CalibrationAuthorizations>>({})

    return {
      head,
      userIsAuthenticated,
      scoreSetPermissions,
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
      expandedRanges: {} as Record<number, boolean>
    }
  },
  computed: {
    primaryExists(): boolean {
      if (this.item && this.item.scoreCalibrations) {
        return this.item.scoreCalibrations.some((calibration) => !!calibration.primary)
      }
      return false
    },
    headerActions(): RowAction[] {
      const actions: RowAction[] = []
      if (this.scoreSetPermissions.add_calibration) {
        actions.push({label: 'New calibration', handler: () => this.openCalibrationEditor(this.item!.urn)})
      }
      actions.push({label: 'Reload calibrations', handler: () => this.reloadItem()})
      actions.push({label: 'Download calibration JSON', handler: () => this.downloadCalibrations()})
      return actions
    },
    sortedCalibrations(): components['schemas']['ScoreCalibration'][] {
      if (!this.item?.scoreCalibrations) return []
      return [...this.item.scoreCalibrations].sort((a, b) => {
        return this.calibrationSortKey(a) - this.calibrationSortKey(b)
      })
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
          for (const calibration of this.item?.scoreCalibrations || []) {
            await this.checkCalibrationAuthorization(calibration.urn)
          }
        }
      },
      immediate: true
    }
  },
  methods: {
    calibrationSortKey(cal: components['schemas']['ScoreCalibration']): number {
      if (cal.primary) return 0
      if (cal.private) return 4
      if (cal.researchUseOnly) return 3
      if (cal.investigatorProvided) return 1
      return 2 // community
    },

    calibrationActions(data: components['schemas']['ScoreCalibration']): RowAction[] {
      const actions: RowAction[] = [
        {
          label: 'View in score set',
          to: {name: 'scoreSet', params: {urn: this.item!.urn}, query: {calibration: data.urn}}
        }
      ]

      if (!this.userIsAuthenticated) return actions

      const auth = this.calibrationAuthorizations[data.urn]
      if (!auth) return actions

      actions.push({separator: true})

      if (auth.update) {
        actions.push({
          label: 'Edit calibration',
          handler: () => this.editCalibrationInEditor(data.urn)
        })
      }

      if (auth.change_rank && data.primary) {
        actions.push({
          label: 'Demote to non-primary',
          handler: () => this.demoteCalibration(data.urn)
        })
      }

      if (auth.change_rank && !data.primary) {
        actions.push({
          label: 'Promote to primary',
          disabled: data.researchUseOnly || this.primaryExists,
          handler: () => this.promoteCalibration(data.urn)
        })
      }

      if (auth.publish && data.private) {
        actions.push({
          label: 'Publish calibration',
          handler: () => this.publishCalibration(data.urn)
        })
      }

      if (auth.delete) {
        actions.push({separator: true})
        actions.push({
          label: 'Delete calibration',
          danger: true,
          handler: () => this.deleteCalibration(data.urn)
        })
      }

      return actions
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
/* DataTable overrides — :deep() selectors cannot be expressed in Tailwind */
.cal-datatable {
  width: 100%;
  margin-top: 3px;
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

.cal-datatable :deep(.p-datatable-thead > tr > th),
.cal-datatable :deep(.p-datatable-tbody > tr > td) {
  padding-left: 8px;
  padding-right: 8px;
}

.cal-datatable :deep(.p-datatable-tbody > tr > td) {
  vertical-align: top;
  font-size: 13px;
}
</style>
