import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Loader2,
  Sparkles,
  Database,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { useTranslation } from "@/i18n"
import { apiClient } from "@/lib/apiClient"
import { type CapturedBinderPage } from "./BinderScannerModal"
import { type ScannedSlotResult, type BinderScanResponse } from "../../../shared/types"
import { SpeciesCorrectionModal } from "./SpeciesCorrectionModal"

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
  const [editingSlot, setEditingSlot] = useState<ScannedSlotResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const scanAllPages = useCallback(async () => {
    setIsAnalyzing(true)
    setScanError(null)
    const results: Record<string, ScannedSlotResult[]> = {}

    for (const page of pages) {
      try {
        let localApiKey: string | undefined = undefined
        try {
          localApiKey = localStorage.getItem("masterdex_gemini_api_key") || undefined
        } catch {}

        const res = await apiClient.post<BinderScanResponse>("/api/binder/scan-page", {
          image: page.image,
          layout: page.layout,
          userId,
          apiKey: localApiKey,
        })
        if (res?.slots) {
          results[page.id] = res.slots
        }
      } catch (err: any) {
        console.error("Scan page error:", err)
        setScanError(err?.message || t("staging.scanFailedPrompt"))
        // Default empty slots on error
        const total =
          page.layout === "2x2"
            ? 4
            : page.layout === "4x3"
              ? 12
              : page.layout === "4x4"
                ? 16
                : 9
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
  }, [pages, userId, t])

  // Scan all captured pages on open
  useEffect(() => {
    if (!open || pages.length === 0) return

    setSyncSummary(null)
    setPageIndex(0)
    scanAllPages()
  }, [open, scanAllPages])

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
      <DialogContent className="sm:max-w-4xl lg:max-w-5xl w-full max-h-[92vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 p-4 sm:p-6">
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
            {scanError && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="size-4 text-amber-400 shrink-0" />
                  <span className="truncate">{scanError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scanAllPages()}
                  className="h-7 px-2.5 text-[11px] border-amber-700 bg-amber-900/40 hover:bg-amber-800 text-amber-100 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="size-3 mr-1" />
                  {t("staging.retryScanAction")}
                </Button>
              </div>
            )}

            {/* Visual Staging Grid */}
            <div
              className={`grid gap-2.5 p-2 bg-zinc-900/60 rounded-xl border border-zinc-800 max-h-[55vh] overflow-y-auto ${
                currentPage?.layout === "2x2"
                  ? "grid-cols-2"
                  : currentPage?.layout === "4x4"
                    ? "grid-cols-2 sm:grid-cols-4"
                    : currentPage?.layout === "4x3"
                      ? "grid-cols-3 sm:grid-cols-4"
                      : "grid-cols-3"
              }`}
            >
              {currentSlots.map((slot) => (
                <div
                  key={slot.slotIndex}
                  onClick={() => setEditingSlot(slot)}
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
        <SpeciesCorrectionModal
          editingSlot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onUpdateSlot={handleUpdateSlot}
        />
      </DialogContent>
    </Dialog>
  )
}
