import React from "react"
import { Sparkles } from "lucide-react"
import { useTranslation } from "@/i18n"

export const BinderLegend: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="mt-6 flex flex-wrap items-center gap-4 justify-center text-xs text-zinc-500">
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded border border-zinc-700 bg-zinc-800" />
        <span>{t("common.emptySlot")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded border-2 border-emerald-600/50 bg-zinc-800" />
        <span>{t("common.collectedSprite")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded bg-gradient-to-br from-violet-500 to-pink-500" />
        <span>{t("common.tcgCard")}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3 text-amber-400" />
        <span>{t("common.holoRare")}</span>
      </div>
    </div>
  )
}
