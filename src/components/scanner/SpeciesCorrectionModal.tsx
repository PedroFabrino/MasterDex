import React, { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { useTranslation } from "@/i18n"
import { POKEMON } from "@/data/pokemon"
import type { ScannedSlotResult } from "../../../shared/types"

interface SpeciesCorrectionModalProps {
  editingSlot: ScannedSlotResult | null
  onClose: () => void
  onUpdateSlot: (slotIndex: number, update: Partial<ScannedSlotResult>) => void
}

export const SpeciesCorrectionModal: React.FC<SpeciesCorrectionModalProps> = ({
  editingSlot,
  onClose,
  onUpdateSlot,
}) => {
  const { t } = useTranslation()
  const [searchFilter, setSearchFilter] = useState("")

  const filteredSpecies = useMemo(() => {
    if (!searchFilter.trim()) return POKEMON.slice(0, 50)
    const q = searchFilter.toLowerCase()
    return POKEMON.filter(
      (p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q)
    ).slice(0, 50)
  }, [searchFilter])

  if (!editingSlot) return null

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">
            {t("staging.correctSpecies")} (#{editingSlot.slotIndex + 1})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="relative">
            <Search className="size-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={t("staging.searchPokemonPlaceholder")}
              className="pl-8 bg-zinc-950 border-zinc-800 text-xs"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredSpecies.map((poke) => (
              <button
                key={poke.id}
                onClick={() =>
                  onUpdateSlot(editingSlot.slotIndex, {
                    pokedexId: poke.id,
                    pokemonName: poke.name,
                    cardName: poke.name,
                    empty: false,
                    confidence: 1.0,
                  })
                }
                className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-800 text-xs text-left cursor-pointer"
              >
                <span className="font-medium text-zinc-200">{poke.name}</span>
                <span className="font-mono text-zinc-500">#{poke.id}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-2 border-t border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onUpdateSlot(editingSlot.slotIndex, {
                  empty: true,
                  pokedexId: null,
                  pokemonName: "",
                })
              }
              className="text-red-400 text-xs"
            >
              {t("staging.emptySlot")}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              {t("common.close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
