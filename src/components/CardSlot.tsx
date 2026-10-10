import { useRef, useEffect } from "react"
import { type Pokemon, type CollectedSlot, type TcgCard } from "@/data/pokemon"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"

export interface CardSlotProps {
  pokemon: Pokemon
  slot: CollectedSlot | undefined
  onClick: () => void
  isHighlighted?: boolean
}

export function CardSlot({ pokemon, slot, onClick, isHighlighted }: CardSlotProps) {
  const { t } = useTranslation()
  const isCollected = !!slot

  const hasTcgCard = slot?.tcgCard != null
  const slotRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isHighlighted && slotRef.current) {
      slotRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [isHighlighted])

  return (
    <button
      ref={slotRef}
      onClick={onClick}
      aria-label={t("cardSlot.slotAriaLabel", {
        id: pokemon.id,
        name: pokemon.name,
        status: isCollected ? t("common.success") : t("common.emptySlot"),
      })}
      data-highlighted={isHighlighted ? "true" : undefined}
      className={cn(
        "group relative w-full aspect-[2.5/3.5] rounded-xl overflow-hidden transition-all duration-300 cursor-pointer outline-none",
        "focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
        isHighlighted && "ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_25px_rgba(251,191,36,0.7)] animate-pulse z-20 scale-[1.03]",
        !isHighlighted && (
          hasTcgCard
            ? "shadow-lg shadow-black/40"
            : isCollected
            ? "border-2 border-emerald-600/50 bg-zinc-800/80 shadow-md shadow-emerald-950/30"
            : "border border-zinc-700/60 bg-zinc-800/80 hover:border-zinc-500/80 hover:bg-zinc-750"
        )
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

      {/* TCG and Condition badges */}
      {hasTcgCard && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 border-violet-500/60 text-violet-300 bg-zinc-900/80 backdrop-blur-sm whitespace-nowrap"
          >
            {slot?.cardLanguage
              ? slot.cardLanguage.toUpperCase()
              : slot?.tcgCard?.language
              ? slot.tcgCard.language.toUpperCase()
              : t("cardSlot.tcgFallbackBadge")}
          </Badge>

          {slot?.cardCondition && slot.cardCondition !== "NM" && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] px-1 py-0 h-4 font-mono font-bold backdrop-blur-sm whitespace-nowrap",
                slot.cardCondition === "DMG"
                  ? "border-rose-500/70 text-rose-300 bg-rose-950/80"
                  : slot.cardCondition === "HP"
                  ? "border-amber-500/70 text-amber-300 bg-amber-950/80"
                  : slot.cardCondition === "MP"
                  ? "border-yellow-500/70 text-yellow-300 bg-yellow-950/80"
                  : "border-sky-500/70 text-sky-300 bg-sky-950/80"
              )}
            >
              {slot.cardCondition === "DMG"
                ? t("cardSlot.conditionBadgeDmg")
                : slot.cardCondition === "HP"
                ? t("cardSlot.conditionBadgeHp")
                : slot.cardCondition === "MP"
                ? t("cardSlot.conditionBadgeMp")
                : t("cardSlot.conditionBadgeLp")}
            </Badge>
          )}
        </div>
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
