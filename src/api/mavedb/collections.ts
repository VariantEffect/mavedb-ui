import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type Collection = components['schemas']['Collection']

export async function getCollection(urn: string): Promise<Collection> {
  const response = await axios.get(`${config.apiBaseUrl}/collections/${urn}`)
  return response.data
}
