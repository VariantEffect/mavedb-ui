const DOI_REGEX = /^(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?![%"#? ])\S)+)$/
const DOI_PREFIXES = ['https://doi.org/', 'doi:']
const PUBMED_REGEX = /^[0-9]+$/
const PUBMED_PREFIXES = ['https://doi.org/', 'doi:']

export function normalizeDoi(s) {
    if (s) {
      s = s.trim()
      for (const protocol of DOI_PREFIXES) {
        if (s.startsWith(protocol)) {
          s = s.slice(protocol.length)
          break
        }
      }
    }
    return s
  }
  
export function validateDoi(s) {
  s = normalizeDoi(s)
  if (s) {
    return DOI_REGEX.test(s)
  }
  return false
}

export function normalizePubmedId(s) {
    if (s) {
      s = s.trim()
      for (const protocol of PUBMED_PREFIXES) {
        if (s.startsWith(protocol)) {
          s = s.slice(protocol.length)
          break
        }
      }
    }
    return s
  }
  
export function validatePubmedId(s) {
  s = normalizePubmedId(s)
  if (s) {
    return PUBMED_REGEX.test(s)
  }
  return false
}
