export const clingenAlleleRegistryUrl = 'https://reg.clinicalgenome.org'
export const clingenAlleleRegistryCanonicalIdUrl = `${clingenAlleleRegistryUrl}/redmine/projects/registry/genboree_registry/by_canonicalid?canonicalid=`

export function clingenAlleleUrl(clingenAlleleId: string): string {
  return `${clingenAlleleRegistryUrl}/allele/${clingenAlleleId}`
}

export function clingenAlleleUrlFromCanonicalId(canonicalId: string): string {
  return `${clingenAlleleRegistryCanonicalIdUrl}${canonicalId}`
}
