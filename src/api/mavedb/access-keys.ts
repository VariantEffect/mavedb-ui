import axios from 'axios'

import config from '@/config'
import type {components} from '@/schema/openapi'

type AccessKey = components['schemas']['AccessKey']
type NewAccessKey = components['schemas']['NewAccessKey']
type UserRole = components['schemas']['UserRole']

export async function getMyAccessKeys(): Promise<AccessKey[]> {
  const response = await axios.get(`${config.apiBaseUrl}/users/me/access-keys`)
  return response.data
}

export async function createAccessKey(): Promise<NewAccessKey> {
  const response = await axios.post(`${config.apiBaseUrl}/users/me/access-keys`, {})
  return response.data
}

export async function createRoleAccessKey(role: UserRole): Promise<NewAccessKey> {
  const response = await axios.post(`${config.apiBaseUrl}/users/me/access-keys/${encodeURIComponent(role)}`, {})
  return response.data
}

export async function deleteAccessKey(keyId: string): Promise<void> {
  await axios.delete(`${config.apiBaseUrl}/users/me/access-keys/${encodeURIComponent(keyId)}`)
}
