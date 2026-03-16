import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type Collection = components['schemas']['Collection']

export async function getCollection(urn: string): Promise<Collection> {
  const response = await axios.get(`${config.apiBaseUrl}/collections/${urn}`)
  return response.data
}

export async function getMyCollections() {
  const response = await axios.get(`${config.apiBaseUrl}/users/me/collections`)
  return response.data
}

export async function deleteCollection(urn: string) {
  const response = await axios.delete(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}`)
  return response.data
}
