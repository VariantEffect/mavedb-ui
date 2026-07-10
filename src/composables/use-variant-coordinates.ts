import type {HgvsField, LeanVariant} from '@/lib/variants'

/** The sequence level a coordinate is expressed in, mirroring the backend's AnnotationLayer enum. */
export type SequenceLevel = 'cdna' | 'genomic' | 'protein'

/** The coordinate frame: `raw` = submitted/target numbering, `mapped` = reference numbering. */
export type CoordinateFrame = 'raw' | 'mapped'

/**
 * Stateless resolution of a variant's HGVS coordinate across two orthogonal axes — sequence
 * **level** (cdna / genomic / protein) and **frame** (raw/submitted ↔ mapped/reference).
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
   * In the **mapped** frame each level routes directly to its `MappedTriple` slot:
   *
   * | level   | mapped slot       |
   * | ------- | ----------------- |
   * | cdna    | `mapped.cdna`     |
   * | genomic | `mapped.genomic`  |
   * | protein | `mapped.protein`  |
   *
   * In the **raw** frame `cdna` and `genomic` both alias `hgvsNt` — the depositor submitted one
   * nucleotide string and the schema has a single field for it. The cdna/genomic distinction is a
   * post-mapping conclusion, since raw submitted HGVS strings only have meaning relative to the submitted
   * sequence. Both levels therefore return `hgvsNt` and `levelAvailable` will report both as true whenever
   * `hgvsNt` is present. `sequenceTypeOptions` handles the display concern of offering only one NT option
   * in raw frame.
   */
  function coordinateFor(variant: LeanVariant, level: SequenceLevel, frame: CoordinateFrame): HgvsField | null {
    if (frame === 'raw') {
      if (level === 'protein') return variant.hgvsPro ?? null
      return variant.hgvsNt ?? null
    }
    // mapped: direct slot lookup — no assayLevel indirection needed.
    return variant.mapped?.[level] ?? null
  }

  /**
   * The canonical nucleotide HGVS string for a variant in the given frame, if any — the single
   * nucleotide coordinate a compact surface (label pair, tooltip note, search chip) should show.
   *
   * In the raw frame reads `hgvsNt` directly — no level discrimination, since the submitted string is
   * a single field. In the mapped frame the ordering is prescriptive: **coding (`cdna`) preferred,
   * genomic fallback.** The coding `NM_:c.` string is the natural pair of the protein `NP_:p.` change
   * (same transcript, same frame, the conventional `c. (p.)` citation), so a genomic-*measured* variant
   * surfaces its coding coordinate here rather than the `NC_:g.` one. It becomes the string only when
   * there is no coding projection.
   *
   * The plotted-axis coordinate is a different concern: when a surface has a user-selected level (the
   * heatmap axis) it should read `coordinateFor(variant, level, frame)` directly, not this.
   *
   * Returns `undefined` for protein assays or unmapped variants in the mapped frame.
   */
  function getHgvsNt(variant: LeanVariant, frame: CoordinateFrame): string | undefined {
    if (frame === 'raw') return variant.hgvsNt?.hgvs
    return (variant.mapped?.cdna ?? variant.mapped?.genomic)?.hgvs
  }

  /** The protein HGVS string for a variant in the given frame, if any. */
  function getHgvsPro(variant: LeanVariant, frame: CoordinateFrame): string | undefined {
    return coordinateFor(variant, 'protein', frame)?.hgvs
  }

  /**
   * Preferred display label in the given frame, following the prescriptive identity order
   * protein > coding > genomic (the last two via `getHgvsNt`), then submitted-string fallbacks:
   *   frame protein → frame nucleotide (coding-preferred) → submitted protein → submitted nucleotide → submitted splice → URN.
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
      getHgvsNt(variant, frame) ??
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

  const LEVEL_LABELS: Record<SequenceLevel, string> = {cdna: 'cDNA', genomic: 'Genomic', protein: 'Protein'}
  const LEVEL_ORDER: SequenceLevel[] = ['cdna', 'genomic', 'protein']

  /**
   * The level options to offer for the given frame, in display order.
   *
   * In the **mapped** frame returns whichever of cDNA / Genomic / Protein have data (up to all three
   * for a nucleotide assay). In the **raw** frame cdna and genomic both alias `hgvsNt`, so the
   * distinction is meaningless — the submitted string is target-relative and its level is only
   * determined after mapping. A single "Nucleotide" option is returned instead, with the `value`
   * keyed to `assayLevel` so that a frame switch routes to the right mapped slot.
   */
  function sequenceTypeOptions(
    variants: LeanVariant[],
    frame: CoordinateFrame
  ): Array<{title: string; value: SequenceLevel}> {
    if (frame === 'raw') {
      const options: Array<{title: string; value: SequenceLevel}> = []

      if (variants.some((v) => v.hgvsNt != null)) {
        const ntLevel =
          (variants.find((v) => v.assayLevel === 'cdna' || v.assayLevel === 'genomic')?.assayLevel as SequenceLevel) ??
          'cdna'
        options.push({title: 'Nucleotide', value: ntLevel})
      }

      if (variants.some((v) => v.hgvsPro != null)) options.push({title: 'Protein', value: 'protein'})
      return options
    }

    return LEVEL_ORDER.filter((level) => levelAvailable(variants, level, frame)).map((level) => ({
      title: LEVEL_LABELS[level],
      value: level
    }))
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
