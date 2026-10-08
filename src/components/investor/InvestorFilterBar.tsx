import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Filter } from "lucide-react"
import { useTranslation } from "@/i18n"

export interface InvestorFilterBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  category: string
  onCategoryChange: (category: string) => void
  rarity: string
  onRarityChange: (rarity: string) => void
  sortBy: string
  onSortByChange: (sortBy: string) => void
  valuationPreference?: 'ligapokemon' | 'tcgplayer'
  onValuationPreferenceChange?: (pref: 'ligapokemon' | 'tcgplayer') => void
}

export function InvestorFilterBar({
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  rarity,
  onRarityChange,
  sortBy,
  onSortByChange,
  valuationPreference,
  onValuationPreferenceChange,
}: InvestorFilterBarProps) {
  const { t } = useTranslation()

  return (
    <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("investor.searchPlaceholder")}
          className="pl-9 bg-zinc-950/60 border-zinc-700 text-zinc-100 text-xs placeholder:text-zinc-500 h-9"
        />
      </div>

      {/* Filters Group */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">{t("investor.categoryLabel")}</span>
          <Select value={category} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-44 h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="booster" className="text-zinc-200 text-xs">{t("investor.categoryBooster")}</SelectItem>
              <SelectItem value="promo" className="text-zinc-200 text-xs">{t("investor.categoryPromo")}</SelectItem>
              <SelectItem value="all" className="text-zinc-200 text-xs">{t("investor.categoryAll")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Rarity Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-zinc-500 shrink-0" />
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">{t("investor.targetRarityLabel")}</span>
          <Select value={rarity} onValueChange={onRarityChange}>
            <SelectTrigger className="w-36 h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs">
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

        {/* Sort By Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400 whitespace-nowrap">{t("investor.sortByLabel")}</span>
          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-40 h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="gap_yield" className="text-zinc-200 text-xs">{t("investor.sortGapYield")}</SelectItem>
              <SelectItem value="score" className="text-zinc-200 text-xs">{t("investor.sortScore")}</SelectItem>
              <SelectItem value="chase" className="text-zinc-200 text-xs">{t("investor.sortChase")}</SelectItem>
              <SelectItem value="pool" className="text-zinc-200 text-xs">{t("investor.sortPool")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Valuation Preference Filter */}
        {onValuationPreferenceChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 whitespace-nowrap">
              {t("investor.valuationPreferenceLabel")}
            </span>
            <Select
              value={valuationPreference || "ligapokemon"}
              onValueChange={(v) => onValuationPreferenceChange(v as "ligapokemon" | "tcgplayer")}
            >
              <SelectTrigger className="w-40 h-9 bg-zinc-950/60 border-zinc-700 text-zinc-200 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="ligapokemon" className="text-zinc-200 text-xs">
                  {t("investor.valuationLigapokemon")}
                </SelectItem>
                <SelectItem value="tcgplayer" className="text-zinc-200 text-xs">
                  {t("investor.valuationTcgplayer")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
