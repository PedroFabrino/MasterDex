import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EyeOff, ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { ExpansionCard } from "./ExpansionCard"
import { useTranslation } from "@/i18n"
import type { Expansion } from "../../../shared/types.js"

export interface HiddenExpansionsTrayProps {
  hiddenExpansions: Array<Expansion & { collectionGapYield?: number }>
  onUnhideExpansion: (expansion: Expansion & { collectionGapYield?: number }) => void
  onUnhideAll?: () => void
  onViewSecrets: (expansion: Expansion & { collectionGapYield?: number }) => void
  onTriggerScrape: (expansion: Expansion & { collectionGapYield?: number }) => void
}

export function HiddenExpansionsTray({
  hiddenExpansions,
  onUnhideExpansion,
  onUnhideAll,
  onViewSecrets,
  onTriggerScrape,
}: HiddenExpansionsTrayProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)

  if (hiddenExpansions.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-4 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <EyeOff className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-200">
                {t("investor.hiddenTrayTitle")}
              </h3>
              <Badge variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-400 font-mono text-[11px] py-0">
                {t("investor.hiddenCount", { count: hiddenExpansions.length })}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {t("investor.hiddenTrayDesc")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onUnhideAll && hiddenExpansions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onUnhideAll}
              className="border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs h-8"
            >
              <RotateCcw className="size-3 mr-1" />
              {t("investor.unhideAllButton")}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs h-8"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="size-3.5 mr-1" />
                {t("investor.toggleHiddenTrayHide")}
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5 mr-1" />
                {t("investor.toggleHiddenTrayShow")}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Grid */}
      {isExpanded && (
        <div className="pt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-zinc-800/80">
          {hiddenExpansions.map((expansion) => (
            <ExpansionCard
              key={expansion.id}
              expansion={expansion}
              onViewSecrets={onViewSecrets}
              onTriggerScrape={onTriggerScrape}
              isHidden={true}
              onToggleHide={onUnhideExpansion}
            />
          ))}
        </div>
      )}
    </div>
  )
}
