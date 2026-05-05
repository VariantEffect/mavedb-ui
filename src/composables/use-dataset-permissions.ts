import {ref, watch, type Ref} from 'vue'

import useAuth from '@/composition/auth'
import {checkPermissions} from '@/api/mavedb/permissions'

/**
 * Reactive permission checking for a single resource. Calls the permissions API on mount
 * and whenever the URN changes. Returns `false` for all actions while loading, on error,
 * or when the user is not authenticated.
 */
export function useDatasetPermissions<T extends string>(
  modelName: string,
  urn: Ref<string>,
  actions: readonly T[]
) {
  const {userIsAuthenticated} = useAuth()

  const defaultPermissions = () =>
    Object.fromEntries(actions.map((a) => [a, false])) as Record<T, boolean>

  const permissions = ref<Record<T, boolean>>(defaultPermissions()) as Ref<Record<T, boolean>>
  const loading = ref(false)

  async function fetch() {
    if (!userIsAuthenticated.value || !urn.value) {
      permissions.value = defaultPermissions()
      return
    }

    loading.value = true
    try {
      permissions.value = await checkPermissions(modelName, urn.value, actions)
    } catch {
      permissions.value = defaultPermissions()
    } finally {
      loading.value = false
    }
  }

  watch(urn, fetch, {immediate: true})
  watch(userIsAuthenticated, fetch)

  return {permissions, loading}
}
