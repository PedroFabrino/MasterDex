import { useState, useEffect, useCallback } from "react"
import { type Pokemon, type TcgCard, type CollectedSlot, TCG_CARDS } from "@/data/pokemon"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, X, Search, Star, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardSelectorModalProps {
  pokemon: Pokemon | null
  slot: CollectedSlot | null
  open: boolean
  onClose: () => void
  onSelectCard: (pokemonId: number, card: TcgCard | null) => void
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
  const [query, setQuery] = useState(pokemon?.name ?? "")
  const [debouncedQuery, setDebouncedQuery] = useState(pokemon?.name ?? "")
  const [liveCards, setLiveCards] = useState<TcgCard[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  // Query live TCGdex card search API
  useEffect(() => {
    if (!open || !debouncedQuery.trim()) {
      setLiveCards(pokemon ? TCG_CARDS[pokemon.id] ?? [] : [])
      return
    }

    let cancelled = false
    setIsLoading(true)

    fetch(`/api/tcg/cards/search?q=${encodeURIComponent(debouncedQuery)}&limit=24`)
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
            isHolo:
              r.rarity?.toLowerCase().includes("holo") ||
              r.rarity?.toLowerCase().includes("rare") ||
              false,
          }))
          setLiveCards(mapped)
        } else {
          // Fallback to local mock cards if no results returned
          setLiveCards(pokemon ? TCG_CARDS[pokemon.id] ?? [] : [])
        }
      })
      .catch(() => {
        if (cancelled) return
        setLiveCards(pokemon ? TCG_CARDS[pokemon.id] ?? [] : [])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, open, pokemon])

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) onClose()
    },
    [onClose]
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
                Remover da Coleção
              </Button>
            )}
          </div>
        </DialogHeader>

        <Separator className="bg-zinc-700/60" />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search card by name or number (e.g. Mew ex 129/103)..."
            className="pl-9 pr-9 bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-zinc-500/30"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-violet-400 animate-spin" />
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
              Select Card Artwork
            </p>
            {liveCards.length > 0 && (
              <span className="text-[11px] text-zinc-500 font-mono">
                {liveCards.length} cards found
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {/* Slot #1 - Default sprite anchor */}
            <button
              onClick={() => {
                onSelectCard(pokemon.id, null)
                onClose()
              }}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer",
                slot?.tcgCard === null
                  ? "border-amber-500 bg-amber-950/30"
                  : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800"
              )}
            >
              <div className="aspect-[2.5/3.5] w-full flex items-center justify-center rounded-lg bg-zinc-700/50">
                <img
                  src={pokemon.spriteUrl}
                  alt={pokemon.name}
                  className="w-16 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
              <span className="text-xs text-zinc-300 text-center leading-tight font-medium">
                Default Sprite
              </span>
              {slot?.tcgCard === null && (
                <CheckCircle className="absolute top-1.5 right-1.5 size-4 text-amber-400" />
              )}
            </button>

            {/* TCG card slots from live TCGdex API */}
            {liveCards.map((card) => {
              const isSelected =
                slot?.tcgCard?.id === card.id || slot?.tcgCard?.imageUrl === card.imageUrl

              return (
                <button
                  key={card.id}
                  onClick={() => {
                    onSelectCard(pokemon.id, card)
                    onClose()
                  }}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all duration-200 cursor-pointer",
                    isSelected
                      ? "border-violet-500 bg-violet-950/30"
                      : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800"
                  )}
                >
                  <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-zinc-950">
                    <img
                      src={card.imageUrl}
                      alt={`${card.name} ${card.number}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const t = e.currentTarget
                        t.src = pokemon.spriteUrl
                        t.style.imageRendering = "pixelated"
                        t.style.objectFit = "contain"
                        t.classList.add("p-2")
                      }}
                    />
                  </div>
                  <div className="w-full text-center space-y-0.5">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs text-zinc-300 font-medium truncate max-w-full">
                        {card.setName}
                      </span>
                      {card.isHolo && (
                        <Star className="size-2.5 text-amber-400 shrink-0 fill-amber-400" />
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">{card.number}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle className="absolute top-1.5 right-1.5 size-4 text-violet-400" />
                  )}
                  {card.isHolo && (
                    <Badge
                      variant="outline"
                      className="absolute top-1.5 left-1.5 text-[9px] px-1 py-0 h-4 border-amber-600/60 text-amber-400 bg-amber-950/50"
                    >
                      HOLO
                    </Badge>
                  )}
                </button>
              )
            })}

            {!isLoading && liveCards.length === 0 && (
              <div className="col-span-3 sm:col-span-4 py-8 text-center text-zinc-500 text-sm">
                No TCG cards found for &ldquo;{debouncedQuery}&rdquo;.
                <br />
                <span className="text-xs text-zinc-600">
                  Try searching with the Pokémon name and collector number (e.g. Mew ex 129/103).
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
