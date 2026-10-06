import { useState, useCallback } from "react"
import { type Pokemon, type TcgCard, type CollectedSlot, TCG_CARDS } from "@/data/pokemon"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, X, Search, Star } from "lucide-react"
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

  const cards = pokemon ? (TCG_CARDS[pokemon.id] ?? []) : []
  const filtered = cards.filter(
    (c) =>
      query.trim() === "" ||
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.setName.toLowerCase().includes(query.toLowerCase()) ||
      c.number.toLowerCase().includes(query.toLowerCase())
  )

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
            placeholder="Search card set, number..."
            className="pl-9 bg-zinc-800/60 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-zinc-500/30"
          />
        </div>

        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
            Select Card Artwork
          </p>
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
              <span className="text-xs text-zinc-400 text-center leading-tight font-medium">
                Default Sprite
              </span>
              {slot?.tcgCard === null && (
                <CheckCircle className="absolute top-1.5 right-1.5 size-4 text-amber-400" />
              )}
            </button>

            {/* TCG card slots */}
            {filtered.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  onSelectCard(pokemon.id, card)
                  onClose()
                }}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all duration-200 cursor-pointer",
                  slot?.tcgCard?.id === card.id
                    ? "border-violet-500 bg-violet-950/30"
                    : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800"
                )}
              >
                <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg">
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
                {slot?.tcgCard?.id === card.id && (
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
            ))}

            {filtered.length === 0 && cards.length > 0 && (
              <div className="col-span-4 py-6 text-center text-zinc-500 text-sm">
                No cards match your search.
              </div>
            )}

            {cards.length === 0 && (
              <div className="col-span-4 py-6 text-center text-zinc-500 text-sm">
                No TCG cards in mock data for this Pokémon.
                <br />
                <span className="text-xs text-zinc-600">
                  Only the default sprite is available.
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
