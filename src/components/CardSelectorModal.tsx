import { useState, useEffect, useCallback, useRef } from "react"
import { type Pokemon, type TcgCard, type CollectedSlot, TCG_CARDS } from "@/data/pokemon"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { X, Search, Filter, Loader2 } from "lucide-react"
import { useTranslation } from "@/i18n"
import { CardSelectorGrid } from "./CardSelectorGrid"
import { CardPrintLanguageSelector } from "./CardPrintLanguageSelector"

interface CardSelectorModalProps {
  pokemon: Pokemon | null
  slot: CollectedSlot | null
  open: boolean
  onClose: () => void
  onSelectCard: (pokemonId: number, card: TcgCard | null, cardLanguage?: string) => void
  onUnmark: (pokemonId: number) => void
}

export function CardSelectorModal({
  pokemon,
  slot,
  open,
  onClose,
  onSelectCard,
  onUnmark,
}: CardSelectorModalProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(pokemon?.name ?? "")
  const [debouncedQuery, setDebouncedQuery] = useState(pokemon?.name ?? "")
  const [rarity, setRarity] = useState<string>("any")
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all")
  const [liveCards, setLiveCards] = useState<TcgCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Initialize or reload target rarity and print language on modal open
  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem("masterdex_collector_preferences")
        if (stored) {
          const pref = JSON.parse(stored)
          if (pref.targetRarity) {
            setRarity(pref.targetRarity)
          }
        }
      } catch {
        // fallback to default
      }

      if (slot?.cardLanguage) {
        setSelectedLanguage(slot.cardLanguage)
      } else if (slot?.tcgCard?.language) {
        setSelectedLanguage(slot.tcgCard.language)
      } else {
        setSelectedLanguage("all")
      }
    }
  }, [open, slot])

  // Reset search query whenever target pokemon changes or modal opens
  useEffect(() => {
    if (open && pokemon) {
      setQuery(pokemon.name)
      setDebouncedQuery(pokemon.name)
    }
  }, [open, pokemon])

  // Debounce input to prevent spamming API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 280)
    return () => clearTimeout(timer)
  }, [query])

  // Detect whether the current query contains a collector number or fraction
  const isCodeQuery = /^(.*?\s+)?\d+(\/\d+)?(\s+.*)?$/.test(debouncedQuery.trim())

  // Query live TCGdex card search API (initial batch)
  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      const fallback = pokemon ? TCG_CARDS[pokemon.id] ?? [] : []
      setLiveCards(fallback)
      setTotalCount(fallback.length)
      setHasMore(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    const dexIdParam = pokemon ? `&dexId=${pokemon.id}` : ""
    const rarityParam = rarity ? `&rarity=${encodeURIComponent(rarity)}` : ""
    const langParam = selectedLanguage ? `&lang=${encodeURIComponent(selectedLanguage)}` : "&lang=all"
    fetch(`/api/tcg/cards/search?q=${encodeURIComponent(debouncedQuery)}${dexIdParam}${rarityParam}${langParam}&limit=24&offset=0`)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed")
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (Array.isArray(data.results) && data.results.length > 0) {
          const mapped: TcgCard[] = data.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            setName: r.set?.name || r.id.split("-")[0]?.toUpperCase() || "TCG",
            number: r.set?.total ? `${r.localId}/${r.set.total}` : String(r.localId),
            imageUrl: r.imageUrl,
            thumbnailUrl: r.thumbnailUrl || r.imageUrl,
            isHolo:
              r.rarity?.toLowerCase().includes("holo") ||
              r.rarity?.toLowerCase().includes("rare") ||
              false,
            language: r.language || "en",
          }))
          setLiveCards(mapped)
          setTotalCount(typeof data.total === "number" ? data.total : mapped.length)
          setHasMore(Boolean(data.hasMore))
        } else {
          // Fallback to local mock cards if no results returned
          const fallback = pokemon ? TCG_CARDS[pokemon.id] ?? [] : []
          setLiveCards(fallback)
          setTotalCount(fallback.length)
          setHasMore(false)
        }
      })
      .catch(() => {
        if (cancelled) return
        const fallback = pokemon ? TCG_CARDS[pokemon.id] ?? [] : []
        setLiveCards(fallback)
        setTotalCount(fallback.length)
        setHasMore(false)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, rarity, selectedLanguage, open, pokemon])

  // Load next batch (lazy loading / pagination)
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !pokemon) return
    setIsLoadingMore(true)
    const dexIdParam = `&dexId=${pokemon.id}`
    const rarityParam = rarity ? `&rarity=${encodeURIComponent(rarity)}` : ""
    const langParam = selectedLanguage ? `&lang=${encodeURIComponent(selectedLanguage)}` : "&lang=all"
    const offset = liveCards.length
    fetch(
      `/api/tcg/cards/search?q=${encodeURIComponent(debouncedQuery)}${dexIdParam}${rarityParam}${langParam}&limit=24&offset=${offset}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.results) && data.results.length > 0) {
          const mapped: TcgCard[] = data.results.map((r: any) => ({
            id: r.id,
            name: r.name,
            setName: r.set?.name || r.id.split("-")[0]?.toUpperCase() || "TCG",
            number: r.set?.total ? `${r.localId}/${r.set.total}` : String(r.localId),
            imageUrl: r.imageUrl,
            thumbnailUrl: r.thumbnailUrl || r.imageUrl,
            isHolo:
              r.rarity?.toLowerCase().includes("holo") ||
              r.rarity?.toLowerCase().includes("rare") ||
              false,
            language: r.language || "en",
          }))
          setLiveCards((prev) => [...prev, ...mapped])
          setHasMore(Boolean(data.hasMore))
        } else {
          setHasMore(false)
        }
      })
      .catch(() => setHasMore(false))
      .finally(() => setIsLoadingMore(false))
  }, [isLoading, isLoadingMore, hasMore, pokemon, debouncedQuery, rarity, selectedLanguage, liveCards.length])

  // Lazy loading observer for bottom sentinel
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading || isLoadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore()
        }
      },
      { rootMargin: "150px" }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoading, isLoadingMore, handleLoadMore])

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onClose()
    },
    [onClose]
  )

  const handleCardPick = useCallback(
    (pokemonId: number, card: TcgCard | null) => {
      const chosenLang = card?.language || (selectedLanguage !== "all" ? selectedLanguage : "en")
      onSelectCard(pokemonId, card, card ? chosenLang : undefined)
      onClose()
    },
    [onSelectCard, selectedLanguage, onClose]
  )

  if (!pokemon) return null

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl bg-zinc-900 border-zinc-700 text-zinc-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 flex items-center justify-center rounded-lg bg-zinc-800 border border-zinc-700">
                <img
                  src={pokemon.spriteUrl}
                  alt={pokemon.name}
                  className="size-10 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <div>
                <DialogTitle className="text-zinc-100 text-xl font-bold">
                  {pokemon.name}
                </DialogTitle>
                <p className="text-zinc-400 text-sm font-mono">
                  #{String(pokemon.id).padStart(3, "0")}
                </p>
              </div>
            </div>
            {slot && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onUnmark(pokemon.id)
                  onClose()
                }}
                className="shrink-0 border-red-800 text-red-400 bg-red-950/40 hover:bg-red-950 hover:text-red-300 hover:border-red-700"
              >
                <X className="size-3.5" />
                {t("cardSelector.removeFromCollection")}
              </Button>
            )}
          </div>
        </DialogHeader>

        <Separator className="bg-zinc-700/60" />

        {/* Search Input & Rarity Filter Header */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
            <Select value={rarity} onValueChange={setRarity}>
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

        {/* Card Print Language Selector */}
        <CardPrintLanguageSelector
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
        />

        {/* Collector Number Bypass Notification */}
        {isCodeQuery && rarity !== "any" && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs">
            <Badge variant="outline" className="border-amber-600/80 text-amber-400 text-[10px] uppercase font-semibold">
              Bypass
            </Badge>
            <span>{t("cardSelector.rarityBypassedHint")}</span>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
              {t("cardSelector.selectCardArtwork")}
            </p>
            {liveCards.length > 0 && (
              <span className="text-[11px] text-zinc-500 font-mono">
                {t("cardSelector.cardsFound", { count: totalCount || liveCards.length })}
              </span>
            )}
          </div>

          <CardSelectorGrid
            pokemon={pokemon}
            slot={slot}
            liveCards={liveCards}
            isLoading={isLoading}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            debouncedQuery={debouncedQuery}
            onSelectCard={handleCardPick}
            onLoadMore={handleLoadMore}
            sentinelRef={sentinelRef}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
