import _ from 'lodash'

import {parseSimpleNtVariant, parseSimpleProVariant} from "./mave-hgvs"
import geneticCodes from './genetic-codes'
import { AMINO_ACIDS_WITH_TER } from './amino-acids'

type ReferenceType = 'c' | 'p'

interface SequenceRange {
  start: number
  length: number
}

const HGVS_REFERENCE_TYPES = {
  'c': {
    parsedPostMappedHgvsField: 'parsedPostMappedHgvsC'
  },
  'p': {
    parsedPostMappedHgvsField: 'parsedPostMappedHgvsP'
  }
}

function getParsedPostMappedHgvs(variant: any, type: ReferenceType) {
  return variant[HGVS_REFERENCE_TYPES[type].parsedPostMappedHgvsField]
}

/**
 * Add parsed post-mapped HGVS c. and p. strings to variants wherever possible.
 *
 * When a mapped c. or p. string is not present but unmapped c. or p. strings are present and have references, use them
 * instead. This is a temporary measure until we have more thorough access to mapped c. and p. strings.
 *
 * @param variants The variants to modify.
 */
export function prepareSimpleCodingVariants(variants: any[]) {
  for (const v of variants) {
    if (v.post_mapped_hgvs_c) {
      const parsedHgvs = parseSimpleNtVariant(v.post_mapped_hgvs_c)
      if (parsedHgvs && parsedHgvs.referenceType == 'c') {
        // v.clinicalHgvs = v.post_mapped_hgvs_c
        v.parsedPostMappedHgvsC = parsedHgvs
        v.parsedPostMappedHgvsC.residueType = 'nt'
        v.parsedPostMappedHgvsC.origin = 'mapped'
      }
    } else if (v.hgvs_nt) {
      // If a mapped HGVS c. string is missing but the raw HGVS string is a c. string with reference, us it instead.
      const parsedHgvs = parseSimpleNtVariant(v.hgvs_nt)
      if (parsedHgvs && parsedHgvs.referenceType == 'c' && parsedHgvs.target) {
        v.post_mapped_hgvs_c = v.hgvs_nt
        v.parsedPostMappedHgvsC = parsedHgvs
        v.parsedPostMappedHgvsC.residueType = 'nt'
        v.parsedPostMappedHgvsC.origin = 'unmapped'
      }
    }

    if (v.post_mapped_hgvs_p) {
      // v.clinicalHgvsP = v.post_mapped_hgvs_p
      const parsedHgvs = parseSimpleProVariant(v.post_mapped_hgvs_p)
      if (parsedHgvs) {
        // v.clinicalHgvsP = v.post_mapped_hgvs_p
        v.parsedPostMappedHgvsP = parsedHgvs
        v.parsedPostMappedHgvsP.residueType = 'aa'
        v.parsedPostMappedHgvsP.origin = 'mapped'
      }
    } else if (v.hgvs_p) {
      const parsedHgvs = parseSimpleProVariant(v.hgvs_p)
      if (parsedHgvs && parsedHgvs.target) {
        v.post_mapped_hgvs_p = v.hgvs_p
        v.parsedPostMappedHgvsP = parsedHgvs
        v.parsedPostMappedHgvsP.residueType = 'aa'
        v.parsedPostMappedHgvsP.origin = 'unmapped'
      }
    }
  }
}

export function filterVariantsForTargetInference(variants: any[]) {
  // Use p. variants unless there are c. variants that don't have p. strings.
  let referenceType: ReferenceType = 'p'
  if (variants.some((v) => !v.parsedPostMappedHgvsP && v.parsedPostMappedHgvsC)) {
    referenceType = 'c'
  }

  // Filter on variants with the chosen HGVS string type.
  return {
    referenceType,
    variants: variants.filter((v) => getParsedPostMappedHgvs(v, referenceType))
  }
}

function getTargetRange(simpleVariants: any[], referenceType: ReferenceType): SequenceRange {
  // Assume that all variants have the same residue type and reference.
  if (simpleVariants.length == 0) {
    return {
      start: 0,
      length: 0
    }
  }
  const positionMin = _.min(simpleVariants.map((v) => getParsedPostMappedHgvs(v, referenceType)?.position))
  const positionMax = _.max(simpleVariants.map((v) => getParsedPostMappedHgvs(v, referenceType)?.position))
  return {
    start: positionMin,
    length: positionMax - positionMin + 1
  }
}

