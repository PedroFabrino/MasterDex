import React, { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload, Loader2 } from "lucide-react"
import { POKEMON, type CollectedSlot } from "@/data/pokemon"
import { apiClient } from "@/lib/apiClient"
import {
  mapCollectionItemsToRecord,
  toTcgCard,
  toBatchSyncEntry,
  toCollectedSlot,
} from "@/lib/cardMapping"
import { useTranslation } from "@/i18n"

interface FileBackupTabProps {
  userId?: string | null
  collected: Record<number, CollectedSlot>
  onUpdateCollection: (newCollected: Record<number, CollectedSlot>) => void
  setLoading: (loading: boolean) => void
  loading: boolean
  setStatusMessage: (msg: { type: "success" | "error"; text: string } | null) => void
}


export const FileBackupTab: React.FC<FileBackupTabProps> = ({
  userId,
  collected,
  onUpdateCollection,
  setLoading,
  loading,
  setStatusMessage,
}) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportJson = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      userId,
      totalCollected: Object.keys(collected).length,
      collection: collected,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `masterdex-collection-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMessage({ type: "success", text: t("backupModal.exportSuccess", { count: Object.keys(collected).length }) })
  }

  const handleExportCsv = () => {
    const header = "Pokedex,Name,Collected,CardId,CardName,CardImageUrl\n"
    const lines = POKEMON.map((p) => {
      const slot = collected[p.id]
      const isCollected = !!slot
      const cardId = slot?.tcgCard?.id ? `"${slot.tcgCard.id.replace(/"/g, '""')}"` : ""
      const cardName = slot?.tcgCard?.name ? `"${slot.tcgCard.name.replace(/"/g, '""')}"` : ""
      const cardImg = slot?.tcgCard?.imageUrl ? `"${slot.tcgCard.imageUrl.replace(/"/g, '""')}"` : ""
      return `#${String(p.id).padStart(4, "0")},"${p.name}",${isCollected ? "TRUE" : "FALSE"},${cardId},${cardName},${cardImg}`
    })
    const csvContent = header + lines.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `masterdex-collection-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setStatusMessage({ type: "success", text: t("backupModal.exportSuccess", { count: Object.keys(collected).length }) })
  }


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStatusMessage(null)
    const reader = new FileReader()

    reader.onload = async (evt) => {
      const content = evt.target?.result as string
      try {
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(content)
          const rawCollection = parsed.collection || parsed
          const nextCollected = mapCollectionItemsToRecord(rawCollection)
          const syncEntries = Object.entries(nextCollected).map(([dexId, slot]) =>
            toBatchSyncEntry(Number(dexId), slot)
          )

          onUpdateCollection(nextCollected)
          if (userId) {
            await apiClient.batchSyncCollection(userId, syncEntries).catch(() => {})
          }

          setStatusMessage({
            type: "success",
            text: t("backupModal.fileImportSuccess", { count: Object.keys(nextCollected).length }),
          })
        } else {
          const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
          const nextCollected: Record<number, CollectedSlot> = { ...collected }
          const syncEntries: ReturnType<typeof toBatchSyncEntry>[] = []

          for (const line of lines) {
            const parts = line.split(",").map((p) => p.replace(/^"|"$/g, "").trim())
            if (!parts[0]) continue
            const dexId = parseInt(parts[0].replace(/[#\s]/g, ""), 10)
            if (isNaN(dexId) || dexId <= 0) continue

            const isColl = parts[2]?.toUpperCase() === "TRUE" || parts[2] === "1"
            if (isColl) {
              const card = parts[3]
                ? toTcgCard({
                    id: parts[3],
                    name: parts[4] || "",
                    imageUrl: parts[5] || "",
                  })
                : null

              const slot = toCollectedSlot(dexId, card)
              nextCollected[dexId] = slot
              syncEntries.push(toBatchSyncEntry(dexId, slot))
            }
          }

          onUpdateCollection(nextCollected)
          if (userId) {
            await apiClient.batchSyncCollection(userId, syncEntries).catch(() => {})
          }

          setStatusMessage({
            type: "success",
            text: t("backupModal.fileImportSuccess", { count: syncEntries.length }),
          })
        }
      } catch (err: any) {
        setStatusMessage({ type: "error", text: t("backupModal.fileImportError", { message: err.message }) })
      } finally {
        setLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    reader.readAsText(file)
  }

  return (
    <div className="space-y-4 pt-3">
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {t("backupModal.exportTitle")}
        </h4>
        <div className="flex gap-2">
          <Button
            onClick={handleExportJson}
            variant="outline"
            size="sm"
            className="flex-1 border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200"
          >
            <Download className="size-3.5 mr-1.5 text-violet-400" />
            {t("backupModal.exportJson")}
          </Button>
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            className="flex-1 border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200"
          >
            <Download className="size-3.5 mr-1.5 text-emerald-400" />
            {t("backupModal.exportCsv")}
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {t("backupModal.importTitle")}
        </h4>
        <p className="text-xs text-zinc-400">
          {t("backupModal.importDesc")}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileUpload}
          className="hidden"
          id="file-upload-input"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          variant="default"
          size="sm"
          className="w-full bg-violet-600 hover:bg-violet-500 text-white"
        >
          {loading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
          {t("backupModal.importTitle")} (.json / .csv)
        </Button>
      </div>
    </div>
  )
}
