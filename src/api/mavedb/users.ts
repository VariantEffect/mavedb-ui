import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type User = components['schemas']['User']

export async function lookupUser(orcidId: string): Promise<User | null> {
  try {
    const response = await axios.get(`${config.apiBaseUrl}/users/${orcidId}`)
    return response.data
  } catch {
    // Assume that the error was 404 Not Found.
    return null
  }
}
