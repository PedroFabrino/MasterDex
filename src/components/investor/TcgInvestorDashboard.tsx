import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Sparkles, RefreshCw, Loader2 } from "lucide-react"
import { ExpansionCard } from "./ExpansionCard"
import { ExpansionDetailModal } from "./ExpansionDetailModal"
import { ScrapeExpansionModal } from "./ScrapeExpansionModal"
import { HiddenExpansionsTray } from "./HiddenExpansionsTray"
import { InvestorFilterBar } from "./InvestorFilterBar"
import { useTranslation } from "@/i18n"
import type { Expansion } from "../../../shared/types.js"

export interface TcgInvestorDashboardProps {
  userId?: string
}

export function TcgInvestorDashboard({ userId }: TcgInvestorDashboardProps) {
  const { t } = useTranslation()
  const [expansions, setExpansions] = useState<Array<Expansion & { collectionGapYield?: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [rarity, setRarity] = useState<string>("any")
  const [category, setCategory] = useState<string>("booster")
  const [sortBy, setSortBy] = useState<string>("gap_yield")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const [hiddenExpansions, setHiddenExpansions] = useState<string[]>([])

  // Modal states
  const [selectedExpansion, setSelectedExpansion] = useState<(Expansion & { collectionGapYield?: number }) | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Scraping trigger dialog
  const [scrapeTarget, setScrapeTarget] = useState<Expansion | null>(null)
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [scrapeFeedback, setScrapeFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  // Load collector preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      let localRarity = "any"
      let localHidden: string[] = []
      try {
        const stored = localStorage.getItem("masterdex_collector_preferences")
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.targetRarity) localRarity = parsed.targetRarity
          if (Array.isArray(parsed.hiddenExpansions)) localHidden = parsed.hiddenExpansions
        }
      } catch {
        // fallback
      }

      try {
        const userQuery = userId ? `?userId=${encodeURIComponent(userId)}` : ""
        const res = await fetch(`/api/collector/preferences${userQuery}`)
        if (res.ok) {
          const data = await res.json()
          if (data.preferences) {
            const pref = data.preferences
            const finalRarity = pref.targetRarity || localRarity
            const finalHidden = pref.hiddenExpansions?.length ? pref.hiddenExpansions : localHidden
            setRarity(finalRarity)
            setHiddenExpansions(finalHidden)
            setPreferencesLoaded(true)
            return
          }
        }
      } catch (err) {
        console.warn("Could not load preferences from API:", err)
      }

      setRarity(localRarity)
      setHiddenExpansions(localHidden)
      setPreferencesLoaded(true)
    }

    loadPreferences()
  }, [userId])

  // Auto-save target rarity preference
  const handleRarityChange = (newRarity: string) => {
    setRarity(newRarity)
    try {
      const stored = localStorage.getItem("masterdex_collector_preferences")
      const current = stored ? JSON.parse(stored) : {}
      current.targetRarity = newRarity
      localStorage.setItem("masterdex_collector_preferences", JSON.stringify(current))
    } catch {
      // ignore
    }

    fetch("/api/collector/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, targetRarity: newRarity }),
    }).catch((err) => console.warn("Failed to save rarity preference:", err))
  }

  // Fetch expansions from backend API with server-side yield & sorting
  const loadExpansions = useCallback(async () => {
    setIsLoading(true)
    try {
      const userParam = userId ? `&userId=${encodeURIComponent(userId)}` : ""
      const categoryParam = `&category=${encodeURIComponent(category)}`
      const url = `/api/tcg/expansions?rarity=${encodeURIComponent(rarity)}&sort=${encodeURIComponent(sortBy)}${categoryParam}${userParam}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to load expansions")
      const data = await res.json()
      setExpansions(data.expansions || [])
    } catch (err: any) {
      console.error("Error loading expansion catalog:", err)
    } finally {
      setIsLoading(false)
    }
  }, [category, rarity, sortBy, userId])

  useEffect(() => {
    if (preferencesLoaded) {
      loadExpansions()
    }
  }, [loadExpansions, preferencesLoaded])

  // Open secret cards detail modal
  const handleViewSecrets = (exp: Expansion & { collectionGapYield?: number }) => {
    setSelectedExpansion(exp)
    setDetailModalOpen(true)
  }

  // Open scrape dialog
  const handleOpenScrape = (exp: Expansion) => {
    setScrapeTarget(exp)
    setScrapeUrl(exp.url || `https://www.cartasdepokemon.com.br/sv/${exp.slug}`)
    setScrapeFeedback(null)
    setScrapeModalOpen(true)
  }

  // Submit scraping job
  const handleExecuteScrape = async () => {
    if (!scrapeUrl.trim()) return
    setIsScraping(true)
    setScrapeFeedback(null)

    try {
      const res = await fetch("/api/tcg/expansions/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || t("investor.scrapeFailed"))
      }

      setScrapeFeedback({
        type: "success",
        message: t("investor.scrapeSuccess", {
          count: data.secretCount || 0,
          score: data.metrics?.investmentScore || 0,
        }),
      })
      // Reload catalog to refresh rankings
      await loadExpansions()
      setTimeout(() => {
        setScrapeModalOpen(false)
        setScrapeFeedback(null)
      }, 1500)
    } catch (err: any) {
      setScrapeFeedback({
        type: "error",
        message: err.message || t("investor.scrapeFailed"),
      })
    } finally {
      setIsScraping(false)
    }
  }

  // Toggle hiding an individual expansion
  const handleToggleHide = (exp: Expansion & { collectionGapYield?: number }) => {
    const isCurrentlyHidden = hiddenExpansions.includes(exp.id)
    const nextHidden = isCurrentlyHidden
      ? hiddenExpansions.filter((id) => id !== exp.id)
      : [...hiddenExpansions, exp.id]

    setHiddenExpansions(nextHidden)

    try {
      const stored = localStorage.getItem("masterdex_collector_preferences")
      const current = stored ? JSON.parse(stored) : {}
      current.hiddenExpansions = nextHidden
      localStorage.setItem("masterdex_collector_preferences", JSON.stringify(current))
    } catch {
      // ignore
    }

    fetch("/api/collector/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, hiddenExpansions: nextHidden }),
    }).catch((err) => console.warn("Failed to save hidden expansions preference:", err))
  }

  // Unhide all expansions
  const handleUnhideAll = () => {
    setHiddenExpansions([])
    try {
      const stored = localStorage.getItem("masterdex_collector_preferences")
      const current = stored ? JSON.parse(stored) : {}
      current.hiddenExpansions = []
      localStorage.setItem("masterdex_collector_preferences", JSON.stringify(current))
    } catch {
      // ignore
    }

    fetch("/api/collector/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, hiddenExpansions: [] }),
    }).catch((err) => console.warn("Failed to reset hidden expansions:", err))
  }

  // Client search query filter with search bypass for hidden items
  const isSearching = searchQuery.trim().length > 0
  const normalizedQuery = searchQuery.toLowerCase().trim()

  const searchedExpansions = expansions.filter((e) => {
    if (!isSearching) return true
    return e.name.toLowerCase().includes(normalizedQuery) || (e.series && e.series.toLowerCase().includes(normalizedQuery))
  })

  // When searching, all matched expansions are shown in the main grid
  // When not searching, only active (non-hidden) are shown in main grid
  const activeExpansions = isSearching
    ? searchedExpansions
    : expansions.filter((e) => !hiddenExpansions.includes(e.id))

  const hiddenList = expansions.filter((e) => hiddenExpansions.includes(e.id))

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-violet-950/40 border border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="size-5 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight text-zinc-100">
              {t("investor.leaderboardTitle")}
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            {t("investor.leaderboardDesc")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-600/60 bg-emerald-950/40 text-emerald-300 text-xs py-1">
            <Sparkles className="size-3 mr-1" />
            {t("investor.setsCataloged", {
              count: isSearching ? activeExpansions.length : Math.max(0, expansions.length - hiddenList.length),
            })}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExpansions}
            disabled={isLoading}
            className="border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {t("investor.refreshButton")}
          </Button>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <InvestorFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        rarity={rarity}
        onRarityChange={handleRarityChange}
        sortBy={sortBy}
        onSortByChange={setSortBy}
      />

      {/* Leaderboard Cards Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-500">
          <Loader2 className="size-7 text-emerald-400 animate-spin" />
          <span className="text-xs">{t("investor.loadingYields")}</span>
        </div>
      ) : activeExpansions.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-800 space-y-2">
          <p className="text-sm font-semibold text-zinc-400">{t("investor.noExpansionsFound")}</p>
          <p className="text-xs">{t("investor.adjustFilterHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeExpansions.map((expansion) => (
            <ExpansionCard
              key={expansion.id}
              expansion={expansion}
              onViewSecrets={handleViewSecrets}
              onTriggerScrape={handleOpenScrape}
              isHidden={hiddenExpansions.includes(expansion.id)}
              onToggleHide={handleToggleHide}
            />
          ))}
        </div>
      )}

      {/* Hidden Expansions Collapsible Tray */}
      {!isSearching && hiddenList.length > 0 && (
        <HiddenExpansionsTray
          hiddenExpansions={hiddenList}
          onUnhideExpansion={handleToggleHide}
          onUnhideAll={handleUnhideAll}
          onViewSecrets={handleViewSecrets}
          onTriggerScrape={handleOpenScrape}
        />
      )}

      {/* Secret Cards Detail Modal */}
      <ExpansionDetailModal
        expansion={selectedExpansion}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onTriggerScrape={handleOpenScrape}
      />

      {/* Analisar Mercado Scrape Modal */}
      <ScrapeExpansionModal
        open={scrapeModalOpen}
        onOpenChange={setScrapeModalOpen}
        expansion={scrapeTarget}
        url={scrapeUrl}
        onUrlChange={setScrapeUrl}
        onExecuteScrape={handleExecuteScrape}
        isScraping={isScraping}
        feedback={scrapeFeedback}
      />
    </div>
  )
}
