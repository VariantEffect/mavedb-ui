import axios from 'axios'

import config from '@/config'
import {components} from '@/schema/openapi'
import type {MinimalScoreSet} from '@/lib/calibration-types'

type ScoreCalibration = components['schemas']['ScoreCalibration']
type ScoreSet = components['schemas']['ScoreSet']

/**
 * Fetch a single score calibration by URN.
 */
export async function getScoreCalibration(urn: string): Promise<ScoreCalibration> {
  const response = await axios.get(`${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(urn)}`)
  return response.data
}

/**
 * Fetch all calibrations for a score set.
 */
export async function getScoreSetCalibrations(scoreSetUrn: string) {
  const response = await axios.get(`${config.apiBaseUrl}/score-calibrations/score-set/${encodeURIComponent(scoreSetUrn)}`)
  return response.data
}

/**
 * Create a new score calibration via multipart form data.
 */
export async function createScoreCalibration(formData: FormData) {
  const response = await axios.post(`${config.apiBaseUrl}/score-calibrations`, formData, {
    headers: {'Content-Type': 'multipart/form-data'}
  })
  return response.data
}

/**
 * Update an existing score calibration via multipart form data.
 */
export async function updateScoreCalibration(urn: string, formData: FormData) {
  const response = await axios.put(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(urn)}`,
    formData,
    {headers: {'Content-Type': 'multipart/form-data'}}
  )
  return response.data
}

/**
 * Publish a score calibration.
 */
export async function publishScoreCalibration(urn: string) {
  const response = await axios.post(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(urn)}/publish`
  )
  return response.data
}

/**
 * Promote a score calibration to primary.
 */
export async function promoteScoreCalibration(urn: string) {
  const response = await axios.post(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(urn)}/promote-to-primary`
  )
  return response.data
}

/**
 * Demote a score calibration from primary.
 */
export async function demoteScoreCalibration(urn: string) {
  const response = await axios.post(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(urn)}/demote-from-primary`
  )
  return response.data
}

/**
 * Delete a score calibration.
 */
export async function deleteScoreCalibration(urn: string) {
  const response = await axios.delete(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(urn)}`
  )
  return response.data
}

/**
 * Fetch variants for a single functional classification in a score calibration.
 */
export async function getScoreCalibrationClassificationVariants(
  calibrationUrn: string,
  classificationId: number
): Promise<components['schemas']['FunctionalClassificationVariants']> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(calibrationUrn)}/functional-classifications/${classificationId}/variants`
  )
  return response.data
}

/**
 * Fetch variants for all functional classifications in a score calibration.
 */
export async function getScoreCalibrationVariants(
  calibrationUrn: string
): Promise<components['schemas']['FunctionalClassificationVariants'][]> {
  const response = await axios.get(
    `${config.apiBaseUrl}/score-calibrations/${encodeURIComponent(calibrationUrn)}/variants`
  )
  return response.data
}

/**
 * Search for score sets the current user can edit (for the calibration score set selector).
 */
export async function searchEditableScoreSets(): Promise<MinimalScoreSet[]> {
  const response = await axios.post(`${config.apiBaseUrl}/me/score-sets/search`, {
    metaAnalysis: false,
    includeExperimentScoreSetUrnsAndCount: false
  })
  return response.data.scoreSets || []
}

/**
 * Fetch a single score set by URN (used as fallback when a score set isn't in the editable list).
 */
export async function getScoreSetByUrn(urn: string): Promise<ScoreSet> {
  const response = await axios.get(`${config.apiBaseUrl}/score-sets/${encodeURIComponent(urn)}`)
  return response.data
}