export function inferCodingSequenceFromVariants(variants: any[], referenceType: ReferenceType) {
  if (variants.length == 0) {
    return {
      codingSequence: null,
      codingSequenceRange: null
    }
  }

  if (referenceType != 'c') {
    return {
      codingSequence: null,
      codingSequenceRange: null
    }
  }

  const codingRange = getTargetRange(variants, 'c')
  console.log(codingRange)
  const codingSequenceArr = Array(codingRange.length).fill('N')
  let codingSequenceFound = false
  for (const variant of variants) {
    const parsedHgvs = getParsedPostMappedHgvs(variant, 'c')
    if (!parsedHgvs) {
      continue
    }
    if (codingSequenceArr[parsedHgvs.position - codingRange.start] == 'N') {
      codingSequenceArr[parsedHgvs.position - codingRange.start] = parsedHgvs.original
    }
    codingSequenceFound = true
  }
  if (codingSequenceFound) {
    return {
      codingSequence: codingSequenceArr.join(''),
      codingSequenceRange: codingRange
    }
  } else {
    return {
      codingSequence: null,
      codingSequenceRange: null
    }
  }
}

export function inferTargetSequenceFromVariants(variants: any[], referenceType: ReferenceType) {
  if (variants.length == 0) {
    return ''
  }
  const targetRange = getTargetRange(variants, referenceType)
  const unknownResidue = referenceType == 'p' ? 'X' : 'N'
  const targetSequenceArr = Array(targetRange.length).fill(unknownResidue)
  for (const variant of variants) {
    const parsedHgvs = getParsedPostMappedHgvs(variant, referenceType)
    if (!parsedHgvs) {
      continue
    }
    if (targetSequenceArr[parsedHgvs.position - targetRange.start] == unknownResidue) {
      targetSequenceArr[parsedHgvs.position - targetRange.start] = parsedHgvs.original
    }
  }
  return {
    targetSequence: targetSequenceArr.join(''),
    targetSequenceResidueType: referenceType == 'p' ? 'aa' : 'nt',
    targetRange
  }
}

export function translateSimpleCodingVariants(variants: any[]) {
  prepareSimpleCodingVariants(variants)
  const {referenceType, variants: simpleCodingVariants} = filterVariantsForTargetInference(variants)
  const {codingSequence, codingSequenceRange} = inferCodingSequenceFromVariants(simpleCodingVariants, referenceType)
  if (codingSequence && referenceType == 'c') {
    for (const v of simpleCodingVariants) {
      if (v.parsedPostMappedHgvsC) {
        v.hgvs_pro_inferred = translateSimpleCodingHgvsNtVariant(v.parsedPostMappedHgvsC, codingSequence, codingSequenceRange)
      }
    }
  }
  return simpleCodingVariants
}

function translateSimpleCodingHgvsNtVariant(parsedHgvs: any, codingSequence: string, codingSequenceRange: SequenceRange) {
  const offsetInCodon = (parsedHgvs.position - 1) % 3
  const codonStartPosition = parsedHgvs.position - offsetInCodon
  const aaPosition = Math.floor((codonStartPosition - 1) / 3) + 1
  const codon = codingSequence.substr(codonStartPosition - codingSequenceRange.start - 1, 3)
  if ((codon.length != 3) || codon.includes('N')) {
    return null
  }
  const codonArr = codon.split('')
  codonArr[offsetInCodon] = parsedHgvs.substitution
  const variantCodon = codonArr.join('')
  // @ts-expect-error codonToAa is not reflected in the type yet
  const originalAaResidue = geneticCodes.standard.dna.codonToAa[codon]
// @ts-expect-error codonToAa is not reflected in the type yet
  const variantAaResidue = geneticCodes.standard.dna.codonToAa[variantCodon]
  const originalAaTriple = _.startCase(AMINO_ACIDS_WITH_TER.find((aa) => aa.codes.single == originalAaResidue)?.codes?.triple?.toLowerCase())
  const variantAaTriple = _.startCase(AMINO_ACIDS_WITH_TER.find((aa) => aa.codes.single == variantAaResidue)?.codes?.triple?.toLowerCase())
  return `p.${originalAaTriple}${aaPosition}${variantAaTriple}`
}
