import { useState, useEffect, useCallback, useRef } from "react"
import { type Pokemon, type TcgCard, type CollectedSlot, TCG_CARDS } from "@/data/pokemon"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"
import { useTranslation } from "@/i18n"
import { apiClient } from "@/lib/apiClient"
import { mapSearchResultToTcgCard } from "@/lib/cardMapping"
import { CardSelectorGrid } from "./CardSelectorGrid"
import { CardPrintLanguageSelector } from "./CardPrintLanguageSelector"
import { CardConditionSelector } from "./CardConditionSelector"
import { CardSelectorSearch } from "./CardSelectorSearch"
import { normalizeCardCondition, type CardCondition } from "../../shared/conditionConfig.js"

interface CardSelectorModalProps {
  pokemon: Pokemon | null
  slot: CollectedSlot | null
  open: boolean
  onClose: () => void
  onSelectCard: (
    pokemonId: number,
    card: TcgCard | null,
    cardLanguage?: string,
    cardCondition?: string
  ) => void
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
  const [selectedCondition, setSelectedCondition] = useState<CardCondition>("NM")
  const [liveCards, setLiveCards] = useState<TcgCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      try {
        const stored = localStorage.getItem("masterdex_collector_preferences")
        if (stored) {
          const pref = JSON.parse(stored)
          if (pref.targetRarity) setRarity(pref.targetRarity)
        }
      } catch {}

      if (slot?.cardLanguage) {
        setSelectedLanguage(slot.cardLanguage)
      } else if (slot?.tcgCard?.language) {
        setSelectedLanguage(slot.tcgCard.language)
      } else {
        setSelectedLanguage("all")
      }

      if (slot?.cardCondition) {
        setSelectedCondition(normalizeCardCondition(slot.cardCondition))
      } else {
        setSelectedCondition("NM")
      }
    }
  }, [open, slot])

  useEffect(() => {
    if (open && pokemon) {
      setQuery(pokemon.name)
      setDebouncedQuery(pokemon.name)
    }
  }, [open, pokemon])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 280)
    return () => clearTimeout(timer)
  }, [query])

  const isCodeQuery = /^(.*?\s+)?\d+(\/\d+)?(\s+.*)?$/.test(debouncedQuery.trim())

  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      const fallback = pokemon ? TCG_CARDS[pokemon.id] ?? [] : []
      setLiveCards(fallback)
      setTotalCount(fallback.length)
      setHasMore(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)

    apiClient
      .searchCards(
        {
          query: debouncedQuery,
          dexId: pokemon?.id,
          rarity,
          lang: selectedLanguage,
          limit: 24,
          offset: 0,
        },
        controller.signal
      )
      .then((data) => {
        if (data.results?.length > 0) {
          const mapped = data.results.map(mapSearchResultToTcgCard)
          setLiveCards(mapped)
          setTotalCount(data.total ?? mapped.length)
          setHasMore(Boolean(data.hasMore))
        } else {
          const fallback = pokemon ? TCG_CARDS[pokemon.id] ?? [] : []
          setLiveCards(fallback)
          setTotalCount(fallback.length)
          setHasMore(false)
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return
        const fallback = pokemon ? TCG_CARDS[pokemon.id] ?? [] : []
        setLiveCards(fallback)
        setTotalCount(fallback.length)
        setHasMore(false)
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery, rarity, selectedLanguage, open, pokemon])

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !pokemon) return
    setIsLoadingMore(true)

    apiClient
      .searchCards({
        query: debouncedQuery,
        dexId: pokemon.id,
        rarity,
        lang: selectedLanguage,
        limit: 24,
        offset: liveCards.length,
      })
      .then((data) => {
        if (data.results?.length > 0) {
          const mapped = data.results.map(mapSearchResultToTcgCard)
          setLiveCards((prev) => [...prev, ...mapped])
          setHasMore(Boolean(data.hasMore))
        } else {
          setHasMore(false)
        }
      })
      .catch(() => setHasMore(false))
      .finally(() => setIsLoadingMore(false))
  }, [isLoading, isLoadingMore, hasMore, pokemon, debouncedQuery, rarity, selectedLanguage, liveCards.length])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || isLoading || isLoadingMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) handleLoadMore()
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
      onSelectCard(
        pokemonId,
        card,
        card ? chosenLang : undefined,
        card ? selectedCondition : undefined
      )
      onClose()
    },
    [onSelectCard, selectedLanguage, selectedCondition, onClose]
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
                <DialogTitle className="text-zinc-100 text-xl font-bold">{pokemon.name}</DialogTitle>
                <p className="text-zinc-400 text-sm font-mono">#{String(pokemon.id).padStart(3, "0")}</p>
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

        <CardSelectorSearch
          query={query}
          onQueryChange={setQuery}
          isLoading={isLoading}
          rarity={rarity}
          onRarityChange={setRarity}
          isCodeQuery={isCodeQuery}
        />

        <CardPrintLanguageSelector
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
        />

        <CardConditionSelector
          selectedCondition={selectedCondition}
          onSelectCondition={setSelectedCondition}
        />

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
