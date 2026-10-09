import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, Edit2, Plus, Image as ImageIcon } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { ScannedSlotResult } from "../../../shared/types"

interface StagingSlotCardProps {
  slot: ScannedSlotResult
  onOpenArtworkSelector: (slot: ScannedSlotResult) => void
  onOpenSpeciesModal: (slot: ScannedSlotResult) => void
}

export const StagingSlotCard: React.FC<StagingSlotCardProps> = ({
  slot,
  onOpenArtworkSelector,
  onOpenSpeciesModal,
}) => {
  const { t } = useTranslation()
  const [imageError, setImageError] = useState(false)

  const fallbackSprite = slot.pokedexId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${slot.pokedexId}.png`
    : null

  const displayImageUrl = !imageError && slot.matchedCard?.imageUrl
    ? slot.matchedCard.imageUrl
    : fallbackSprite

  if (slot.empty) {
    return (
      <div
        onClick={() => onOpenSpeciesModal(slot)}
        className="relative p-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 hover:border-violet-500/60 hover:bg-zinc-900/30 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] text-center group"
      >
        <span className="absolute top-2 left-2 text-[10px] font-mono text-zinc-600">
          #{slot.slotIndex + 1}
        </span>
        <div className="size-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-violet-400 group-hover:border-violet-500/40 transition-colors mb-2">
          <Plus className="size-4" />
        </div>
        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200">
          {t("staging.emptySlot")}
        </span>
        <span className="text-[10px] text-zinc-600 mt-0.5">
          {t("staging.clickToAdd")}
        </span>
      </div>
    )
  }

  return (
    <div className="relative p-3 rounded-xl border border-zinc-800 bg-zinc-950/90 hover:border-zinc-700 transition-all shadow-sm flex flex-col justify-between min-h-[140px] gap-2.5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-zinc-500">
          #{slot.slotIndex + 1}
        </span>
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 ${
            slot.confidence >= 0.85
              ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-400"
              : "border-amber-700/60 bg-amber-950/30 text-amber-400"
          }`}
        >
          {slot.confidence >= 0.85
            ? t("staging.highConfidence")
            : t("staging.lowConfidence")}
        </Badge>
      </div>

      {/* Main card representation: Artwork + Info */}
      <div className="flex items-start gap-2.5 min-w-0">
        {/* Artwork thumbnail */}
        <div
          onClick={() => onOpenArtworkSelector(slot)}
          title={t("staging.changeArtwork")}
          className="relative size-16 sm:size-20 shrink-0 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:border-violet-500 overflow-hidden flex items-center justify-center shadow-md cursor-pointer group"
        >
          {displayImageUrl ? (
            <img
              src={displayImageUrl}
              alt={slot.pokemonName}
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform"
            />
          ) : (
            <ImageIcon className="size-6 text-zinc-600" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
            <Sparkles className="size-4 text-violet-300" />
          </div>
        </div>

        {/* Card info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-baseline gap-1.5">
            {slot.pokedexId && (
              <span className="text-[11px] font-mono font-bold text-violet-400 shrink-0">
                #{String(slot.pokedexId).padStart(3, "0")}
              </span>
            )}
            <h4
              title={slot.matchedCard?.name || slot.pokemonName}
              className="text-xs font-bold text-zinc-100 truncate"
            >
              {slot.matchedCard?.name || slot.pokemonName}
            </h4>
          </div>

          {(slot.collectorNumber || slot.setName || slot.matchedCard?.expansionId) && (
            <p className="text-[10px] text-zinc-400 font-mono truncate">
              {slot.setName ? `${slot.setName} ` : ""}
              {slot.collectorNumber ? `#${slot.collectorNumber}` : ""}
            </p>
          )}

          {slot.matchedCard?.rarity && (
            <span className="inline-block text-[9px] px-1 py-0 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 truncate max-w-full">
              {slot.matchedCard.rarity}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-zinc-800/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenArtworkSelector(slot)}
          className="h-6 px-1.5 text-[10px] bg-violet-950/20 hover:bg-violet-900/40 text-violet-300 border-violet-800/40 hover:border-violet-600 flex items-center justify-center gap-1 cursor-pointer truncate"
        >
          <Sparkles className="size-2.5 shrink-0" />
          <span className="truncate">{t("staging.changeArtwork")}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenSpeciesModal(slot)}
          className="h-6 px-1.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700 flex items-center justify-center gap-1 cursor-pointer truncate"
        >
          <Edit2 className="size-2.5 shrink-0" />
          <span className="truncate">{t("staging.changeSpecies")}</span>
        </Button>
      </div>
    </div>
  )
}
