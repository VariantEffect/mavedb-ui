import router from '@/router'
import {genericVariant} from './mave-hgvs'

export function routeToVariantSearchIfVariantIsSearchable(searchText: string | null | undefined): boolean {
  if (!searchText || searchText.trim() === '') {
    return false
  }

  searchText = searchText.trim()
  const hgvsMatches = genericVariant.exec(searchText)
  if (hgvsMatches && hgvsMatches.groups) {
    const identifier = hgvsMatches.groups.identifier
    const description = hgvsMatches.groups.description

    // Regex for RefSeq/Ensembl transcript IDs
    const transcriptRegex = /^(N[CMPR]_|X[MR]_|ENST|ENSMUST|ENSMUST|XM_|XR_)[0-9]+(\.[0-9]+)?$/gm
    if (transcriptRegex.test(identifier)) {
      // Transcript: treat as normal HGVS
      console.log(`Routing to mavemd with HGVS: ${hgvsMatches[0]}`)
      router.push({name: 'mavemd', query: {search: hgvsMatches[0]}})
    } else {
      // Assume identifier is an HGNC gene symbol, parse description for fuzzy search
      // Example: BRCA1:c.123A>G or BRCA1:p.Arg123Gly
      let gene = identifier
      let variantType = ''
      let variantPosition = ''
      let refAllele = ''
      let altAllele = ''

      // Try to parse c. or p. notation
      const fuzzyMatch = /^(c\.|p\.)?([A-Za-z]+)?([0-9]+)([A-Za-z*-]+)?(?:>([A-Za-z*-]+))?$/gm.exec(description)
      if (fuzzyMatch) {
        variantType = fuzzyMatch[1] || ''
        if (variantType === 'c.') {
          variantPosition = fuzzyMatch[3] || ''
          refAllele = fuzzyMatch[4] || ''
          altAllele = fuzzyMatch[5] || ''
        } else if (variantType === 'p.') {
          refAllele = fuzzyMatch[2] || ''
          variantPosition = fuzzyMatch[3] || ''
          altAllele = fuzzyMatch[4] || ''
        }
      }

      router.push({
        name: 'mavemd',
        query: {
          gene,
          variantType,
          variantPosition,
          refAllele,
          altAllele
        }
      })
    }
    return true
  }
  return false
}
