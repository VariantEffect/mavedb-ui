/** Centralized external URLs used across the application. */

export const ZULIP_BASE = 'https://mavedb.zulipchat.com'
export const ZULIP_CHAT = `${ZULIP_BASE}/`
export const ZULIP_BETA_TESTERS = `${ZULIP_BASE}/#narrow/channel/511813-beta-testers`
export const ZULIP_DATASET_ISSUES = `${ZULIP_BASE}/#narrow/channel/511832-dataset-issues`

export const GITHUB_UI_ISSUES = 'https://github.com/VariantEffect/mavedb-ui/issues'
export const GITHUB_API_ISSUES = 'https://github.com/VariantEffect/mavedb-api/issues'

export const MAVEDB_PRODUCTION = 'https://mavedb.org'

/**
 * Build a Zulip link to report a dataset issue for a specific URN.
 */
export function datasetIssueLink(urn: string): string {
  return `${ZULIP_DATASET_ISSUES}/topic/${urn}`
}
