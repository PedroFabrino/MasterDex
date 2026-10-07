import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, RefreshCw, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"
import type { Expansion } from "../../../shared/types.js"

interface ExpansionCardProps {
  expansion: Expansion & { collectionGapYield?: number }
  onViewSecrets: (expansion: Expansion & { collectionGapYield?: number }) => void
  onTriggerScrape: (expansion: Expansion & { collectionGapYield?: number }) => void
  isScraping?: boolean
  isHidden?: boolean
  onToggleHide?: (expansion: Expansion & { collectionGapYield?: number }) => void
}

export function ExpansionCard({
  expansion,
  onViewSecrets,
  onTriggerScrape,
  isScraping = false,
  isHidden = false,
  onToggleHide,
}: ExpansionCardProps) {
  const { t, locale } = useTranslation()

  const formatBRL = (val: number | null | undefined) => {
    if (val == null || isNaN(val) || val <= 0) return "—"
    const numberLocale = locale === "en" ? "en-US" : "pt-BR"
    return new Intl.NumberFormat(numberLocale, { style: "currency", currency: "BRL" }).format(val)
  }

  const gapYield = expansion.collectionGapYield ?? 0
  const score = expansion.investmentScore ?? 0

  const formattedLogoUrl = expansion.logoUrl
    ? expansion.logoUrl.startsWith("https://assets.tcgdex.net") &&
      !/\.(png|webp|jpg|jpeg)$/i.test(expansion.logoUrl)
      ? `${expansion.logoUrl}.png`
      : expansion.logoUrl
    : null

  return (
    <Card
      className={cn(
        "bg-zinc-900/90 border-zinc-800 text-zinc-100 hover:border-zinc-700/80 transition-all duration-200 overflow-hidden flex flex-col justify-between",
        isHidden && "opacity-65 border-dashed border-zinc-700"
      )}
    >
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        {/* Card Header: Set info & Badges */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {formattedLogoUrl && (
                  <img
                    src={formattedLogoUrl}
                    alt=""
                    aria-hidden="true"
                    className="h-5 max-w-[80px] object-contain shrink-0"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                )}
                <h3
                  className="text-base font-bold text-zinc-100 truncate"
                  title={expansion.name}
                >
                  {expansion.name}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {expansion.series && (
                  <span className="truncate">{expansion.series}</span>
                )}
                <span className="font-mono text-[11px] text-zinc-500">
                  {expansion.baseCount} {t("investor.baseCountLabel")} · {expansion.secretCount} {t("investor.secretCountLabel")}
                </span>
              </div>
            </div>

            {/* Score & Hidden Badges */}
            <div className="shrink-0 flex flex-col items-end gap-1">
              {isHidden && (
                <Badge
                  variant="outline"
                  className="border-amber-600/50 bg-amber-950/40 text-amber-300 font-mono text-[10px] py-0 px-1.5"
                >
                  {t("investor.hiddenBadge")}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "font-mono font-bold text-xs px-2 py-0.5 border",
                  score >= 80
                    ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300"
                    : score >= 50
                    ? "border-amber-500/60 bg-amber-950/40 text-amber-300"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-400"
                )}
              >
                {t("investor.scoreLabel")} {score > 0 ? score : "—"}
              </Badge>
            </div>
          </div>

          {/* Collection Gap Yield Badge */}
          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-xs font-semibold">
              <Sparkles className="size-3.5 text-emerald-400" />
              <span>{t("investor.gapsCount", { count: gapYield })}</span>
            </div>
            <span className="text-[11px] text-zinc-500">{t("investor.missingInBinder")}</span>
          </div>
        </div>

        {/* Financial & Set Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs">
          <div>
            <span className="text-zinc-500 text-[11px] block">{t("investor.topChaseLabel")}</span>
            <span className="font-semibold text-amber-400 truncate block font-mono">
              {expansion.chaseCardPrice ? formatBRL(expansion.chaseCardPrice) : "—"}
            </span>
            {expansion.chaseCardName && (
              <span className="text-[10px] text-zinc-400 truncate block" title={expansion.chaseCardName}>
                {expansion.chaseCardName}
              </span>
            )}
          </div>
          <div>
            <span className="text-zinc-500 text-[11px] block">{t("investor.secretPoolLabel")}</span>
            <span className="font-semibold text-violet-300 block font-mono">
              {expansion.totalSecretPoolValue ? formatBRL(expansion.totalSecretPoolValue) : "—"}
            </span>
            <span className="text-[10px] text-zinc-500 block">
              {expansion.secretCount > 0
                ? t("investor.secretCardsCount", { count: expansion.secretCount })
                : t("investor.noData")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewSecrets(expansion)}
            className="flex-1 border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 hover:text-zinc-100 text-zinc-200 text-xs h-8"
          >
            <Eye className="size-3.5" />
            {t("investor.viewSecretsButton")}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onTriggerScrape(expansion)}
            disabled={isScraping}
            className="border-violet-700/60 text-violet-300 bg-violet-950/30 hover:bg-violet-900/50 hover:text-violet-100 text-xs h-8 px-2.5"
            title={t("investor.analyzeMarketTooltip")}
          >
            <RefreshCw className={cn("size-3.5", isScraping && "animate-spin")} />
            <span className="hidden sm:inline">{t("investor.analyzeMarketButton")}</span>
          </Button>

          {onToggleHide && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleHide(expansion)}
              className={cn(
                "border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 text-xs h-8 px-2.5",
                isHidden && "border-emerald-700/60 text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/50"
              )}
              title={isHidden ? t("investor.unhideSetTooltip") : t("investor.hideSetTooltip")}
            >
              {isHidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
