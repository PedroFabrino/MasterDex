import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Trash2, X } from "lucide-react"
import { useTranslation } from "@/i18n"
import type { CapturedBinderPage } from "./BinderScannerModal"

interface ScannerQueueStripProps {
  capturedPages: CapturedBinderPage[]
  onRemovePage: (id: string) => void
  onClearQueue: () => void
  onProceed: () => void
}

export const ScannerQueueStrip: React.FC<ScannerQueueStripProps> = ({
  capturedPages,
  onRemovePage,
  onClearQueue,
  onProceed,
}) => {
  const { t } = useTranslation()

  return (
    <div className="pt-2 border-t border-zinc-800/80 min-w-0 w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">
            {t("scanner.scannedPagesCount", { count: capturedPages.length })}
          </span>
          {capturedPages.length > 0 && (
            <Badge variant="outline" className="text-[10px] border-violet-800 text-violet-300">
              {capturedPages.length}
            </Badge>
          )}
        </div>

        {capturedPages.length > 0 && (
          <button
            type="button"
            onClick={onClearQueue}
            className="text-[11px] text-zinc-500 hover:text-red-400 flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="size-3" />
            {t("scanner.clearQueue")}
          </button>
        )}
      </div>

      {capturedPages.length === 0 ? (
        <p className="text-[11px] text-zinc-500 italic py-2 text-center">
          {t("scanner.noPagesScanned")}
        </p>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
          {capturedPages.map((page, idx) => (
            <div
              key={page.id}
              className="relative group shrink-0 size-16 rounded-lg border border-zinc-700 overflow-hidden bg-zinc-900"
            >
              <img src={page.image} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
              <span className="absolute bottom-0.5 left-0.5 bg-black/70 px-1 rounded text-[9px] font-mono text-zinc-200">
                P{idx + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemovePage(page.id)}
                className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title={t("scanner.removePage")}
              >
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {capturedPages.length > 0 && (
        <Button
          type="button"
          onClick={onProceed}
          className="w-full mt-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-1.5"
        >
          <CheckCircle2 className="size-4" />
          {t("scanner.reviewPagesAction", { count: capturedPages.length })}
        </Button>
      )}
    </div>
  )
}
