import { pricingRepository } from '../repositories/pricingRepository.js'

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD_BRL: 5.4,
  EUR_BRL: 5.8,
}

export class ExchangeRateService {
  private inMemoryRates: Map<string, { rate: number; fetchedAt: number }> = new Map()

  async getRate(pair: string = 'USD_BRL', forceRefresh = false): Promise<number> {
    const now = Date.now()
    const inMem = this.inMemoryRates.get(pair)
    if (!forceRefresh && inMem && now - inMem.fetchedAt < CACHE_TTL_MS) {
      return inMem.rate
    }

    // Check DB repository
    const dbRecord = await pricingRepository.getExchangeRate(pair)
    if (!forceRefresh && dbRecord && now - dbRecord.fetchedAt.getTime() < CACHE_TTL_MS) {
      this.inMemoryRates.set(pair, {
        rate: dbRecord.rate,
        fetchedAt: dbRecord.fetchedAt.getTime(),
      })
      return dbRecord.rate
    }

    // Fetch from AwesomeAPI
    try {
      const apiCode = pair.replace('_', '-') // e.g. USD-BRL
      const res = await fetch(`https://economia.awesomeapi.com.br/last/${apiCode}`, {
        signal: AbortSignal.timeout(4000),
      })

      if (res.ok) {
        const data = (await res.json()) as Record<string, { bid?: string }>
        const key = pair.replace('_', '')
        const rawBid = data[key]?.bid
        if (rawBid) {
          const parsed = parseFloat(rawBid)
          if (!isNaN(parsed) && parsed > 0) {
            await pricingRepository.upsertExchangeRate(pair, parsed)
            this.inMemoryRates.set(pair, { rate: parsed, fetchedAt: now })
            return parsed
          }
        }
      }
    } catch (err: any) {
      console.warn(`[exchangeRateService] Failed to fetch rate for ${pair}:`, err?.message || err)
    }

    // Fallback: return last known db rate if available, else static default
    if (dbRecord && dbRecord.rate > 0) {
      this.inMemoryRates.set(pair, { rate: dbRecord.rate, fetchedAt: now })
      return dbRecord.rate
    }

    const fallback = DEFAULT_FALLBACK_RATES[pair] || 1.0
    return fallback
  }

  async convertToBrl(amount: number, fromCurrency: string): Promise<number> {
    if (!amount || isNaN(amount) || amount <= 0) return 0
    const curr = fromCurrency.toUpperCase()
    if (curr === 'BRL') return Math.round(amount * 100) / 100

    const pair = `${curr}_BRL`
    const rate = await this.getRate(pair)
    return Math.round(amount * rate * 100) / 100
  }

  async getAllRates(): Promise<{ USD_BRL: number; EUR_BRL: number }> {
    const [usd, eur] = await Promise.all([
      this.getRate('USD_BRL'),
      this.getRate('EUR_BRL'),
    ])
    return { USD_BRL: usd, EUR_BRL: eur }
  }
}

export const exchangeRateService = new ExchangeRateService()
