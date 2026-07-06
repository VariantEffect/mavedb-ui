import {isNucleotideHgvs} from '@/lib/mave-hgvs'
import type {HgvsField, LeanVariant} from '@/lib/variants'

/** The sequence level a coordinate is expressed in. */
export type SequenceLevel = 'dna' | 'protein'

/** The coordinate frame: `raw` = submitted/target numbering, `mapped` = reference numbering. */
export type CoordinateFrame = 'raw' | 'mapped'

/**
 * Stateless resolution of a variant's HGVS coordinate across two orthogonal axes — sequence
 * **level** (dna ↔ protein) and **frame** (raw/submitted ↔ mapped/reference).
 *
 * `coordinateFor` is the single source of truth: every downstream derivation (heatmap x/y,
 * axis availability, labels, tooltips) resolves through it, so the (level, frame) → coordinate
 * mapping lives in exactly one place. The frame axis is load-bearing — raw and mapped are
 * genuinely different coordinate systems, not the same grid with different captions.
 *
 * Shared between ScoreSetView (search, labels, level options) and ScoreSetHeatmap (plotting).
 */
export function useVariantCoordinates() {
  /**
   * Resolve the HGVS coordinate for a variant at a given level and frame, or `null` when that
   * cell does not exist for the variant.
   *
   * The 2×2 mapping onto the lean record's slots:
   *
   * |         | raw       | mapped                                |
   * | ------- | --------- | ------------------------------------- |
   * | dna     | `hgvsNt`  | `assayLevelHgvs` iff it is nucleotide |
   * | protein | `hgvsPro` | `proteinLevelHgvs`                    |
   *
   * The (mapped, dna) cell is `null` for a protein assay: a protein measurement has no mapped
   * coding representation (mavedb-api#784), so we never fabricate one from a degenerate sibling.
   */
  function coordinateFor(variant: LeanVariant, level: SequenceLevel, frame: CoordinateFrame): HgvsField | null {
    if (frame === 'raw') {
      return (level === 'dna' ? variant.hgvsNt : variant.hgvsPro) ?? null
    }
    if (level === 'protein') {
      return variant.proteinLevelHgvs ?? null
    }
    // mapped + dna: only when the assay-level mapped representation is itself nucleotide.
    const assayLevel = variant.assayLevelHgvs
    return assayLevel && isNucleotideHgvs(assayLevel.hgvs) ? assayLevel : null
  }

  /** The nucleotide HGVS string for a variant in the given frame, if any. */
  function getHgvsNt(variant: LeanVariant, frame: CoordinateFrame): string | undefined {
    return coordinateFor(variant, 'dna', frame)?.hgvs
  }

  /** The protein HGVS string for a variant in the given frame, if any. */
  function getHgvsPro(variant: LeanVariant, frame: CoordinateFrame): string | undefined {
    return coordinateFor(variant, 'protein', frame)?.hgvs
  }

  /**
   * Preferred display label in the given frame, most to least specific:
   *   frame protein → frame nucleotide → submitted protein → submitted nucleotide → submitted splice → URN.
   *
   * The mapped frame has no coordinate for an unmapped variant, so before giving up to the bare URN we
   * fall back to the variant's submitted (target-frame) HGVS: an unmapped intronic variant still carries
   * its `c.122-6T>A`, which is far more informative than the URN. In the raw frame the first two slots
   * already are the submitted strings, so the fallback is inert there. The URN surfaces only when the
   * variant carries no HGVS at all.
   */
  function labelForVariant(variant: LeanVariant, frame: CoordinateFrame): string {
    return (
      coordinateFor(variant, 'protein', frame)?.hgvs ??
      coordinateFor(variant, 'dna', frame)?.hgvs ??
      variant.hgvsPro?.hgvs ??
      variant.hgvsNt?.hgvs ??
      variant.hgvsSplice?.hgvs ??
      variant.variantUrn
    )
  }

  /** Whether any variant resolves a coordinate at the given level and frame. */
  function levelAvailable(variants: LeanVariant[], level: SequenceLevel, frame: CoordinateFrame): boolean {
    return variants.some((v) => coordinateFor(v, level, frame) != null)
  }

  /** The level options to offer for the given frame, in display order (DNA before Protein). */
  function sequenceTypeOptions(
    variants: LeanVariant[],
    frame: CoordinateFrame
  ): Array<{title: string; value: SequenceLevel}> {
    const options: Array<{title: string; value: SequenceLevel}> = []
    if (levelAvailable(variants, 'dna', frame)) options.push({title: 'DNA', value: 'dna'})
    if (levelAvailable(variants, 'protein', frame)) options.push({title: 'Protein', value: 'protein'})
    return options
  }

  /**
   * Resolve which level to actually display: keep `desiredLevel` if it is available in this
   * frame, otherwise fall back to the first available level, or `null` if none are. Makes the
   * frame→level coupling explicit — when a frame flip strands the current level, the fallback is
   * deterministic rather than dependent on a watcher firing.
   */
  function resolveLevel(
    variants: LeanVariant[],
    desiredLevel: SequenceLevel,
    frame: CoordinateFrame
  ): SequenceLevel | null {
    const available = sequenceTypeOptions(variants, frame).map((option) => option.value)
    if (available.includes(desiredLevel)) return desiredLevel
    return available[0] ?? null
  }

  /**
   * Whether the mapping/annotation step produced no mapped allele for this variant — keyed on the
   * authoritative allele digest, which is null exactly when nothing was mapped. In the mapped frame
   * such a variant has no mapped coordinate, so its label falls back to the submitted (target-frame)
   * HGVS. That fallback string can look mapped (accession-based target) or plainly unmapped
   * (sequence-based target, bare `c.` coordinate), so callers gate a "could not be mapped" note on this
   * being true and the frame being mapped. The submitted string is shown by intent in the raw frame.
   */
  function isUnmapped(variant: LeanVariant): boolean {
    return variant.assayLevelDigest == null
  }

  return {
    coordinateFor,
    getHgvsNt,
    getHgvsPro,
    labelForVariant,
    isUnmapped,
    levelAvailable,
    sequenceTypeOptions,
    resolveLevel
  }
}
