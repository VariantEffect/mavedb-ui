import axios from 'axios'
import config from '@/config'

/**
 * Check whether the current user is permitted to perform an action on a resource.
 * Maps to: GET /permissions/user-is-permitted/{modelName}/{urn}/{action}
 */
export async function checkPermission(modelName: string, urn: string, action: string): Promise<boolean> {
  const response = await axios.get(
    `${config.apiBaseUrl}/permissions/user-is-permitted/${modelName}/${urn}/${action}`
  )
  return response.data
}

/**
 * Check multiple permissions for a single resource in one call.
 * Returns a record mapping each action to its authorization result.
 */
export async function checkPermissions<T extends string>(
  modelName: string,
  urn: string,
  actions: readonly T[]
): Promise<Record<T, boolean>> {
  const results = {} as Record<T, boolean>
  for (const action of actions) {
    try {
      results[action] = await checkPermission(modelName, urn, action)
    } catch {
      results[action] = false
    }
  }
  return results
}
