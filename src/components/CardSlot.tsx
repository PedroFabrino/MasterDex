import { type Pokemon, type CollectedSlot, type TcgCard } from "@/data/pokemon"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface CardSlotProps {
  pokemon: Pokemon
  slot: CollectedSlot | undefined
  onClick: () => void
}

export function CardSlot({ pokemon, slot, onClick }: CardSlotProps) {
  const isCollected = !!slot
  const hasTcgCard = slot?.tcgCard != null

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden transition-all duration-300 cursor-pointer outline-none",
        "focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
        hasTcgCard
          ? "shadow-lg shadow-black/40"
          : isCollected
          ? "border-2 border-emerald-600/50 bg-zinc-800/80 shadow-md shadow-emerald-950/30"
          : "border border-zinc-700/60 bg-zinc-800/80 hover:border-zinc-500/80 hover:bg-zinc-750"
      )}
    >
      {hasTcgCard ? (
        <TcgCardFace card={slot!.tcgCard!} pokemon={pokemon} />
      ) : (
        <SpriteFace pokemon={pokemon} isCollected={isCollected} />
      )}

      {/* Collected badge */}
      {isCollected && (
        <div className="absolute top-1.5 right-1.5 z-10">
          <CheckCircle
            className={cn(
              "size-4 drop-shadow-lg",
              hasTcgCard ? "text-violet-300" : "text-emerald-400"
            )}
          />
        </div>
      )}

      {/* TCG badge */}
      {hasTcgCard && (
        <Badge
          variant="outline"
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 text-[9px] px-1.5 py-0 h-4 border-violet-500/60 text-violet-300 bg-zinc-900/80 backdrop-blur-sm whitespace-nowrap"
        >
          TCG
        </Badge>
      )}

      {/* Hover overlay for uncollected */}
      {!isCollected && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-zinc-700/30">
          <div className="bg-zinc-900/80 rounded-full p-1.5 backdrop-blur-sm">
            <Plus className="size-4 text-zinc-300" />
          </div>
        </div>
      )}

      {/* Holographic sheen on TCG card hover */}
      {hasTcgCard && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 via-transparent to-purple-500/10 pointer-events-none" />
      )}
    </button>
  )
}

function SpriteFace({ pokemon, isCollected }: { pokemon: Pokemon; isCollected: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between p-2">
      {/* Sleeve rings effect at top */}
      <div className="w-full flex justify-center">
        <span
          className={cn(
            "text-[10px] font-mono font-semibold leading-none",
            isCollected ? "text-emerald-400" : "text-zinc-500"
          )}
        >
          #{String(pokemon.id).padStart(3, "0")}
        </span>
      </div>

      {/* Sprite */}
      <div className="flex-1 flex items-center justify-center">
        <img
          src={pokemon.spriteUrl}
          alt={pokemon.name}
          className={cn(
            "w-[72%] object-contain transition-transform duration-300 group-hover:scale-110",
            isCollected ? "brightness-100" : "brightness-75 group-hover:brightness-90"
          )}
          style={{ imageRendering: "pixelated" }}
          draggable={false}
        />
      </div>

      {/* Name */}
      <span
        className={cn(
          "text-[10px] font-semibold text-center leading-tight truncate max-w-full px-1",
          isCollected ? "text-zinc-200" : "text-zinc-500"
        )}
      >
        {pokemon.name}
      </span>
    </div>
  )
}

function TcgCardFace({ card, pokemon }: { card: TcgCard; pokemon: Pokemon }) {
  return (
    <div className="absolute inset-0">
      <img
        src={card.imageUrl}
        alt={`${card.name} ${card.number}`}
        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-400"
        onError={(e) => {
          const t = e.currentTarget
          t.src = pokemon.spriteUrl
          t.style.imageRendering = "pixelated"
          t.style.objectFit = "contain"
          t.classList.add("p-4")
        }}
        draggable={false}
      />
      {card.isHolo && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-purple-500/20 via-pink-500/10 to-yellow-500/20 mix-blend-screen pointer-events-none" />
      )}
    </div>
  )
}
