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
          <MvRowActionMenu :actions="headerActions" class="tablet:hidden" />
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
          <div
            v-for="cal in calibrationRows"
            :key="cal.id"
            class="mave-card relative overflow-hidden"
            :class="{'ml-5': isThreadedVersion(cal)}"
            :data-calibration-urn="cal.urn"
          >
            <div class="px-4 py-4">
              <div class="mb-2 flex items-start gap-2">
                <div class="min-w-0 flex-1">
                  <span class="text-sm font-semibold text-text-primary">{{ cal.title || '—' }}</span>
                  <span v-if="versionNumbers[cal.urn]" class="ml-1.5 text-xs text-text-muted"
                    >v{{ versionNumbers[cal.urn] }}</span
                  >
                </div>
                <MvRowActionMenu :actions="calibrationActions(cal)" />
              </div>

              <div class="mb-3 flex flex-wrap items-center gap-1.5">
                <MvBadge :value="statusBadge(cal)" />
                <MvBadge v-if="cal.primary" value="primary" />
                <MvBadge :value="cal.investigatorProvided ? 'investigator' : 'community'" />
                <MvBadge :value="cal.researchUseOnly ? 'research' : 'general'" />
              </div>

              <p v-if="cal.notes" class="mb-3 text-xs leading-relaxed text-text-secondary">{{ cal.notes }}</p>

              <div class="text-xs text-text-muted">
                <strong>{{ cal.functionalClassifications?.length ?? 0 }}</strong>
                classification {{ (cal.functionalClassifications?.length ?? 0) === 1 ? 'range' : 'ranges' }}
              </div>

              <!-- Expandable calibration details (ranges, disease context, controls) -->
              <div
                v-if="cal.functionalClassifications?.length || diseaseLabel(cal) || cal.controls?.length"
                class="mt-3"
              >
                <button
                  class="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-gray-50 active:bg-gray-100"
                  @click="expandedRanges[cal.id] = !expandedRanges[cal.id]"
                >
                  <i class="pi pi-list text-[11px]" />
                  {{ expandedRanges[cal.id] ? 'Hide calibration details' : 'Show calibration details' }}
                </button>
                <div v-if="expandedRanges[cal.id]" class="mt-2">
                  <CalibrationTable
                    :related-calibrations="item.scoreCalibrations"
                    :score-calibration="cal"
                    :score-calibration-name="cal.title || ''"
                    :score-set-urn="item.urn"
                    show-versions-in-place
                    @show-version="showCalibration"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── DESKTOP: DataTable layout ─────────────────── -->
        <div class="cal-card hidden tablet:block">
          <DataTable
            v-model:expanded-rows="expandedRows"
            v-model:sort-field="sortField"
            v-model:sort-order="sortOrder"
            class="cal-datatable"
            data-key="id"
            lazy
            removable-sort
            :striped-rows="true"
            :value="calibrationRows"
          >
            <Column :expander="true" header-style="width:3rem" />

            <Column field="title" header="Title" :sortable="true">
              <template #body="{data}">
                <div :class="{'ml-1 border-l-2 border-border pl-3': isThreadedVersion(data)}">
                  <span class="font-semibold text-text-primary">{{ data.title || '—' }}</span>
                  <span v-if="versionNumbers[data.urn]" class="ml-1.5 text-xs text-text-muted"
                    >v{{ versionNumbers[data.urn] }}</span
                  >
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
              sort-field="status"
              :sortable="true"
            >
              <template #body="{data}">
                <MvBadge :value="statusBadge(data)" />
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
              sort-field="ranges"
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
              <div class="bg-[#f8faf9] px-6 py-5" :data-calibration-urn="data.urn">
                <CalibrationTable
                  :related-calibrations="item.scoreCalibrations"
                  :score-calibration="data"
                  :score-calibration-name="data.title || ''"
                  :score-set-urn="item.urn"
                  show-versions-in-place
                  @show-version="showCalibration"
                />
              </div>
            </template>
          </DataTable>
        </div>

        <!-- Pages hold whole threads, so a calibration's versions are never split across pages. -->
        <Paginator
          v-if="calibrationThreads.length > threadsPerPage"
          v-model:first="threadFirst"
          class="mt-3"
          :rows="threadsPerPage"
          :total-records="calibrationThreads.length"
        />
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
      :superseded-calibration-urn="supersededCalibrationUrn"
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
  deleteScoreCalibrationControls,
  getScoreSetCalibrations
} from '@/api/mavedb'
import {useCanonicalUrn} from '@/composables/use-canonical-urn'
import {useDatasetPermissions} from '@/composables/use-dataset-permissions'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Paginator from 'primevue/paginator'
import useItem from '@/composition/item.ts'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import {useCalibrationDialog} from '@/composables/use-calibration-dialog'
import MvPageLoading from '@/components/common/MvPageLoading.vue'
import CalibrationTable from '@/components/calibration/CalibrationTable.vue'
import {describeRequestError} from '@/lib/errors'
import {getScoreSetShortName} from '@/lib/score-sets'
import {useConfirm} from 'primevue/useconfirm'
import CalibrationEditor from '@/components/calibration/CalibrationEditor.vue'
import {
  calibrationVersionStatus,
  groupCalibrationVersions,
  orderCalibrationThreads,
  type CalibrationThread
} from '@/lib/calibrations'
import {diseaseDisplayLabel} from '@/lib/diseases'
import MvEmailPrompt from '@/components/common/MvEmailPrompt.vue'
import {ref, toRef} from 'vue'
import PrimeDialog from 'primevue/dialog'
import MvItemNotFound from '@/components/common/MvItemNotFound.vue'
import MvBadge from '@/components/common/MvBadge.vue'
import MvRowActionMenu, {type RowAction} from '@/components/common/MvRowActionMenu.vue'
import {components} from '@/schema/openapi'

