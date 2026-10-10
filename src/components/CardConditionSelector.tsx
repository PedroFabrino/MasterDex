import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, SlidersHorizontal } from "lucide-react"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"
import {
  CARD_CONDITIONS,
  CONDITION_BASELINE_MULTIPLIERS,
  type CardCondition,
} from "../../shared/conditionConfig.js"

export interface CardConditionSelectorProps {
  selectedCondition: CardCondition
  onSelectCondition: (condition: CardCondition) => void
}

export function CardConditionSelector({
  selectedCondition,
  onSelectCondition,
}: CardConditionSelectorProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  const getConditionName = (cond: CardCondition): string => {
    switch (cond) {
      case "NM":
        return t("cardSelector.conditionNm")
      case "LP":
        return t("cardSelector.conditionLp")
      case "MP":
        return t("cardSelector.conditionMp")
      case "HP":
        return t("cardSelector.conditionHp")
      case "DMG":
        return t("cardSelector.conditionDmg")
      default:
        return cond
    }
  }

  const getConditionShortName = (cond: CardCondition): string => {
    switch (cond) {
      case "NM":
        return "NM"
      case "LP":
        return "LP"
      case "MP":
        return "MP"
      case "HP":
        return "HP"
      case "DMG":
        return "DMG"
      default:
        return cond
    }
  }

  return (
    <div className="pt-1 pb-1">
      {/* Collapsed trigger bar */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="h-7 px-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 flex items-center gap-1.5"
        >
          <SlidersHorizontal className="size-3.5 text-zinc-400" />
          <span>
            {t("cardSelector.conditionTrigger", {
              condition: getConditionShortName(selectedCondition),
            })}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 text-zinc-400 transition-transform duration-200",
              isExpanded && "rotate-180"
            )}
          />
        </Button>

        {selectedCondition !== "NM" && (
          <Badge
            variant="outline"
            className="text-[10px] font-mono border-amber-600/60 bg-amber-950/40 text-amber-300 h-5"
          >
            {t("cardSelector.conditionImpact", {
              pct: Math.round(CONDITION_BASELINE_MULTIPLIERS[selectedCondition] * 100),
            })}
          </Badge>
        )}
      </div>

      {/* Expanded options drawer */}
      {isExpanded && (
        <div className="mt-2 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 grid grid-cols-2 sm:grid-cols-5 gap-1.5 animate-in fade-in-50 duration-150">
          {CARD_CONDITIONS.map((cond) => {
            const isSelected = selectedCondition === cond
            const multiplier = CONDITION_BASELINE_MULTIPLIERS[cond] ?? 1.0
            const pct = Math.round(multiplier * 100)

            return (
              <button
                key={cond}
                type="button"
                onClick={() => onSelectCondition(cond)}
                className={cn(
                  "flex flex-col items-start p-2 rounded-md border text-left transition-all cursor-pointer",
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/40 text-emerald-100 shadow-sm shadow-emerald-900/30"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-xs font-mono">{cond}</span>
                  <span className="text-[10px] font-mono opacity-80">{pct}%</span>
                </div>
                <span className="text-[10px] line-clamp-1 mt-0.5 opacity-90">
                  {getConditionName(cond)}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
