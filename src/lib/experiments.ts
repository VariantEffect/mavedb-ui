import type {components} from '@/schema/openapi'

type Experiment = components['schemas']['Experiment']

/**
 * Look up a controlled keyword label on an experiment by its key.
 *
 * @param experiment The experiment whose keywords to search (may be null/undefined).
 * @param key The keyword key to match (e.g. 'Phenotypic Assay Method').
 * @returns The keyword label, or null if not found.
 */
export function getExperimentKeyword(experiment: Experiment | null | undefined, key: string): string | null {
  const keywords = experiment?.keywords
  if (!keywords) return null
  const found = keywords.find((k) => k.keyword?.key === key)
  return found?.keyword?.label || null
}