type ScoreSet = components['schemas']['ScoreSet']
type ScoreCalibration = components['schemas']['ScoreCalibration']

const CALIBRATION_ACTIONS = ['update', 'delete', 'publish', 'change_rank', 'supersede'] as const
type CalibrationAuthorizations = Record<(typeof CALIBRATION_ACTIONS)[number], boolean>

/** What each sortable column sorts by, keyed by the column's sort field. */
const SORT_VALUES: Record<string, (calibration: ScoreCalibration) => string | number | boolean | null | undefined> = {
  title: (c) => c.title,
  status: calibrationVersionStatus,
  primary: (c) => !!c.primary,
  investigatorProvided: (c) => !!c.investigatorProvided,
  researchUseOnly: (c) => !!c.researchUseOnly,
  ranges: (c) => c.functionalClassifications?.length ?? 0
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
    Paginator,
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

    const scoreSet = useItem<ScoreSet>({itemTypeName: 'scoreSet'})
    useCanonicalUrn(scoreSet.item, urnRef)

    return {
      head,
      userIsAuthenticated,
      scoreSetPermissions,
      calibrationAuthorizations,
      confirm,
      getScoreSetShortName,
      ...useCalibrationDialog(),
      ...scoreSet,
      ...useScopedId()
    }
  },
  data() {
    return {
      // Keyed by calibration id, the form DataTable uses when it has a dataKey.
      expandedRows: {} as Record<number, boolean>,
      expandedRanges: {} as Record<number, boolean>,
      // The table is lazy, so it reports the sort and the page applies it, keeping each version thread together.
      sortField: undefined as string | undefined,
      sortOrder: undefined as number | undefined,
      // Index of the first thread on the page; pages count threads, not rows.
      threadFirst: 0,
      threadsPerPage: 15
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
    calibrationThreads(): CalibrationThread[] {
      const sortValue = this.sortField ? SORT_VALUES[this.sortField] : null
      return orderCalibrationThreads(
        groupCalibrationVersions(this.item?.scoreCalibrations),
        sortValue,
        this.sortOrder ?? 1
      )
    },
    pageThreads(): CalibrationThread[] {
      return this.calibrationThreads.slice(this.threadFirst, this.threadFirst + this.threadsPerPage)
    },
    /** Each thread on the page: its head, then its other versions in chain order. */
    calibrationRows(): ScoreCalibration[] {
      return this.pageThreads.flatMap((thread) => [
        thread.head,
        ...thread.versions.filter((version) => version !== thread.head)
      ])
    },
    /** Version numbers by URN, for calibrations with more than one version. */
    versionNumbers(): Record<string, number> {
      const numbers: Record<string, number> = {}
      for (const thread of this.calibrationThreads) {
        if (thread.versions.length > 1) thread.versions.forEach((version, i) => (numbers[version.urn] = i + 1))
      }
      return numbers
    }
  },
  watch: {
    item(newValue) {
      this.head.patch({title: newValue ? `Calibrations for ${getScoreSetShortName(newValue)}` : undefined})
      this.expandedRows = {}
    },
    // A new order starts from the first page, as the table's own sorting does.
    sortField() {
      this.threadFirst = 0
    },
    sortOrder() {
      this.threadFirst = 0
    },
    // A reload can remove threads; stay on the last page rather than one past it.
    'calibrationThreads.length'(count: number) {
      const lastPageFirst = Math.max(0, Math.ceil(count / this.threadsPerPage) - 1) * this.threadsPerPage
      if (this.threadFirst > lastPageFirst) this.threadFirst = lastPageFirst
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
    /** The calibration's disease label, generic "disease or disorder" default included; null only when no concept is present. */
    diseaseLabel(cal: ScoreCalibration): string | null {
      return diseaseDisplayLabel(cal.disease)
    },

    /** Expand the calibration `urn` in whichever layout is showing, and scroll to it. */
    async showCalibration(urn: string) {
      const calibration = this.item?.scoreCalibrations?.find((c) => c.urn === urn)
      if (!calibration) return
      const threadIndex = this.calibrationThreads.findIndex((thread) => thread.versions.includes(calibration))
      if (threadIndex >= 0) this.threadFirst = Math.floor(threadIndex / this.threadsPerPage) * this.threadsPerPage
      this.expandedRows = {...this.expandedRows, [calibration.id]: true}
      this.expandedRanges[calibration.id] = true
      await this.$nextTick()
      // Both layouts are rendered and one is hidden; scroll to the one in view.
      const target = [...document.querySelectorAll<HTMLElement>('[data-calibration-urn]')].find(
        (el) => el.dataset.calibrationUrn === urn && el.offsetParent !== null
      )
      target?.scrollIntoView({behavior: 'smooth', block: 'start'})
    },

    /** Whether `cal` is listed under the head of its version thread. */
    isThreadedVersion(cal: ScoreCalibration): boolean {
      return !!this.versionNumbers[cal.urn] && !this.calibrationThreads.some((thread) => thread.head === cal)
    },

    statusBadge(cal: ScoreCalibration): 'unpublished' | 'superseded' | 'published' {
      if (cal.private) return 'unpublished'
      return cal.hasPublishedReplacement ? 'superseded' : 'published'
    },

    calibrationActions(data: ScoreCalibration): RowAction[] {
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

      if (auth.supersede && !data.hasPublishedReplacement) {
        actions.push({
          label: 'Create new version',
          // A calibration has at most one replacement, so a draft the user can see blocks another.
          disabled:
            !!data.supersedingCalibrationUrn ||
            this.item?.scoreCalibrations?.some((calibration) => calibration.supersededCalibrationUrn === data.urn),
          handler: () => this.createCalibrationVersion(data.urn)
        })
      }

      // A replaced version is frozen, even for admins; removing its controls is the one change it allows.
      if (auth.update && !data.hasPublishedReplacement) {
        actions.push({
          label: 'Edit calibration',
          handler: () => this.editCalibrationInEditor(data.urn)
        })
      }

      if (auth.update && (data.controlsCount ?? 0) > 0) {
        actions.push({
          label: 'Remove controls',
          danger: true,
          handler: () => this.removeCalibrationControls(data.urn)
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
          disabled: data.researchUseOnly || this.primaryExists || !!data.hasPublishedReplacement,
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
              detail: `An error occurred while publishing the calibration: ${describeRequestError(error)}. Please try again later.`,
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
          detail: `An error occurred while demoting the calibration: ${describeRequestError(error)}. Please try again later.`,
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
          detail: `An error occurred while promoting the calibration: ${describeRequestError(error)}. Please try again later.`,
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
              detail: `An error occurred while deleting the calibration: ${describeRequestError(error)}. Please try again later.`,
              life: 4000
            })
          }
        },
        reject: () => {}
      })
    },

    removeCalibrationControls: async function (calibrationUrn: string) {
      this.confirm.require({
        message:
          "Are you sure you want to remove this calibration's controls? This also withdraws its affirmation that the controls contain no protected health information (PHI). It cannot be undone.",
        header: 'Confirm Removing Controls',
        icon: 'pi pi-exclamation-triangle',
        acceptProps: {label: 'Remove controls', severity: 'danger', icon: 'pi pi-trash'},
        rejectProps: {label: 'Cancel', severity: 'secondary', icon: 'pi pi-times'},
        accept: async () => {
          try {
            await deleteScoreCalibrationControls(calibrationUrn)
            this.$toast.add({
              severity: 'success',
              summary: 'Controls Removed',
              detail: "The calibration's controls were removed.",
              life: 4000
            })
            await this.reloadItem()
          } catch (error) {
            console.error('Error removing calibration controls:', error)
            this.$toast.add({
              severity: 'error',
              summary: 'Controls Not Removed',
              detail: `An error occurred while removing the controls: ${describeRequestError(error)}. Please try again later.`,
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
          detail: `An error occurred while downloading the calibrations: ${describeRequestError(error)}. Please try again later.`,
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
