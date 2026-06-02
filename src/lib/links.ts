/** Centralized external URLs used across the application. */

export const ZULIP_BASE = 'https://mavedb.zulipchat.com'
export const ZULIP_CHAT = `${ZULIP_BASE}/`
export const ZULIP_BETA_TESTERS = `${ZULIP_BASE}/#narrow/channel/511813-beta-testers`
export const ZULIP_DATASET_ISSUES = `${ZULIP_BASE}/#narrow/channel/511832-dataset-issues`

export const GITHUB_API_URL = 'https://github.com/VariantEffect/mavedb-api'
export const GITHUB_UI_URL = 'https://github.com/VariantEffect/mavedb-ui'
export const GITHUB_UI_ISSUES = `${GITHUB_UI_URL}/issues`
export const GITHUB_API_ISSUES = `${GITHUB_API_URL}/issues`

export const MAVEDB_PRODUCTION = 'https://mavedb.org'

export const AVE_CLINICAL_APPLICATION = 'https://www.varianteffect.org/clinical-application/'
export const MAVE_REGISTRY = 'https://registry.varianteffect.org/'

export const IGVF_URL = 'https://www.igvf.org/'
export const CLINGEN_URL = 'https://clinicalgenome.org/'
export const GA4GH_URL = 'https://www.ga4gh.org/'
export const CLINVAR_URL = 'https://www.ncbi.nlm.nih.gov/clinvar/'

/**
 * Build a Zulip link to report a dataset issue for a specific URN.
 */
export function datasetIssueLink(urn: string): string {
  return `${ZULIP_DATASET_ISSUES}/topic/${urn}`
}
