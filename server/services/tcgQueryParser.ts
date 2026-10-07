export interface ParsedTcgQuery {
  name: string
  localId?: string
  total?: number
}

/**
 * Smart query parser extracting card name, local collector number, and optional set total.
 * e.g.:
 * - "Mew ex 129/103" -> { name: "Mew ex", localId: "129", total: 103 }
 * - "Mew 129" -> { name: "Mew", localId: "129" }
 * - "129/103 Mew" -> { name: "Mew", localId: "129", total: 103 }
 * - "Pikachu" -> { name: "Pikachu" }
 */
export function parseTcgQuery(rawQuery: string): ParsedTcgQuery {
  const trimmed = rawQuery.trim()
  if (!trimmed) {
    return { name: '' }
  }

  // Direct hyphenated card id, e.g. "mep-023", "base1-4"
  const hyphenMatch = trimmed.match(/^([a-z0-9.]+)-([a-z0-9]+)$/i)
  if (hyphenMatch) {
    return {
      name: hyphenMatch[1],
      localId: hyphenMatch[2],
    }
  }

  // Clean noise words like 'promo', 'promos', and language codes (pt, en, ja)
  const normalized = trimmed
    .replace(/\bpromos?\b/gi, ' ')
    .replace(/\b(pt-br|pt|en-us|en|jp|ja)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Pattern 1: Trailing number or fraction, e.g., "Mew ex 129/103", "Charizard 4", "Charizard 023"
  const trailingMatch = normalized.match(/^(.*?)\s+(\d+)(?:\/(\d+))?$/i)
  if (trailingMatch) {
    const name = trailingMatch[1].trim()
    const localId = trailingMatch[2]
    const total = trailingMatch[3] ? parseInt(trailingMatch[3], 10) : undefined
    if (name) {
      return { name, localId, total }
    }
  }

  // Pattern 2: Leading fraction/number, e.g., "129/103 Mew", "4 Charizard", "023 Charizard"
  const leadingMatch = normalized.match(/^(\d+)(?:\/(\d+))?\s+(.*)$/i)
  if (leadingMatch) {
    const localId = leadingMatch[1]
    const total = leadingMatch[2] ? parseInt(leadingMatch[2], 10) : undefined
    const name = leadingMatch[3].trim()
    if (name) {
      return { name, localId, total }
    }
  }

  // Pattern 3: Standalone number, e.g., "129/103", "129", "023"
  const onlyNumberMatch = normalized.match(/^(\d+)(?:\/(\d+))?$/)
  if (onlyNumberMatch) {
    return {
      name: '',
      localId: onlyNumberMatch[1],
      total: onlyNumberMatch[2] ? parseInt(onlyNumberMatch[2], 10) : undefined,
    }
  }

  return { name: normalized || trimmed }
}
