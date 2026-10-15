import {onScopeDispose, readonly, ref} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {useConfirm} from 'primevue/useconfirm'

/**
 * Guards a form against losing unsaved input on route changes, reloads, tab closes, and explicit resets.
 *
 * Dirtiness is interaction-based rather than a diff of form state: the form root marks the guard dirty on any
 * bubbling `input`/`change` event, which covers fields owned by child components (e.g. TargetEditor) without
 * enumerating them. Selections made only through overlay pickers (appended to `body`) don't bubble to the form
 * root, so callers mark those dirty explicitly where it matters (e.g. file drops).
 *
 * Callers must `markClean()` after a successful save and before navigating away, and after repopulating the form
 * from a loaded item.
 *
 * Used by: ExperimentCreator.vue, ExperimentEditor.vue, ScoreSetCreator.vue, ScoreSetEditor.vue
 *
 * @example
 * ```ts
 * const unsavedChanges = useUnsavedChangesGuard()
 * // template: <div @change="unsavedChanges.markDirty" @input="unsavedChanges.markDirty">…</div>
 * // reset:    if (await unsavedChanges.confirmDiscard()) resetForm()
 * ```
 */
export function useUnsavedChangesGuard() {
  const dirty = ref(false)
  const confirm = useConfirm()

  function markDirty() {
    dirty.value = true
  }

  function markClean() {
    dirty.value = false
  }

  /** Resolves true when there is nothing to lose or the user chooses to discard; false to keep editing. */
  function confirmDiscard(): Promise<boolean> {
    if (!dirty.value) return Promise.resolve(true)
    return new Promise((resolve) => {
      let settled = false
      const settle = (discard: boolean) => {
        if (settled) return
        settled = true
        resolve(discard)
      }
      confirm.require({
        header: 'Discard unsaved changes?',
        message: 'You have changes that have not been saved. If you leave now, they will be lost.',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Discard changes',
        rejectLabel: 'Keep editing',
        acceptProps: {severity: 'danger'},
        rejectProps: {severity: 'secondary', outlined: true},
        accept: () => settle(true),
        reject: () => settle(false),
        onHide: () => settle(false)
      })
    })
  }

  onBeforeRouteLeave(async () => {
    const discard = await confirmDiscard()
    if (discard) markClean()
    return discard
  })

  // Reloads and tab closes can only use the browser's native prompt.
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value) return
    event.preventDefault()
    event.returnValue = ''
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', onBeforeUnload)
    onScopeDispose(() => window.removeEventListener('beforeunload', onBeforeUnload))
  }

  return {isDirty: readonly(dirty), markDirty, markClean, confirmDiscard}
}

export type UnsavedChangesGuard = ReturnType<typeof useUnsavedChangesGuard>
