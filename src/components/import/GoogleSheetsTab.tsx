import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { type CollectedSlot } from "@/data/pokemon"
import { useTranslation } from "@/i18n"

interface GoogleSheetsTabProps {
  userId?: string | null
  onUpdateCollection: (newCollected: Record<number, CollectedSlot>) => void
  setLoading: (loading: boolean) => void
  loading: boolean
  setStatusMessage: (msg: { type: "success" | "error"; text: string } | null) => void
}


export const GoogleSheetsTab: React.FC<GoogleSheetsTabProps> = ({
  userId,
  onUpdateCollection,
  setLoading,
  loading,
  setStatusMessage,
}) => {
  const { t } = useTranslation()
  const [sheetInput, setSheetInput] = useState("1mQTjp3l8HnHnYUg2bymBgRWY4E9HHP6oWD5tMdrKB6M")
  const [sheetToken, setSheetToken] = useState("")
  const [pastedRows, setPastedRows] = useState("")

  const refreshCollectionFromServer = async () => {
    if (!userId) return
    const colRes = await fetch(`/api/collection?userId=${encodeURIComponent(userId)}`)

    const colData = await colRes.json()
    if (colData.items) {
      const loaded: Record<number, CollectedSlot> = {}
      for (const [idStr, item] of Object.entries<any>(colData.items)) {
        const id = Number(idStr)
        if (item.collected) {
          loaded[id] = {
            pokemonId: id,
            tcgCard: item.cardId
              ? {
                  id: item.cardId,
                  name: item.cardName || "",
                  setName: item.cardId.split("-")[0]?.toUpperCase() || "TCG",
                  number: item.cardId.split("-")[1] || "1",
                  imageUrl: item.cardImageUrl || "",
                }
              : null,
          }
        }
      }
      onUpdateCollection(loaded)
    }
  }

  const handleSeedFromSpreadsheet = async () => {
    if (!sheetInput.trim()) {
      setStatusMessage({ type: "error", text: t("backupModal.noSheetInputError") })
      return
    }

    let spreadsheetId = sheetInput.trim()
    const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
    if (match) spreadsheetId = match[1]

    setLoading(true)
    setStatusMessage(null)
    const effectiveUserId = userId || "guest"
    try {
      const res = await fetch("/api/collection/seed-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: effectiveUserId,
          spreadsheetId,
          accessToken: sheetToken.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        await refreshCollectionFromServer()
        setStatusMessage({
          type: "success",
          text: t("backupModal.sheetsSuccess", { count: data.seededCount }),
        })
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || t("backupModal.fileImportError", { message: "Error" }),
        })
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: t("backupModal.statusSeedError", { message: err.message }) })
    } finally {
      setLoading(false)
    }
  }

  const handleImportPastedRows = async () => {
    if (!pastedRows.trim()) {
      setStatusMessage({ type: "error", text: t("backupModal.noPastedRowsError") })
      return
    }

    setLoading(true)
    setStatusMessage(null)
    const effectiveUserId = userId || "guest"
    try {
      const lines = pastedRows.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
      const rawRows = lines.map((l) => l.split(/[\t,]/).map((p) => p.trim()))

      const res = await fetch("/api/collection/seed-rows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: effectiveUserId, rows: rawRows }),
      })


      const data = await res.json()
      if (res.ok && data.success) {
        await refreshCollectionFromServer()
        setStatusMessage({
          type: "success",
          text: t("backupModal.pastedRowsSuccess", { count: data.seededCount }),
        })
        setPastedRows("")
      } else {
        setStatusMessage({ type: "error", text: data.error || t("backupModal.fileImportError", { message: "Error" }) })
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: t("backupModal.statusSeedError", { message: err.message }) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-3">
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-zinc-300 block mb-1">
            {t("backupModal.sheetUrlLabel")}
          </label>
          <Input
            value={sheetInput}
            onChange={(e) => setSheetInput(e.target.value)}
            placeholder="ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs h-9"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1">
            {t("backupModal.sheetTokenLabel")}
          </label>
          <Input
            value={sheetToken}
            onChange={(e) => setSheetToken(e.target.value)}
            placeholder="Bearer token do Google Drive/Sheets"
            className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs h-9"
            type="password"
          />
        </div>

        <Button
          onClick={handleSeedFromSpreadsheet}
          disabled={loading}
          size="sm"
          className="w-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
        >
          {loading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="size-3.5 mr-1.5" />}
          {t("backupModal.ingestGenButton")}
        </Button>
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
          {t("backupModal.pasteRowsLabel")}
        </label>
        <Textarea
          value={pastedRows}
          onChange={(e) => setPastedRows(e.target.value)}
          placeholder={t("backupModal.pasteRowsPlaceholder")}
          className="bg-zinc-800 border-zinc-700 text-zinc-200 text-xs font-mono h-20 resize-none"
        />
        <Button
          onClick={handleImportPastedRows}
          disabled={loading || !pastedRows.trim()}
          variant="outline"
          size="sm"
          className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
        >
          <FileText className="size-3.5 mr-1.5" />
          {t("backupModal.pasteRowsButton")}
        </Button>
      </div>
    </div>
  )
}
