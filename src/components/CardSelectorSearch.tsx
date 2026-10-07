import { Search, Filter, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "@/i18n"

interface CardSelectorSearchProps {
  query: string
  onQueryChange: (val: string) => void
  isLoading: boolean
  rarity: string
  onRarityChange: (val: string) => void
  isCodeQuery: boolean
}

export function CardSelectorSearch({
  query,
  onQueryChange,
  isLoading,
  rarity,
  onRarityChange,
  isCodeQuery,
}: CardSelectorSearchProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("cardSelector.searchPlaceholder")}
            className="pl-9 pr-9 bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-zinc-500/30"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-violet-400 animate-spin" />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="size-3.5 text-zinc-400 shrink-0" />
          <span className="text-xs text-zinc-400 whitespace-nowrap">{t("cardSelector.rarityFilter")}:</span>
          <Select value={rarity} onValueChange={onRarityChange}>
            <SelectTrigger className="w-36 h-9 bg-zinc-800/80 border-zinc-700 text-zinc-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="any" className="text-zinc-200 text-xs">{t("investor.rarityAny")}</SelectItem>
              <SelectItem value="holo" className="text-zinc-200 text-xs">{t("investor.rarityHolo")}</SelectItem>
              <SelectItem value="ultra" className="text-zinc-200 text-xs">{t("investor.rarityUltra")}</SelectItem>
              <SelectItem value="illustration" className="text-zinc-200 text-xs">{t("investor.rarityIllustration")}</SelectItem>
              <SelectItem value="secret" className="text-zinc-200 text-xs">{t("investor.raritySecret")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isCodeQuery && rarity !== "any" && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
          <Badge variant="outline" className="border-amber-600/80 text-amber-400 text-[10px] uppercase font-semibold">
            Bypass
          </Badge>
          <span>{t("cardSelector.rarityBypassedHint")}</span>
        </div>
      )}
    </div>
  )
}
