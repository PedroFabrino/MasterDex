export type CardCondition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'

export const CARD_CONDITIONS: readonly CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const

export const DEFAULT_CARD_CONDITION: CardCondition = 'NM'

/**
 * Baseline multipliers applied against the Near Mint (NM) benchmark market price.
 * Easily tunable configuration for market calibrations.
 */
export const CONDITION_BASELINE_MULTIPLIERS: Record<CardCondition, number> = {
  NM: 1.0,
  LP: 0.85,
  MP: 0.7,
  HP: 0.5,
  DMG: 0.3,
}

/**
 * Weights used to calculate relative scaling ratios when interpolating from the nearest available condition.
 */
export const CONDITION_WEIGHTS: Record<CardCondition, number> = {
  NM: 1.0,
  LP: 0.85,
  MP: 0.7,
  HP: 0.5,
  DMG: 0.3,
}

/**
 * Calculates the scaling ratio between two conditions.
 * E.g., target = DMG (0.30), source = HP (0.50) -> ratio = 0.30 / 0.50 = 0.60 (60%).
 */
export function getConditionRelativeRatio(target: CardCondition, source: CardCondition): number {
  const targetWeight = CONDITION_WEIGHTS[target] ?? 1.0
  const sourceWeight = CONDITION_WEIGHTS[source] ?? 1.0
  if (sourceWeight <= 0) return 1.0
  return Math.round((targetWeight / sourceWeight) * 100) / 100
}

/**
 * 1:1 mapping from LigaPokémon store stock quality ID (qualid) to standardized CardCondition.
 * 1 = M (Nova), 2 = NM (Praticamente Nova), 3 = SP (Usada Levemente), 4 = MP (Usada Moderadamente),
 * 5 = HP (Muito Usada), 6 = D (Danificada).
 */
export const LIGA_QUALID_TO_CONDITION: Record<number | string, CardCondition> = {
  '1': 'NM',
  '2': 'NM',
  '3': 'LP',
  '4': 'MP',
  '5': 'HP',
  '6': 'DMG',
}

export const CONDITION_TO_LIGA_QUALIDS: Record<CardCondition, number[]> = {
  NM: [2, 1],
  LP: [3],
  MP: [4],
  HP: [5],
  DMG: [6],
}

export const CONDITION_HIERARCHY: readonly CardCondition[] = ['NM', 'LP', 'MP', 'HP', 'DMG'] as const

/**
 * Finds the closest available condition to the target condition from a list of available conditions.
 * Distance is measured by ordinal steps in the hierarchy.
 */
export function findNearestCondition(
  target: CardCondition,
  available: CardCondition[]
): CardCondition | null {
  if (available.length === 0) return null
  if (available.includes(target)) return target

  const targetIdx = CONDITION_HIERARCHY.indexOf(target)
  let closest: CardCondition | null = null
  let minDistance = Infinity

  for (const c of available) {
    const idx = CONDITION_HIERARCHY.indexOf(c)
    if (idx !== -1) {
      const dist = Math.abs(idx - targetIdx)
      if (dist < minDistance) {
        minDistance = dist
        closest = c
      }
    }
  }
  return closest
}

/**
 * Normalizes any string or null condition to a valid CardCondition.
 */
export function normalizeCardCondition(condition?: string | null): CardCondition {
  if (!condition) return DEFAULT_CARD_CONDITION
  const upper = condition.toUpperCase().trim()
  if (upper === 'D' || upper === 'DAMAGED') return 'DMG'
  if (upper === 'SP') return 'LP'
  if (upper === 'M') return 'NM'
  if (CARD_CONDITIONS.includes(upper as CardCondition)) {
    return upper as CardCondition
  }
  return DEFAULT_CARD_CONDITION
}
