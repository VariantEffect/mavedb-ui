import {variantNotNullOrNA, preferredVariantLabel, type SimpleMaveVariant} from '@/lib/mave-hgvs'
import type {Variant} from '@/lib/variants'

/**
 * Stateless composable for resolving variant HGVS coordinates based on
 * the current display mode (raw vs mapped). Shared between ScoreSetView
 * (variant search, labels, sequence type detection) and ScoreSetHeatmap.
 */
export function useVariantCoordinates() {
  /**
   * Get the best nucleotide HGVS string for a variant.
   * In mapped mode, prefers post_mapped_hgvs_c when available.
   */
  function getHgvsNt(variant: Variant, useMapped: boolean): string | undefined {
    if (useMapped && variantNotNullOrNA(variant.mavedb?.post_mapped_hgvs_c)) {
      return variant.mavedb!.post_mapped_hgvs_c!
    }
    return variant.hgvs_nt
  }

  /**
   * Get the best protein HGVS string for a variant.
   * In mapped mode, prefers translated_hgvs_p or post_mapped_hgvs_p.
   * In raw mode, falls back through hgvs_pro → translated_hgvs_p.
   */
  function getHgvsPro(variant: Variant, useMapped: boolean): string | undefined {
    if (useMapped) {
      if (variantNotNullOrNA(variant.translated_hgvs_p)) return variant.translated_hgvs_p
      if (variantNotNullOrNA(variant.mavedb?.post_mapped_hgvs_p)) return variant.mavedb!.post_mapped_hgvs_p!
    }
    if (variantNotNullOrNA(variant.hgvs_pro)) return variant.hgvs_pro
    if (variantNotNullOrNA(variant.translated_hgvs_p)) return variant.translated_hgvs_p
    return undefined
  }

  /**
   * Get the preferred display label for a variant, respecting coordinate mode.
   * Prefers protein > nucleotide > splice > accession.
   */
  function labelForVariant(variant: Variant, useMapped: boolean): {mavedb_label: string} {
    const pro = getHgvsPro(variant, useMapped)
    if (variantNotNullOrNA(pro)) return {mavedb_label: pro!}

    const nt = getHgvsNt(variant, useMapped)
    if (variantNotNullOrNA(nt)) return {mavedb_label: nt!}

    if (variantNotNullOrNA(variant.hgvs_splice)) return {mavedb_label: variant.hgvs_splice!}

    return preferredVariantLabel(variant as SimpleMaveVariant)
  }

  /**
   * Check whether any variants have DNA (nucleotide) HGVS data available.
   */
  function hasDnaVariants(variants: Variant[], useMapped: boolean): boolean {
    return variants.some((v) => variantNotNullOrNA(getHgvsNt(v, useMapped)))
  }

  /**
   * Check whether any variants have protein HGVS data available.
   */
  function hasProteinVariants(variants: Variant[], useMapped: boolean): boolean {
    return variants.some((v) => variantNotNullOrNA(getHgvsPro(v, useMapped)))
  }

  /**
   * Build the sequence type options array for heatmap/display controls.
   */
  function sequenceTypeOptions(variants: Variant[], useMapped: boolean): Array<{title: string; value: string}> {
    const options: Array<{title: string; value: string}> = []
    if (hasDnaVariants(variants, useMapped)) options.push({title: 'DNA', value: 'dna'})
    if (hasProteinVariants(variants, useMapped)) options.push({title: 'Protein', value: 'protein'})
    return options
  }

  return {
    getHgvsNt,
    getHgvsPro,
    labelForVariant,
    hasDnaVariants,
    hasProteinVariants,
    sequenceTypeOptions
  }
}
