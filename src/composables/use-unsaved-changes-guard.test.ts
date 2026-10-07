import {effectScope} from 'vue'
import {beforeEach, describe, expect, test, vi} from 'vitest'

import {useUnsavedChangesGuard} from '@/composables/use-unsaved-changes-guard'

type ConfirmOptions = {accept?: () => void; reject?: () => void; onHide?: () => void}

let routeLeaveGuard: (() => Promise<boolean>) | null = null
let pendingConfirm: ConfirmOptions | null = null
const require = vi.fn((options: ConfirmOptions) => {
  pendingConfirm = options
})

vi.mock('vue-router', () => ({
  onBeforeRouteLeave: (guard: () => Promise<boolean>) => {
    routeLeaveGuard = guard
  }
}))
vi.mock('primevue/useconfirm', () => ({useConfirm: () => ({require})}))

function setup() {
  const scope = effectScope()
  const guard = scope.run(() => useUnsavedChangesGuard())!
  return {guard, scope}
}

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    routeLeaveGuard = null
    pendingConfirm = null
    require.mockClear()
  })

  test('a clean form leaves without asking', async () => {
    const {guard} = setup()
    expect(guard.isDirty.value).toBe(false)
    await expect(routeLeaveGuard!()).resolves.toBe(true)
    expect(require).not.toHaveBeenCalled()
  })

  test('a dirty form blocks navigation when the user keeps editing', async () => {
    const {guard} = setup()
    guard.markDirty()
    const leaving = routeLeaveGuard!()
    expect(require).toHaveBeenCalledOnce()
    pendingConfirm!.reject!()
    await expect(leaving).resolves.toBe(false)
    expect(guard.isDirty.value).toBe(true)
  })

  test('discarding allows navigation and clears the dirty flag', async () => {
    const {guard} = setup()
    guard.markDirty()
    const leaving = routeLeaveGuard!()
    pendingConfirm!.accept!()
    await expect(leaving).resolves.toBe(true)
    expect(guard.isDirty.value).toBe(false)
  })

  test('dismissing the dialog keeps the user on the form', async () => {
    const {guard} = setup()
    guard.markDirty()
    const decision = guard.confirmDiscard()
    pendingConfirm!.onHide!()
    // PrimeVue fires onHide after accept/reject too; a later callback must not flip the decision.
    pendingConfirm!.accept!()
    await expect(decision).resolves.toBe(false)
  })

  test('markClean after a save lets the save redirect through', async () => {
    const {guard} = setup()
    guard.markDirty()
    guard.markClean()
    await expect(routeLeaveGuard!()).resolves.toBe(true)
    expect(require).not.toHaveBeenCalled()
  })
})
