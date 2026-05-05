import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type Contributor = components['schemas']['Contributor']

/** Look up an ORCID user by their ORCID ID via the MaveDB API. */
export async function lookupOrcidUser(orcidId: string): Promise<Contributor | null> {
  try {
    return (await axios.get(`${config.apiBaseUrl}/orcid/users/${orcidId}`)).data
  } catch {
    return null
  }
}
