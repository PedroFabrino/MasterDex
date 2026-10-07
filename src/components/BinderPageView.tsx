import React from "react"
import {
  type DexRegion,
  type Pokemon,
  type CollectedSlot,
  getPagePokemon,
} from "@/data/pokemon"
import { CardSlot } from "@/components/CardSlot"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

interface BinderPageViewProps {
  currentPage: number
  totalPages: number
  currentRegion: DexRegion
  pagePokemon: Pokemon[]
  collected: Record<number, CollectedSlot>
  onSlotClick: (pokemon: Pokemon) => void
  onJumpToPage: (page: number) => void
  highlightedPokemonId?: number | null
}

export const BinderPageView: React.FC<BinderPageViewProps> = ({
  currentPage,
  totalPages,
  currentRegion,
  pagePokemon,
  collected,
  onSlotClick,
  onJumpToPage,
  highlightedPokemonId,
}) => {
  const { t } = useTranslation()
  const pageCollectedCount = pagePokemon.filter((p) => collected[p.id]).length
  const pageCardsCount = pagePokemon.filter((p) => collected[p.id]?.tcgCard != null).length
  const progressPct = Math.round((pageCollectedCount / 16) * 100)

  const firstId = pagePokemon[0]?.id ?? 0
  const lastId = pagePokemon[pagePokemon.length - 1]?.id ?? 0
  const firstName = pagePokemon[0]?.name ?? ""
  const lastName = pagePokemon[pagePokemon.length - 1]?.name ?? ""
  const rangeStr = firstName === lastName ? firstName : `${firstName} – ${lastName}`

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
      <div className="bg-zinc-800/60 border-b border-zinc-700/50 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 leading-tight">
              {t("binderPage.pageHeader", {
                page: currentPage,
                region: currentRegion.name,
                range: rangeStr,
              })}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              {firstId === lastId
                ? `#${String(firstId).padStart(3, "0")}`
                : `#${String(firstId).padStart(3, "0")} – #${String(lastId).padStart(3, "0")}`}
            </p>
          </div>
          <div className="flex items-center gap-3 min-w-0 sm:min-w-[200px]">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-zinc-400">
                  {pageCollectedCount}/16 · {pageCardsCount} {pageCardsCount === 1 ? "carta" : "cartas"}
                </span>
                <span
                  className={cn(
                    "text-xs font-bold",
                    progressPct === 100
                      ? "text-emerald-400"
                      : progressPct >= 50
                      ? "text-amber-400"
                      : "text-zinc-400"
                  )}
                >
                  {progressPct}%
                </span>
              </div>
              <Progress
                value={progressPct}
                className="h-1.5 bg-zinc-700/60 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-violet-500 [&>[data-slot=progress-indicator]]:to-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-4 gap-3 sm:gap-3.5">
          {pagePokemon.map((pokemon) => (
            <CardSlot
              key={pokemon.id}
              pokemon={pokemon}
              slot={collected[pokemon.id]}
              isHighlighted={highlightedPokemonId === pokemon.id}
              onClick={() => onSlotClick(pokemon)}
            />
          ))}
          {Array.from({ length: 16 - pagePokemon.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-full aspect-[2.5/3.5] rounded-xl border border-dashed border-zinc-800/60 bg-zinc-900/30 flex items-center justify-center text-zinc-700 select-none"
            />
          ))}
        </div>
      </div>

      <Separator className="bg-zinc-700/40" />

      <div className="px-6 py-4 flex items-center justify-between gap-4 bg-zinc-800/30">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1}
          onClick={() => onJumpToPage(currentPage - 1)}
          className="border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{t("binderPage.previous")}</span>
        </Button>

        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-zinc-500 shrink-0" />
          <Select
            value={String(currentPage)}
            onValueChange={(v) => onJumpToPage(Number(v))}
          >
            <SelectTrigger className="w-28 h-8 bg-zinc-800/60 border-zinc-700 text-zinc-300 text-sm focus:ring-zinc-500/30 focus:border-zinc-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {pageNumbers.map((n) => {
                const pp = getPagePokemon(n)
                const f = pp[0]?.name ?? ""
                return (
                  <SelectItem
                    key={n}
                    value={String(n)}
                    className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-100"
                  >
                    {t("binderPage.pageOption", { page: n, name: f })}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <span className="text-xs text-zinc-500">{t("binderPage.ofTotal", { total: totalPages })}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages}
          onClick={() => onJumpToPage(currentPage + 1)}
          className="border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
        >
          <span className="hidden sm:inline">{t("binderPage.next")}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
