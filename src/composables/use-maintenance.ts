import axios from 'axios'
import {computed, ref} from 'vue'

import config from '@/config'

import {parseMaintenanceNotice, type MaintenanceNotice} from '@/lib/maintenance'

const NOTICE_URL = '/maintenance.json'
const IDLE_POLL_MS = 5 * 60 * 1000
const ACTIVE_POLL_MS = 60 * 1000
/** Floor between refreshes, so a burst of failing API calls costs at most one fetch. */
const MIN_REFRESH_GAP_MS = 15 * 1000
const BYPASS_QUERY_PARAM = 'maintenance'
const BYPASS_STORAGE_KEY = 'maintenanceBypass'

/**
 * Module-level singleton holding the current maintenance notice. The banner, the maintenance screen and the Axios
 * interceptor all read or refresh the same state, and there is only one notice per site.
 */
const notice = ref<MaintenanceNotice | null>(null)
const bypassed = ref(false)
let lastRefresh = 0
let pollTimer: ReturnType<typeof setTimeout> | null = null

async function fetchNotice(): Promise<void> {
  lastRefresh = Date.now()
  try {
    const response = await fetch(NOTICE_URL, {cache: 'no-store'})
    if (!response.ok) {
      notice.value = null
      return
    }
    // A missing file comes back from CloudFront as index.html with a 200, so parse failures mean "no notice".
    const body = await response.text()
    let raw: unknown = null
    try {
      raw = JSON.parse(body)
    } catch {
      raw = null
    }
    notice.value = parseMaintenanceNotice(raw)
  } catch {
    // Network failure: keep whatever we last knew rather than flapping the banner.
  }
}

function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer)
  const delay = notice.value?.status === 'active' ? ACTIVE_POLL_MS : IDLE_POLL_MS
  pollTimer = setTimeout(async () => {
    await fetchNotice()
    schedulePoll()
  }, delay)
}

/**
 * Re-read the notice now, unless it was read very recently. Called when API requests start failing, so the
 * maintenance screen appears as soon as the operator flips the file rather than on the next poll.
 */
export async function refreshMaintenanceNotice(): Promise<void> {
  if (Date.now() - lastRefresh < MIN_REFRESH_GAP_MS) return
  await fetchNotice()
  schedulePoll()
}

/**
 * Read the bypass flag from the URL (`?maintenance=bypass` sets it, `?maintenance=off` clears it) and remember it for
 * the browser session. Lets operators use the site through the WAF allow-list before maintenance is lifted.
 */
function initBypass() {
  try {
    const param = new URLSearchParams(window.location.search).get(BYPASS_QUERY_PARAM)
    if (param === 'bypass') sessionStorage.setItem(BYPASS_STORAGE_KEY, '1')
    if (param === 'off') sessionStorage.removeItem(BYPASS_STORAGE_KEY)
    bypassed.value = sessionStorage.getItem(BYPASS_STORAGE_KEY) === '1'
  } catch {
    bypassed.value = false
  }
}

/** Load the notice and keep it current. Call once at startup. */
export async function startMaintenanceWatch(): Promise<void> {
  initBypass()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshMaintenanceNotice()
  })
  await fetchNotice()
  schedulePoll()
}

/** Statuses the API returns, or the load balancer and WAF return for it, while it is unavailable. */
const UNAVAILABLE_STATUSES = new Set([502, 503, 504])

/**
 * Re-check the notice when an API request fails in a way consistent with downtime. Requests without a response are
 * included: an error from a down API carries no CORS headers, so the browser reports it as a network error.
 */
export function installAxiosMaintenanceInterceptor() {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const url: string | undefined = error?.config?.url
      if (url?.startsWith(config.apiBaseUrl) && (!error.response || UNAVAILABLE_STATUSES.has(error.response.status))) {
        refreshMaintenanceNotice()
      }
      return Promise.reject(error)
    }
  )
}

export function useMaintenance() {
  const isScheduled = computed(() => notice.value?.status === 'scheduled')
  const isActive = computed(() => notice.value?.status === 'active')
  const showMaintenanceScreen = computed(() => isActive.value && !bypassed.value)
  return {notice, bypassed, isScheduled, isActive, showMaintenanceScreen}
}
