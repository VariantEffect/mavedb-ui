import {isAxiosError} from 'axios'

export interface ErrorResponse {
  status: number
  data?: Record<string, unknown>
}

/** Extract a normalized response from a caught Axios error. */
export function getErrorResponse(e: unknown): ErrorResponse {
  if (isAxiosError(e) && e.response) {
    return {status: e.response.status, data: e.response.data as Record<string, unknown>}
  }
  return {status: 500}
}

export * from './access-keys'
export * from './calibrations'
export * from './collections'
export * from './experiments'
export * from './orcid'
export * from './permissions'
export * from './score-sets'
export * from './users'
export * from './variants'
