import type {components} from '@/schema/openapi'

type AccessKey = components['schemas']['AccessKey']
type NewAccessKey = components['schemas']['NewAccessKey']

export interface AccessKeyRowState {
  accessKey: AccessKey | null
  /** The full key, set only for a key generated on this page; the API returns it once. */
  newKey: string | null
}

/**
 * Pair a role's listed key with a key just generated for that role.
 *
 * The generated key stands in until the key list reloads, so it is shown even if the reload is slow or fails. Its
 * full value is shown only against the key it belongs to, never against a different key listed for the same role.
 */
export function accessKeyRowState(listed: AccessKey | undefined, created: NewAccessKey | undefined): AccessKeyRowState {
  const accessKey = listed ?? created ?? null
  const newKey = created && accessKey?.id === created.id ? created.keyId : null
  return {accessKey, newKey}
}

/** Mask a key down to its last four characters. */
export function maskAccessKey(keyHint: string | null | undefined): string {
  return `${'•'.repeat(8)}${keyHint ?? ''}`
}
