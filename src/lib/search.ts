import router from '@/router'
import {hgvsSearchStringRegex} from './mave-hgvs'
import {clinGenAlleleIdRegex, rsIdRegex} from './mavemd'

export function routeToVariantSearchIfVariantIsSearchable(searchText: string | null | undefined): boolean {
  if (!searchText || searchText.trim() === '') {
    return false
  }

  searchText = searchText.trim()
  if (clinGenAlleleIdRegex.test(searchText)) {
    console.log(`Routing to mavemd with ClinGen Allele ID: ${searchText}`)
    router.push({name: 'mavemd', query: {search:searchText}})
    return true
  }

  if (rsIdRegex.test(searchText)) {
    console.log(`Routing to mavemd with RS ID: ${searchText}`)
    router.push({name: 'mavemd', query: {search: searchText}})
    return true
  }

  const hgvsMatches = hgvsSearchStringRegex.exec(searchText)
  if (hgvsMatches && hgvsMatches.groups) {
    const identifier = hgvsMatches.groups.identifier
    const description = hgvsMatches.groups.description

    // Regex for RefSeq/Ensembl transcript IDs
    const accessionRegex = /^(N[CMPR]_|X[MR]_|ENST|ENSMUST|ENSMUST|ENSP)[0-9]+(\.[0-9]+)?$/gm
    if (accessionRegex.test(identifier)) {
      // Transcript: treat as normal HGVS
      console.log(`Routing to mavemd with HGVS: ${hgvsMatches[0]}`)
      router.push({name: 'mavemd', query: {search: hgvsMatches[0]}})
      return true
    } else {
      // Assume identifier is an HGNC gene symbol, parse description for fuzzy search
      // Example: BRCA1:c.123A>G or BRCA1:p.Arg123Gly
      const gene = identifier
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
        return true
      } else {
        // The search looks like an HGVS string but with an invalid accession, and it's not a p. or c. string preceded by
        // a gene name. Forward to the variant search screen, which will deal with the problem.
        console.log(`Routing to mavemd with HGVS: ${hgvsMatches[0]}`)
        router.push({name: 'mavemd', query: {search: hgvsMatches[0]}})
        return true
      }
    }
  }
  return false
}
