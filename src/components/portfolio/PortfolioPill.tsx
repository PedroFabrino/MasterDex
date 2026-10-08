import React from "react"
import { Briefcase } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { PortfolioSummary } from "../../../shared/types.js"

interface PortfolioPillProps {
  portfolio: PortfolioSummary | null
  onClick: () => void
}

export const PortfolioPill: React.FC<PortfolioPillProps> = ({ portfolio, onClick }) => {
  const { t, locale } = useTranslation()

  const totalBrl = portfolio?.totalBrl ?? 0
  const numberLocale = locale === "en" ? "en-US" : "pt-BR"
  const formattedWorth = new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: "BRL",
  }).format(totalBrl)

  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/50 hover:border-emerald-700 transition-all text-xs cursor-pointer shadow-sm text-emerald-200 font-mono font-semibold"
      title={t("portfolio.pillTooltip", {
        brl: formattedWorth,
        usd: `$${portfolio?.totalUsd ?? 0}`,
      })}
    >
      <Briefcase className="size-3.5 text-emerald-400 shrink-0" />
      <span>{formattedWorth}</span>
    </button>
  )
}
