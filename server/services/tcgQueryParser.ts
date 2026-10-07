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

  // Pattern 1: Trailing number or fraction, e.g., "Mew ex 129/103" or "Charizard 4"
  const trailingMatch = trimmed.match(/^(.*?)\s+(\d+)(?:\/(\d+))?$/i)
  if (trailingMatch) {
    const name = trailingMatch[1].trim()
    const localId = trailingMatch[2]
    const total = trailingMatch[3] ? parseInt(trailingMatch[3], 10) : undefined
    if (name) {
      return { name, localId, total }
    }
  }

  // Pattern 2: Leading fraction/number, e.g., "129/103 Mew" or "4 Charizard"
  const leadingMatch = trimmed.match(/^(\d+)(?:\/(\d+))?\s+(.*)$/i)
  if (leadingMatch) {
    const localId = leadingMatch[1]
    const total = leadingMatch[2] ? parseInt(leadingMatch[2], 10) : undefined
    const name = leadingMatch[3].trim()
    if (name) {
      return { name, localId, total }
    }
  }

  // Pattern 3: Standalone number, e.g., "129/103" or "129"
  const onlyNumberMatch = trimmed.match(/^(\d+)(?:\/(\d+))?$/)
  if (onlyNumberMatch) {
    return {
      name: '',
      localId: onlyNumberMatch[1],
      total: onlyNumberMatch[2] ? parseInt(onlyNumberMatch[2], 10) : undefined,
    }
  }

  return { name: trimmed }
}
