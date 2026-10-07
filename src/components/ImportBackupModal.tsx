import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Database,
  Loader2,
} from "lucide-react"
import { type CollectedSlot } from "@/data/pokemon"
import { FileBackupTab } from "./import/FileBackupTab"
import { GoogleSheetsTab } from "./import/GoogleSheetsTab"
import { useTranslation } from "@/i18n"

interface ImportBackupModalProps {
  open: boolean
  onClose: () => void
  collected: Record<number, CollectedSlot>
  onUpdateCollection: (newCollected: Record<number, CollectedSlot>) => void
  userId?: string
}

export const ImportBackupModal: React.FC<ImportBackupModalProps> = ({
  open,
  onClose,
  collected,
  onUpdateCollection,
  userId = "pedro",
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<string>("file")
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleLoadPedroSeed = async () => {
    setLoading(true)
    setStatusMessage(null)
    try {
      const res = await fetch(`/api/collection?userId=pedro`)
      const data = await res.json()
      if (res.ok && data.items) {
        const loaded: Record<number, CollectedSlot> = {}
        for (const [idStr, item] of Object.entries<any>(data.items)) {
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
        setStatusMessage({
          type: "success",
          text: t("backupModal.statusSeedSuccess", { count: data.count }),
        })
      } else {
        setStatusMessage({ type: "error", text: t("backupModal.statusNoCollection") })
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: t("backupModal.statusSeedError", { message: err.message }) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl bg-zinc-900 border-zinc-700 text-zinc-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-violet-400" />
            <DialogTitle className="text-lg font-bold text-zinc-100">
              {t("backupModal.title")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {t("backupModal.description")}
          </DialogDescription>
        </DialogHeader>

        {statusMessage && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-xs font-medium ${
              statusMessage.type === "success"
                ? "bg-emerald-950/70 border border-emerald-800 text-emerald-300"
                : "bg-red-950/70 border border-red-800 text-red-300"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-red-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-zinc-800 border border-zinc-700">
            <TabsTrigger value="file" className="text-xs data-[state=active]:bg-zinc-700">
              <FileCode className="size-3.5 mr-1.5" />
              {t("backupModal.tabFile")}
            </TabsTrigger>
            <TabsTrigger value="sheets" className="text-xs data-[state=active]:bg-zinc-700">
              <FileSpreadsheet className="size-3.5 mr-1.5" />
              {t("backupModal.tabSheets")}
            </TabsTrigger>
            <TabsTrigger value="dev" className="text-xs data-[state=active]:bg-zinc-700">
              <Database className="size-3.5 mr-1.5" />
              {t("backupModal.tabDev")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <FileBackupTab
              userId={userId}
              collected={collected}
              onUpdateCollection={onUpdateCollection}
              setLoading={setLoading}
              loading={loading}
              setStatusMessage={setStatusMessage}
            />
          </TabsContent>

          <TabsContent value="sheets">
            <GoogleSheetsTab
              userId={userId}
              onUpdateCollection={onUpdateCollection}
              setLoading={setLoading}
              loading={loading}
              setStatusMessage={setStatusMessage}
            />
          </TabsContent>

          <TabsContent value="dev" className="space-y-4 pt-3">
            <div className="p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-200">{t("backupModal.devTitle")}</span>
                <Badge variant="outline" className="border-violet-700 text-violet-300 text-[10px]">
                  {t("backupModal.devBadge")}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                {t("backupModal.devDesc")}
              </p>
              <Button
                onClick={handleLoadPedroSeed}
                disabled={loading}
                size="sm"
                className="w-full bg-violet-700 hover:bg-violet-600 text-white text-xs mt-2"
              >
                {loading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Database className="size-3.5 mr-1.5" />}
                {t("backupModal.loadPedroSeedButton")}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
