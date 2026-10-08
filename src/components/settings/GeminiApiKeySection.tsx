import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Key, Eye, EyeOff, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react"
import { useTranslation } from "@/i18n"

interface GeminiApiKeySectionProps {
  apiKey: string
  setApiKey: (key: string) => void
  hasSavedKey: boolean
  maskedApiKey: string | null
  isTesting: boolean
  testResult: {
    status: "idle" | "success" | "error"
    message?: string
    count?: number
  }
  onTestKey: () => void
  onClearKey: () => void
  onResetTestResult: () => void
}

export const GeminiApiKeySection: React.FC<GeminiApiKeySectionProps> = ({
  apiKey,
  setApiKey,
  hasSavedKey,
  maskedApiKey,
  isTesting,
  testResult,
  onTestKey,
  onClearKey,
  onResetTestResult,
}) => {
  const { t } = useTranslation()
  const [showApiKey, setShowApiKey] = useState(false)

  return (
    <div className="space-y-2 rounded-xl bg-zinc-800/40 border border-zinc-800 p-3.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
          <Key className="size-3.5 text-violet-400" />
          {t("settings.byokTitle")}
        </label>
        {hasSavedKey && maskedApiKey && (
          <Badge variant="outline" className="text-[10px] border-emerald-700 text-emerald-400">
            {t("settings.keyConfigured", { key: maskedApiKey })}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        {t("settings.byokDescription")}
      </p>

      <div className="flex items-center gap-2 pt-1">
        <div className="relative flex-1">
          <Input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value)
              onResetTestResult()
            }}
            placeholder={hasSavedKey && maskedApiKey ? maskedApiKey : t("settings.apiKeyPlaceholder")}
            className="bg-zinc-950 border-zinc-700 text-xs pr-8 font-mono text-zinc-200 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
            title={showApiKey ? t("settings.hideKey") : t("settings.showKey")}
          >
            {showApiKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>

        {(apiKey || hasSavedKey) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearKey}
            className="border-zinc-700 hover:border-red-600 hover:text-red-400 text-zinc-400 size-9 p-0 cursor-pointer"
            title={t("settings.clearKey")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTestKey}
          disabled={isTesting || !apiKey.trim()}
          className="h-7 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 cursor-pointer"
        >
          {isTesting ? (
            <>
              <Loader2 className="size-3 animate-spin mr-1.5 text-violet-400" />
              {t("settings.testingConnection")}
            </>
          ) : (
            t("settings.testConnection")
          )}
        </Button>

        {testResult.status === "success" && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span>{t("settings.testSuccess", { count: testResult.count ?? 0 })}</span>
          </div>
        )}

        {testResult.status === "error" && (
          <div
            className="flex items-center gap-1.5 text-[11px] text-red-400 max-w-[240px] truncate"
            title={testResult.message}
          >
            <XCircle className="size-3.5 shrink-0" />
            <span className="truncate">
              {t("settings.testFailed", { error: testResult.message ?? "" })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
