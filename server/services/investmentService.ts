import type { InvestmentMetrics } from '../../shared/types.js'

export interface CardPriceInput {
  localId: number
  marketPrice: number
  isSecret: boolean
}

export class InvestmentService {
  calculateMetrics(baseCount: number, secretCards: CardPriceInput[]): InvestmentMetrics {
    if (baseCount <= 0 || secretCards.length === 0) {
      return {
        chaseCardCeiling: 0,
        avgSecretPrice: 0,
        secretPoolValue: 0,
        secretDensity: 0,
        investmentScore: 0,
      }
    }

    const secretPrices = secretCards.map((c) => Math.max(0, c.marketPrice))
    const chaseCardCeiling = Math.max(...secretPrices, 0)
    const secretPoolValue = secretPrices.reduce((sum, p) => sum + p, 0)
    const avgSecretPrice = secretPoolValue / secretPrices.length
    const secretDensity = secretCards.length / baseCount

    // Component calculations normalized to 100
    // Ceiling: R$ 1000+ maxes out the ceiling score (40% weight)
    const normalizedCeiling = Math.min(100, (chaseCardCeiling / 10)) * 0.40

    // Average price: R$ 150+ average secret price maxes out avg score (40% weight)
    const normalizedAvg = Math.min(100, (avgSecretPrice / 1.5)) * 0.40

    // Density: ratio of 0.5 (50% secrets vs base, e.g. 42/84) maxes out density score (20% weight)
    const normalizedDensity = Math.min(100, secretDensity * 200) * 0.20

    const rawScore = normalizedCeiling + normalizedAvg + normalizedDensity
    const investmentScore = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10))

    return {
      chaseCardCeiling: Math.round(chaseCardCeiling * 100) / 100,
      avgSecretPrice: Math.round(avgSecretPrice * 100) / 100,
      secretPoolValue: Math.round(secretPoolValue * 100) / 100,
      secretDensity: Math.round(secretDensity * 1000) / 1000,
      investmentScore,
    }
  }
}

export const investmentService = new InvestmentService()
