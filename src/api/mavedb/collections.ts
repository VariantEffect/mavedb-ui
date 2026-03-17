import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'

type Collection = components['schemas']['Collection']
type CollectionCreate = components['schemas']['CollectionCreate']

export async function getCollection(urn: string): Promise<Collection> {
  const response = await axios.get(`${config.apiBaseUrl}/collections/${urn}`)
  return response.data
}

export async function getMyCollections() {
  const response = await axios.get(`${config.apiBaseUrl}/users/me/collections`)
  return response.data
}

export async function updateCollection(urn: string, patch: Record<string, unknown>): Promise<Collection> {
  const response = await axios.patch(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}`, patch)
  return response.data
}

export async function deleteCollection(urn: string) {
  const response = await axios.delete(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}`)
  return response.data
}

export async function removeCollectionEntity(collectionUrn: string, entityType: string, entityUrn: string) {
  const response = await axios.delete(
    `${config.apiBaseUrl}/collections/${encodeURIComponent(collectionUrn)}/${entityType}/${encodeURIComponent(entityUrn)}`
  )
  return response.data
}

export async function createCollection(payload: CollectionCreate): Promise<Collection> {
  const response = await axios.post(`${config.apiBaseUrl}/collections`, payload)
  return response.data
}

export async function addCollectionRole(urn: string, role: string, orcidId: string): Promise<void> {
  await axios.post(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}/${role}s`, {orcid_id: orcidId})
}

export async function removeCollectionRole(urn: string, role: string, orcidId: string): Promise<void> {
  await axios.delete(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}/${role}s/${orcidId}`)
}

export async function addCollectionScoreSet(urn: string, scoreSetUrn: string): Promise<void> {
  await axios.post(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}/score-sets`, {score_set_urn: scoreSetUrn})
}

export async function addCollectionExperiment(urn: string, experimentUrn: string): Promise<void> {
  await axios.post(`${config.apiBaseUrl}/collections/${encodeURIComponent(urn)}/experiments`, {experiment_urn: experimentUrn})
}
