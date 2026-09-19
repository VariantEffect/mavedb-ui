import {describe, expect, it} from 'vitest'

import {
  consequenceBucket,
  humanReadableConsequence,
  EFFECT_BUCKETS,
  type EffectBucketName
} from '@/lib/consequences'

// The full VEP consequence set the API can emit.
const ALL_CONSEQUENCES = [
  'transcript_ablation',
  'splice_acceptor_variant',
  'splice_donor_variant',
  'stop_gained',
  'frameshift_variant',
  'stop_lost',
  'start_lost',
  'transcript_amplification',
  'inframe_insertion',
  'inframe_deletion',
  'missense_variant',
  'disruptive_inframe_insertion',
  'disruptive_inframe_deletion',
  'protein_altering_variant',
  'splice_region_variant',
  'incomplete_terminal_codon_variant',
  'start_retained',
  'stop_retained',
  'synonymous_variant',
  'coding_sequence_variant',
  'mature_miRNA_variant',
  '5_prime_UTR_premature_start_codon_gain_variant',
  '5_prime_UTR_variant',
  '3_prime_UTR_variant',
  'non_coding_transcript_exon_variant',
  'non_coding_exon_variant',
  'non_coding_transcript_variant',
  'nc_transcript_variant',
  'upstream_gene_variant',
  'downstream_gene_variant',
  'TFBS_ablation',
  'TFBS_amplification',
  'TF_binding_site_variant',
  'regulatory_region_ablation',
  'enhancer_ablation',
  'regulatory_region_amplification',
  'enhancer_amplification',
  'regulatory_region_variant',
  'feature_elongation',
  'regulatory_region',
  'TFBS',
  'feature_truncation',
  'exon_variant',
  'gene_variant',
  'variant_affecting_coding_sequence_conservation',
  'variant_affecting_genome_assembly_quality',
  'variant_of_unknown_significance',
  'sequence_variant',
  'rare_amino_acid_variant',
  'intron_variant',
  'intergenic_variant'
]

describe('consequenceBucket', () => {
  it('maps headline terms to their bucket', () => {
    expect(consequenceBucket('missense_variant')).toBe('Missense')
    expect(consequenceBucket('synonymous_variant')).toBe('Synonymous')
    expect(consequenceBucket('stop_gained')).toBe('Nonsense')
    expect(consequenceBucket('start_lost')).toBe('Start/Stop Loss')
    expect(consequenceBucket('stop_lost')).toBe('Start/Stop Loss')
    expect(consequenceBucket('frameshift_variant')).toBe('Indel/Frameshift')
    expect(consequenceBucket('inframe_deletion')).toBe('Indel/Frameshift')
    expect(consequenceBucket('splice_acceptor_variant')).toBe('Splice')
  })

  it('maps an unrecognized but present term to Other', () => {
    expect(consequenceBucket('intron_variant')).toBe('Other')
    expect(consequenceBucket('some_future_so_term')).toBe('Other')
  })

  it('maps an absent consequence to No consequence', () => {
    expect(consequenceBucket(null)).toBe('No consequence')
    expect(consequenceBucket(undefined)).toBe('No consequence')
    expect(consequenceBucket('')).toBe('No consequence')
    expect(consequenceBucket('NA')).toBe('No consequence')
  })

  it('never maps a real consequence term to No consequence, and always to a defined bucket', () => {
    const bucketNames = new Set<EffectBucketName>(EFFECT_BUCKETS.map((b) => b.name))
    for (const term of ALL_CONSEQUENCES) {
      const bucket = consequenceBucket(term)
      expect(bucket).not.toBe('No consequence')
      expect(bucketNames.has(bucket)).toBe(true)
    }
  })

  it('lists each SO term in at most one bucket', () => {
    const seen = new Set<string>()
    for (const bucket of EFFECT_BUCKETS) {
      for (const term of bucket.soTerms) {
        expect(seen.has(term)).toBe(false)
        seen.add(term)
      }
    }
  })
})

describe('humanReadableConsequence', () => {
  it('uses curated labels where the raw term reads poorly', () => {
    expect(humanReadableConsequence('stop_gained')).toBe('Nonsense (stop gained)')
    expect(humanReadableConsequence('start_lost')).toBe('Start loss')
  })

  it('de-underscores and capitalizes the long tail, preserving embedded casing', () => {
    expect(humanReadableConsequence('splice_acceptor_variant')).toBe('Splice acceptor variant')
    expect(humanReadableConsequence('5_prime_UTR_variant')).toBe('5 prime UTR variant')
  })

  it('returns null for an absent consequence', () => {
    expect(humanReadableConsequence(null)).toBeNull()
    expect(humanReadableConsequence('NA')).toBeNull()
  })
})
