/**
 * @fileoverview
 * gnomAD frequency annotations and related utilities.
 *
 * gnomAD is a population-scale variant frequency database. This module provides a type for the gnomAD
 * annotation schema, and functions to collect the distinct frequencies across a variant's alleles, format them,
 * and link to the gnomAD variant page.
 */

import type {KeySection} from '@/composables/use-key-drawer'
import {hgvsLabelRank} from '@/lib/formats'
import type {components} from '@/schema/openapi'

type GnomadAnnotation = components['schemas']['GnomadAnnotation']

/** Key-drawer glossary for the gnomAD population-frequency terms this module surfaces. */
export const POPULATION_KEY_SECTION: KeySection = {
  id: 'population',
  title: 'Population frequency (gnomAD)',
  gloss: 'How often the allele is seen in reference populations — high frequency argues against pathogenicity.',
  terms: [
    {
      label: 'Allele frequency (AF)',
      definition:
        'The fraction of sampled reference-population chromosomes carrying this allele in gnomAD (allele count ÷ allele number).'
    },
    {
      label: 'AC / AN',
      definition:
        'Allele count and allele number: the observed carriers and the total chromosomes sampled that the frequency is computed from.'
    },
    {
      label: 'FAF95',
      definition:
        "Filtering allele frequency at 95% confidence: a sampling-adjusted, conservative estimate of the population frequency. When it exceeds a disease's maximum credible allele frequency, the variant is too common to be pathogenic (ACMG BA1/BS1)."
    }
  ]
}

/** One underlying gnomAD measurement, tagged with the reference-frame HGVS of the allele it annotates. */
export interface UnderlyingGnomad {
  hgvs: string | null
  gnomad: GnomadAnnotation
}

/**
 * Collect the distinct gnomAD measurements across a variant record's alleles.
 *
 * A protein change is encoded by several genomic variants, each with its own gnomAD frequency. Enumerate
 * this set of distinct frequencies, deduplicating by gnomAD variant id and preferring a coding HGVS for
 * the label. Sort by descending allele frequency.
 */
export function collectGnomadFrequencies(
  annotations: Record<string, {gnomad?: GnomadAnnotation | null}> | null | undefined,
  alleles: Record<string, {hgvs?: string | null}> | null | undefined
): UnderlyingGnomad[] {
  if (!annotations) return []
  const byVariant = new Map<string, UnderlyingGnomad>()
  for (const [digest, ann] of Object.entries(annotations)) {
    const gnomad = ann.gnomad
    if (!gnomad) continue

    const hgvs = alleles?.[digest]?.hgvs ?? null
    const existing = byVariant.get(gnomad.dbIdentifier)
    if (!existing) {
      byVariant.set(gnomad.dbIdentifier, {hgvs, gnomad})
    } else if (hgvsLabelRank(hgvs) > hgvsLabelRank(existing.hgvs)) {
      existing.hgvs = hgvs
    }
  }
  return [...byVariant.values()].sort((a, b) => b.gnomad.alleleFrequency - a.gnomad.alleleFrequency)
}

/** Deep link to a gnomAD variant page, choosing the dataset that matches the annotation's version. */
export function gnomadVariantUrl(gnomad: {dbIdentifier: string; dbVersion: string}): string {
  const major = parseInt(gnomad.dbVersion, 10)
  const dataset = major === 3 ? 'gnomad_r3' : major === 2 ? 'gnomad_r2_1' : 'gnomad_r4'
  return `https://gnomad.broadinstitute.org/variant/${encodeURIComponent(gnomad.dbIdentifier)}?dataset=${dataset}`
}

/** A frequency (e.g. gnomAD AF): scientific notation for the very rare, else 3 significant figures. */
export function formatFrequency(value: number | null | undefined): string {
  if (value == null) return '—'
  return value < 0.0001 ? value.toExponential(2) : value.toPrecision(3)
}
