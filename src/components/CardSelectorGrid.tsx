import type { RefObject } from "react"
import { type Pokemon, type TcgCard, type CollectedSlot } from "@/data/pokemon"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Star, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/i18n"

export interface CardSelectorGridProps {
  pokemon: Pokemon
  slot: CollectedSlot | null
  liveCards: TcgCard[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  debouncedQuery: string
  onSelectCard: (pokemonId: number, card: TcgCard | null) => void
  onLoadMore: () => void
  sentinelRef: RefObject<HTMLDivElement | null>
}

export function CardSelectorGrid({
  pokemon,
  slot,
  liveCards,
  isLoading,
  isLoadingMore,
  hasMore,
  debouncedQuery,
  onSelectCard,
  onLoadMore,
  sentinelRef,
}: CardSelectorGridProps) {
  const { t } = useTranslation()

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {/* Slot #1 - Default sprite anchor */}
        <button
          onClick={() => onSelectCard(pokemon.id, null)}
          aria-label={t("cardSelector.defaultSpriteAnchorAria")}
          data-testid="default-sprite-anchor"
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
            {t("cardSelector.defaultSprite")}
          </span>
          {slot?.tcgCard === null && (
            <CheckCircle className="absolute top-1.5 right-1.5 size-4 text-amber-400" />
          )}
        </button>

        {/* TCG card slots using low-resolution thumbnail scan for rapid rendering */}
        {liveCards.map((card) => {
          const isSelected =
            slot?.tcgCard?.id === card.id || slot?.tcgCard?.imageUrl === card.imageUrl

          return (
            <button
              key={card.id}
              onClick={() => onSelectCard(pokemon.id, card)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-2 transition-all duration-200 cursor-pointer",
                isSelected
                  ? "border-violet-500 bg-violet-950/30"
                  : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500 hover:bg-zinc-800"
              )}
            >
              <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg bg-zinc-950">
                <img
                  src={card.thumbnailUrl || card.imageUrl}
                  alt={`${card.name} ${card.number}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const tImg = e.currentTarget
                    tImg.src = pokemon.spriteUrl
                    tImg.style.imageRendering = "pixelated"
                    tImg.style.objectFit = "contain"
                    tImg.classList.add("p-2")
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
                  {t("cardSelector.holoBadge")}
                </Badge>
              )}
              {card.language && (
                <Badge
                  variant="outline"
                  className="absolute bottom-1.5 right-1.5 text-[8px] px-1 py-0 h-3.5 border-zinc-600 text-zinc-300 bg-zinc-900/90 font-mono"
                >
                  {card.language.toUpperCase()}
                </Badge>
              )}
            </button>
          )
        })}

        {!isLoading && liveCards.length === 0 && (
          <div className="col-span-3 sm:col-span-4 py-8 text-center text-zinc-500 text-sm">
            {t("cardSelector.noCardsFound", { query: debouncedQuery })}
            <br />
            <span className="text-xs text-zinc-600">
              {t("cardSelector.searchHint")}
            </span>
          </div>
        )}
      </div>

      {/* Bottom sentinel for infinite scrolling / load more button */}
      {hasMore && (
        <div className="mt-4 flex flex-col items-center justify-center gap-2">
          <div ref={sentinelRef} className="h-1 w-full" />
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="text-xs border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-3 mr-1.5 animate-spin" />
                {t("cardSelector.loadingMore")}
              </>
            ) : (
              t("cardSelector.loadMore")
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
