import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RefreshCw, Loader2, AlertCircle } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { Expansion } from "../../../shared/types.js"

export interface ScrapeExpansionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expansion: Expansion | null
  url: string
  onUrlChange: (url: string) => void
  onExecuteScrape: () => void
  isScraping: boolean
  feedback: { type: "success" | "error"; message: string } | null
}

export function ScrapeExpansionModal({
  open,
  onOpenChange,
  expansion,
  url,
  onUrlChange,
  onExecuteScrape,
  isScraping,
  feedback,
}: ScrapeExpansionModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-base font-bold flex items-center gap-2">
            <RefreshCw className="size-4 text-violet-400" />
            {t("investor.analyzeMarketTitle", { name: expansion?.name || "" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <p className="text-zinc-400 leading-relaxed">
            {t("investor.scrapeModalDesc")}
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-300">{t("investor.scrapeUrlLabel")}</Label>
            <Input
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={t("investor.scrapeUrlPlaceholder")}
              className="bg-zinc-950 border-zinc-700 text-zinc-100 text-xs"
            />
          </div>

          {feedback && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                feedback.type === "success"
                  ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
                  : "bg-red-950/40 border-red-700/60 text-red-300"
              }`}
            >
              <AlertCircle className="size-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs"
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={onExecuteScrape}
            disabled={isScraping}
            className="bg-violet-600 hover:bg-violet-500 text-zinc-100 text-xs"
          >
            {isScraping && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            {isScraping ? t("investor.extractingPrices") : t("investor.startAnalysis")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
