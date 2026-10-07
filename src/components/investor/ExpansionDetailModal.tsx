import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sparkles, Loader2, RefreshCw, ExternalLink, TrendingUp } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { Expansion, Card } from "../../../shared/types.js"

interface ExpansionDetailModalProps {
  expansion: (Expansion & { collectionGapYield?: number }) | null
  open: boolean
  onClose: () => void
  onTriggerScrape?: (expansion: Expansion) => void
}

export function ExpansionDetailModal({
  expansion,
  open,
  onClose,
  onTriggerScrape,
}: ExpansionDetailModalProps) {
  const { t, locale } = useTranslation()
  const [detailData, setDetailData] = useState<{
    secretCards: Card[]
    cards: Card[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open || !expansion) {
      setDetailData(null)
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetch(`/api/tcg/expansions/${encodeURIComponent(expansion.slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load details")
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setDetailData({
          secretCards: data.secretCards || [],
          cards: data.cards || [],
        })
      })
      .catch(() => {
        if (cancelled) return
        setDetailData({ secretCards: [], cards: [] })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, expansion])

  if (!expansion) return null

  const formatBRL = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return "—"
    const numberLocale = locale === "en" ? "en-US" : "pt-BR"
    return new Intl.NumberFormat(numberLocale, { style: "currency", currency: "BRL" }).format(val)
  }

  const cardsToDisplay = detailData?.secretCards && detailData.secretCards.length > 0
    ? detailData.secretCards
    : detailData?.cards || []

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold text-zinc-100">
                  {expansion.name}
                </DialogTitle>
                {expansion.series && (
                  <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-xs">
                    {expansion.series}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 font-mono">
                {t("investor.detailBaseSecretHeader", {
                  base: expansion.baseCount,
                  secret: expansion.secretCount,
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onTriggerScrape && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTriggerScrape(expansion)}
                  className="border-violet-700 text-violet-300 bg-violet-950/40 hover:bg-violet-900/60 hover:text-violet-100 text-xs"
                >
                  <RefreshCw className="size-3.5" />
                  {t("investor.analyzeMarketButton")}
                </Button>
              )}
              {expansion.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-zinc-400 hover:text-zinc-100 text-xs"
                >
                  <a href={expansion.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Investment summary stats banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-xs">
          <div>
            <span className="text-zinc-500 block">{t("investor.sortScore")}</span>
            <span className="font-bold text-sm text-emerald-400 font-mono">
              {expansion.investmentScore > 0 ? `${expansion.investmentScore}/100` : "—"}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t("investor.topChaseLabel")}</span>
            <span className="font-bold text-sm text-amber-400 font-mono">
              {formatBRL(expansion.chaseCardPrice)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t("investor.secretPoolLabel")}</span>
            <span className="font-bold text-sm text-violet-300 font-mono">
              {formatBRL(expansion.totalSecretPoolValue)}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">{t("investor.sortGapYield")}</span>
            <span className="font-bold text-sm text-emerald-300 font-mono">
              {t("investor.gapsCount", { count: expansion.collectionGapYield ?? 0 })}
            </span>
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Secret cards list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-400" />
              {detailData?.secretCards && detailData.secretCards.length > 0
                ? t("investor.secretCardsSectionTitle", { count: detailData.secretCards.length })
                : `${expansion.name} (${cardsToDisplay.length})`}
            </h3>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-zinc-500 gap-2">
              <Loader2 className="size-6 text-violet-400 animate-spin" />
              <span className="text-xs">{t("investor.loadingCards")}</span>
            </div>
          ) : cardsToDisplay.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-3 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
              <TrendingUp className="size-8 mx-auto text-zinc-600" />
              <p className="text-sm">{t("investor.noCardsWithMarketPrice")}</p>
              {onTriggerScrape && (
                <Button
                  size="sm"
                  onClick={() => onTriggerScrape(expansion)}
                  className="bg-violet-600 hover:bg-violet-500 text-zinc-100 text-xs"
                >
                  <RefreshCw className="size-3.5" />
                  {t("investor.analyzeNowButton")}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cardsToDisplay.map((card) => (
                <div
                  key={card.id}
                  className="group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 hover:border-zinc-700 hover:bg-zinc-900 transition-all"
                >
                  <div className="aspect-[2.5/3.5] w-full rounded-lg overflow-hidden bg-zinc-900 mb-2 relative">
                    {card.imageUrl ? (
                      <img
                        src={
                          card.imageUrl.startsWith("https://assets.tcgdex.net") &&
                          !/\.(png|webp|jpg|jpeg)$/i.test(card.imageUrl)
                            ? `${card.imageUrl}/high.webp`
                            : card.imageUrl
                        }
                        alt={card.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                        {t("investor.noImage")}
                      </div>
                    )}
                    {card.isSecret && (
                      <Badge className="absolute top-1.5 left-1.5 bg-amber-500/90 text-zinc-950 font-bold text-[9px] px-1 py-0 h-4">
                        SECRET
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-200 truncate" title={card.name}>
                      {card.name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                      <span>#{card.localId}</span>
                      <span className="truncate max-w-[100px] text-zinc-500" title={card.rarity}>
                        {card.rarity}
                      </span>
                    </div>
                    <div className="pt-1 flex items-center justify-between border-t border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500">{t("investor.marketLabel")}</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {card.marketPrice > 0 ? formatBRL(card.marketPrice) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
