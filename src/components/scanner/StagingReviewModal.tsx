import React, { useState, useEffect, useCallback, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Sparkles,
  Search,
  X,
  AlertCircle,
  Database,
} from "lucide-react"
import { useTranslation } from "@/i18n"
import { apiClient } from "@/lib/apiClient"
import { type CapturedBinderPage } from "./BinderScannerModal"
import { type ScannedSlotResult, type BinderScanResponse } from "../../../server/services/binderVisionService"
import { POKEMON } from "@/data/pokemon"

interface StagingReviewModalProps {
  open: boolean
  onClose: () => void
  pages: CapturedBinderPage[]
  userId?: string
  sessionToken?: string
  onSyncComplete?: (count: number) => void
}

export const StagingReviewModal: React.FC<StagingReviewModalProps> = ({
  open,
  onClose,
  pages,
  userId,
  sessionToken,
  onSyncComplete,
}) => {
  const { t } = useTranslation()
  const [pageIndex, setPageIndex] = useState(0)
  const [pageResults, setPageResults] = useState<Record<string, ScannedSlotResult[]>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [syncSummary, setSyncSummary] = useState<number | null>(null)
  const [editingSlot, setEditingSlot] = useState<{ slotIndex: number; slot: ScannedSlotResult } | null>(null)
  const [searchFilter, setSearchFilter] = useState("")

  // Scan all captured pages on open
  useEffect(() => {
    if (!open || pages.length === 0) return

    setSyncSummary(null)
    setPageIndex(0)

    const scanAllPages = async () => {
      setIsAnalyzing(true)
      const results: Record<string, ScannedSlotResult[]> = {}

      for (const page of pages) {
        if (pageResults[page.id]) {
          results[page.id] = pageResults[page.id]
          continue
        }
        try {
          const res = await apiClient.post<BinderScanResponse>("/api/binder/scan-page", {
            image: page.image,
            layout: page.layout,
            userId,
          })
          if (res?.slots) {
            results[page.id] = res.slots
          }
        } catch (err) {
          console.error("Scan page error:", err)
          // Default empty slots on error
          const total = page.layout === "2x2" ? 4 : page.layout === "4x3" ? 12 : 9
          results[page.id] = Array.from({ length: total }).map((_, i) => ({
            slotIndex: i,
            pokedexId: null,
            pokemonName: "",
            cardName: "",
            collectorNumber: null,
            setName: null,
            confidence: 0,
            empty: true,
          }))
        }
      }

      setPageResults((prev) => ({ ...prev, ...results }))
      setIsAnalyzing(false)
    }

    scanAllPages()
  }, [open, pages, userId])

  const currentPage = pages[pageIndex]
  const currentSlots = currentPage ? pageResults[currentPage.id] || [] : []

  // Update a slot after editing
  const handleUpdateSlot = (slotIndex: number, updated: Partial<ScannedSlotResult>) => {
    if (!currentPage) return
    setPageResults((prev) => {
      const list = [...(prev[currentPage.id] || [])]
      if (list[slotIndex]) {
        list[slotIndex] = { ...list[slotIndex], ...updated }
      }
      return { ...prev, [currentPage.id]: list }
    })
    setEditingSlot(null)
  }

  // Filtered Pokémon list for species correction
  const filteredSpecies = useMemo(() => {
    if (!searchFilter.trim()) return POKEMON.slice(0, 15)
    const q = searchFilter.toLowerCase().trim()
    return POKEMON.filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q)).slice(0, 15)
  }, [searchFilter])

  // Bulk Save all detected Pokémon
  const handleConfirmAll = useCallback(async () => {
    setIsSaving(true)
    const entries: Array<{
      pokedexId: number
      collected: boolean
      cardId?: string | null
      cardName?: string | null
      cardImageUrl?: string | null
    }> = []

    Object.values(pageResults).forEach((slots) => {
      slots.forEach((s) => {
        if (!s.empty && s.pokedexId) {
          entries.push({
            pokedexId: s.pokedexId,
            collected: true,
            cardId: s.matchedCard?.id || null,
            cardName: s.cardName || s.pokemonName,
            cardImageUrl: s.matchedCard?.imageUrl || null,
          })
        }
      })
    })

    try {
      // 1. Save to local storage for instant sync
      try {
        const stored = localStorage.getItem("masterdex_collected")
        const currentLocal = stored ? JSON.parse(stored) : {}
        entries.forEach((e) => {
          currentLocal[e.pokedexId] = {
            collected: true,
            tcgCard: e.cardId
              ? {
                  id: e.cardId,
                  name: e.cardName || "",
                  imageUrl: e.cardImageUrl || "",
                }
              : undefined,
          }
        })
        localStorage.setItem("masterdex_collected", JSON.stringify(currentLocal))
      } catch {}

      // 2. Bulk sync to backend if user profile exists
      if (userId && userId !== "guest") {
        await apiClient.post(
          "/api/collection/batch",
          { userId, entries },
          {
            headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
          }
        )
      }

      setSyncSummary(entries.length)
      onSyncComplete?.(entries.length)
    } catch (err) {
      console.error("Bulk sync error:", err)
    } finally {
      setIsSaving(false)
    }
  }, [pageResults, userId, sessionToken, onSyncComplete])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-zinc-950 border-zinc-800 text-zinc-100 p-4 sm:p-6 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Sparkles className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-zinc-100">
                  {t("staging.title")}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400">
                  {t("staging.description")}
                </DialogDescription>
              </div>
            </div>

            {/* Page Pager */}
            {pages.length > 1 && (
              <div className="flex items-center gap-1.5 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 text-xs text-zinc-300">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => p - 1)}
                  className="size-6 p-0"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span>{t("staging.pageIndicator", { current: pageIndex + 1, total: pages.length })}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pageIndex === pages.length - 1}
                  onClick={() => setPageIndex((p) => p + 1)}
                  className="size-6 p-0"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        {isAnalyzing ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="size-8 animate-spin text-violet-400" />
            <p className="text-xs font-medium">{t("staging.scanningPages")}</p>
          </div>
        ) : syncSummary !== null ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <div className="size-12 rounded-full bg-emerald-950/60 border border-emerald-600/60 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="size-6" />
            </div>
            <h3 className="text-base font-bold text-zinc-100">
              {t("staging.syncSuccess", { count: syncSummary })}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              {t("staging.slotsUpdated", { count: syncSummary })}
            </p>
            <Button onClick={onClose} size="sm" className="mt-2 bg-violet-600 hover:bg-violet-500 text-xs">
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Visual Staging Grid */}
            <div
              className={`grid gap-2.5 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800 max-h-[55vh] overflow-y-auto ${
                currentPage?.layout === "2x2"
                  ? "grid-cols-2"
                  : currentPage?.layout === "4x3"
                  ? "grid-cols-3 sm:grid-cols-4"
                  : "grid-cols-3"
              }`}
            >
              {currentSlots.map((slot) => (
                <div
                  key={slot.slotIndex}
                  onClick={() => setEditingSlot({ slotIndex: slot.slotIndex, slot })}
                  className={`relative p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                    slot.empty
                      ? "border-dashed border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"
                      : "border-zinc-700 bg-zinc-950/90 hover:border-violet-500 shadow-sm"
                  }`}
                >
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-mono text-zinc-600">
                    #{slot.slotIndex + 1}
                  </span>

                  {slot.empty ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-1">
                      <span className="text-[11px] italic">{t("staging.emptySlot")}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-1 pl-4">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-zinc-100 truncate">
                            {slot.pokemonName || slot.cardName}
                          </h4>
                          {slot.pokedexId && (
                            <span className="text-[10px] text-violet-400 font-mono font-bold">
                              #{String(slot.pokedexId).padStart(3, "0")}
                            </span>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1 py-0 ${
                            slot.confidence >= 0.85
                              ? "border-emerald-700 text-emerald-400"
                              : "border-amber-700 text-amber-400"
                          }`}
                        >
                          {slot.confidence >= 0.85 ? t("staging.highConfidence") : t("staging.lowConfidence")}
                        </Badge>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="font-mono truncate">{slot.collectorNumber || slot.setName || ""}</span>
                        <Edit2 className="size-3 text-zinc-500" />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <Button variant="outline" size="sm" onClick={onClose} className="border-zinc-800 text-xs">
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAll}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
                {t("staging.confirmAllButton")}
              </Button>
            </div>
          </div>
        )}

        {/* Inline Correction Popover / Dialog */}
        {editingSlot && (
          <Dialog open={true} onOpenChange={() => setEditingSlot(null)}>
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
                        handleUpdateSlot(editingSlot.slotIndex, {
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
                      handleUpdateSlot(editingSlot.slotIndex, {
                        empty: true,
                        pokedexId: null,
                        pokemonName: "",
                      })
                    }
                    className="text-red-400 text-xs"
                  >
                    {t("staging.emptySlot")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingSlot(null)} className="text-xs">
                    {t("common.close")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
