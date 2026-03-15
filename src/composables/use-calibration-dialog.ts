import {ref, computed, type Ref, type ComputedRef} from 'vue'

/**
 * Composable for managing calibration editor dialog visibility.
 *
 * Provides open/close/header state for parent components that host a
 * CalibrationEditor inside a PrimeVue Dialog. All draft and save logic lives
 * in the CalibrationEditor itself (via `useCalibrationEditor`).
 *
 * Used by: ScoreSetCalibrationsView.vue, ScoreSetView.vue
 *
 * @example
 * ```ts
 * const dialog = useCalibrationDialog()
 * dialog.openCalibrationEditor(scoreSetUrn)   // create mode
 * dialog.editCalibrationInEditor(calibUrn)     // edit mode
 * // Template: <Dialog v-model:visible="dialog.editorVisible" :header="dialog.editorDialogHeader">
 * ```
 */
/**
 * Return type for {@link useCalibrationDialog}.
 *
 * Manages visibility, mode (create vs. edit), and header text for a
 * CalibrationEditor hosted inside a PrimeVue Dialog.
 */
export interface UseCalibrationDialogReturn {
  /** Whether the editor dialog is currently visible. */
  editorVisible: Ref<boolean>
  /** URN of the calibration being edited, or undefined in create mode. */
  editingCalibrationUrn: Ref<string | undefined>
  /** URN of the score set to create a calibration for, or undefined in edit mode. */
  editingScoreSetUrn: Ref<string | undefined>
  /** Computed dialog header text ("Create New Calibration" or "Edit Calibration"). */
  editorDialogHeader: ComputedRef<string>
  /** Open the dialog in create mode for the given score set. */
  openCalibrationEditor: (scoreSetUrn: string) => void
  /** Open the dialog in edit mode for the given calibration. */
  editCalibrationInEditor: (calibrationUrn: string) => void
  /** Close the dialog and reset URN state. */
  closeCalibrationEditor: () => void
}

export function useCalibrationDialog(): UseCalibrationDialogReturn {
  const editorVisible = ref(false)
  const editingCalibrationUrn = ref<string | undefined>(undefined)
  const editingScoreSetUrn = ref<string | undefined>(undefined)

  const editorDialogHeader = computed(() =>
    editingCalibrationUrn.value ? 'Edit Calibration' : 'Create New Calibration'
  )

  function openCalibrationEditor(scoreSetUrn: string) {
    editingCalibrationUrn.value = undefined
    editingScoreSetUrn.value = scoreSetUrn
    editorVisible.value = true
  }

  function editCalibrationInEditor(calibrationUrn: string) {
    editingCalibrationUrn.value = calibrationUrn
    editingScoreSetUrn.value = undefined
    editorVisible.value = true
  }

  function closeCalibrationEditor() {
    editorVisible.value = false
    editingCalibrationUrn.value = undefined
    editingScoreSetUrn.value = undefined
  }

  return {
    editorVisible,
    editingCalibrationUrn,
    editingScoreSetUrn,
    editorDialogHeader,
    openCalibrationEditor,
    editCalibrationInEditor,
    closeCalibrationEditor
  }
}
