import axios from 'axios'
import {nextTick, ref} from 'vue'

import config from '@/config'
import type {components} from '@/schema/openapi'

type ShortScoreSet = components['schemas']['ShortScoreSet']

interface PendingRequest {
  resolve: (scoreSet: ShortScoreSet) => void
  reject: (error?: unknown) => void
}

const pendingUrns = ref<string[]>([])
const flushScheduled = ref(false)
const flushInProgress = ref(false)
const pendingRequests = new Map<string, PendingRequest[]>()
const MAX_QUERY_STRING_LENGTH = 2048
const URNS_QUERY_PREFIX = 'urns='

function scheduleFlush() {
  if (flushScheduled.value) {
    return
  }

  flushScheduled.value = true
  void nextTick(async () => {
    flushScheduled.value = false
    await flushPendingRequests()
  })
}

function resolvePendingRequests(urn: string, scoreSet: ShortScoreSet) {
  const requests = pendingRequests.get(urn) ?? []
  pendingRequests.delete(urn)

  for (const request of requests) {
    request.resolve(scoreSet)
  }
}

function rejectPendingRequests(urn: string, error: unknown) {
  const requests = pendingRequests.get(urn) ?? []
  pendingRequests.delete(urn)

  for (const request of requests) {
    request.reject(error)
  }
}

async function flushPendingRequests() {
  if (flushInProgress.value || pendingUrns.value.length === 0) {
    return
  }

  flushInProgress.value = true
  const urnsToFetch = [...new Set(pendingUrns.value)]
  pendingUrns.value = []

  try {
    const urnGroups: string[][] = []
    let currentGroup: string[] = []
    let currentGroupLength = URNS_QUERY_PREFIX.length

    for (const urn of urnsToFetch) {
      const encodedUrnLength = encodeURIComponent(urn).length
      const commaLength = currentGroup.length > 0 ? encodeURIComponent(',').length : 0
      const nextLength = currentGroupLength + commaLength + encodedUrnLength

      if (URNS_QUERY_PREFIX.length + encodedUrnLength > MAX_QUERY_STRING_LENGTH) {
        throw new Error(`URN '${urn}' exceeds max query string length of ${MAX_QUERY_STRING_LENGTH}`)
      }

      if (nextLength > MAX_QUERY_STRING_LENGTH) {
        urnGroups.push(currentGroup)
        currentGroup = [urn]
        currentGroupLength = URNS_QUERY_PREFIX.length + encodedUrnLength
      } else {
        currentGroup.push(urn)
        currentGroupLength = nextLength
      }
    }

    if (currentGroup.length > 0) {
      urnGroups.push(currentGroup)
    }

    const scoreSetsByUrn = new Map<string, ShortScoreSet>()

    for (const urnGroup of urnGroups) {
      const response = await axios.get(`${config.apiBaseUrl}/score-sets/`, {
        params: {urns: urnGroup.join(',')}
      })

      const scoreSets = response.data as ShortScoreSet[]
      for (const scoreSet of scoreSets) {
        scoreSetsByUrn.set(scoreSet.urn, scoreSet)
      }
    }

    for (const urn of urnsToFetch) {
      const scoreSet = scoreSetsByUrn.get(urn)
      if (scoreSet) {
        resolvePendingRequests(urn, scoreSet)
      } else {
        rejectPendingRequests(urn, new Error(`score set with URN '${urn}' not found`))
      }
    }
  } catch (error) {
    for (const urn of urnsToFetch) {
      rejectPendingRequests(urn, error)
    }
  } finally {
    flushInProgress.value = false
    if (pendingUrns.value.length > 0) {
      scheduleFlush()
    }
  }
}

export function getBufferedScoreSet(urn: string): Promise<ShortScoreSet> {
  return new Promise((resolve, reject) => {
    const requests = pendingRequests.get(urn) ?? []
    requests.push({resolve, reject})
    pendingRequests.set(urn, requests)

    if (!pendingUrns.value.includes(urn)) {
      pendingUrns.value = [...pendingUrns.value, urn]
    }

    scheduleFlush()
  })
}