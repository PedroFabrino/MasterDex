import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Briefcase, TrendingUp, Sparkles, MapPin, DollarSign } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { PortfolioSummary } from "../../../shared/types.js"

interface PortfolioModalProps {
  open: boolean
  onClose: () => void
  portfolio: PortfolioSummary | null
}

const GEN_COLORS: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-sky-500",
  5: "bg-indigo-500",
  6: "bg-violet-500",
  7: "bg-pink-500",
  8: "bg-teal-500",
  9: "bg-orange-500",
}

export const PortfolioModal: React.FC<PortfolioModalProps> = ({ open, onClose, portfolio }) => {
  const { t, locale } = useTranslation()

  const numberLocale = locale === "en" ? "en-US" : "pt-BR"
  const formatBRL = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "R$ 0,00"
    return new Intl.NumberFormat(numberLocale, { style: "currency", currency: "BRL" }).format(val)
  }

  const formatUSD = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "$0.00"
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
  }

  const totalBrl = portfolio?.totalBrl ?? 0
  const totalUsd = portfolio?.totalUsd ?? 0
  const cardCount = portfolio?.cardCount ?? 0
  const topCards = portfolio?.topCards ?? []
  const regionalDist = (portfolio?.regionalDistribution ?? []).filter((r) => r.cardCount > 0)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
              <Briefcase className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-100">
                {t("portfolio.modalTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {t("portfolio.modalDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Financial Metrics Summary Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500 block">{t("portfolio.totalValueLabel")}</span>
            <span className="font-bold text-base text-emerald-400 font-mono">
              {formatBRL(totalBrl)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t("portfolio.usdEquivalentLabel")}</span>
            <span className="font-bold text-sm text-sky-400 font-mono">
              {formatUSD(totalUsd)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t("portfolio.cardsValuedLabel")}</span>
            <span className="font-bold text-sm text-zinc-200 font-mono">
              {cardCount} {t("portfolio.cardsCountUnit")}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t("portfolio.topCardWorthLabel")}</span>
            <span className="font-bold text-sm text-amber-400 font-mono">
              {topCards.length > 0 ? formatBRL(topCards[0].priceInBrl) : "—"}
            </span>
          </div>
        </div>

        {/* Multi-Market Comparison Box */}
        {portfolio?.comparison && (
          <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800 text-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-emerald-400" />
              <span className="text-zinc-300 font-semibold">{t("portfolio.marketComparisonTitle")}</span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-zinc-500 mr-1.5">{t("portfolio.comparisonLiga")}:</span>
                <span className="font-bold text-amber-300">
                  {formatBRL(portfolio.comparison.ligapokemonBrl)}
                </span>
              </div>
              <Separator orientation="vertical" className="h-4 bg-zinc-700" />
              <div>
                <span className="text-zinc-500 mr-1.5">{t("portfolio.comparisonTcg")}:</span>
                <span className="font-bold text-violet-300">
                  {formatBRL(portfolio.comparison.tcgplayerBrl)}
                </span>
              </div>
            </div>
          </div>
        )}

        {totalBrl === 0 ? (
          <div className="py-12 text-center text-zinc-500 space-y-2 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
            <Briefcase className="size-8 mx-auto text-zinc-600" />
            <p className="text-sm font-semibold text-zinc-400">{t("portfolio.emptyTitle")}</p>
            <p className="text-xs max-w-sm mx-auto">{t("portfolio.emptyDescription")}</p>
          </div>
        ) : (
          <>
            {/* Top 5 Most Valuable Cards */}
            {topCards.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-amber-400" />
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    {t("portfolio.topCardsTitle")}
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {topCards.map((card, idx) => (
                    <div
                      key={`${card.cardId}-${idx}`}
                      className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-xs hover:border-zinc-700 transition-all"
                    >
                      <div className="aspect-[2.5/3.5] w-full rounded bg-zinc-900 mb-1.5 overflow-hidden relative">
                        {card.imageUrl ? (
                          <img
                            src={card.imageUrl}
                            alt={card.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[10px]">
                            #{card.pokedexId}
                          </div>
                        )}
                        <Badge className="absolute top-1 left-1 bg-amber-500/90 text-zinc-950 font-mono text-[9px] px-1 py-0 h-3.5">
                          #{idx + 1}
                        </Badge>
                      </div>
                      <p className="font-semibold text-zinc-200 truncate text-[11px]" title={card.name}>
                        {card.name}
                      </p>
                      <span className="font-bold text-emerald-400 font-mono text-[11px]">
                        {formatBRL(card.priceInBrl)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator className="bg-zinc-800" />

            {/* Regional / Generation Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-sky-400" />
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  {t("portfolio.regionalBreakdownTitle")}
                </h3>
              </div>

              {/* Progress bar visualizer */}
              <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
                {regionalDist.map((item) => (
                  <div
                    key={item.generation}
                    style={{ width: `${item.percentage}%` }}
                    className={`${GEN_COLORS[item.generation] || "bg-zinc-600"} h-full`}
                    title={`${item.regionName} (Gen ${item.generation}): ${item.percentage}%`}
                  />
                ))}
              </div>

              {/* Breakdown list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {regionalDist.map((item) => (
                  <div
                    key={item.generation}
                    className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2.5 rounded-full ${GEN_COLORS[item.generation] || "bg-zinc-600"}`}
                      />
                      <div>
                        <span className="font-semibold text-zinc-200 block text-[11px]">
                          {item.regionName} (Gen {item.generation})
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {item.cardCount} {t("portfolio.cardsCountUnit")} · {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-zinc-300 text-[11px]">
                      {formatBRL(item.totalBrl)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
