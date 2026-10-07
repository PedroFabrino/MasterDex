import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Languages,
  Trash2,
  Save,
} from "lucide-react"
import { useTranslation } from "@/i18n"
import { apiClient } from "@/lib/apiClient"

interface CollectorSettingsModalProps {
  open: boolean
  onClose: () => void
  userId?: string
}

const DEFAULT_LANGUAGES = ["pt", "en", "ja"]

export const CollectorSettingsModal: React.FC<CollectorSettingsModalProps> = ({
  open,
  onClose,
  userId,
}) => {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [maskedApiKey, setMaskedApiKey] = useState<string | null>(null)
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [favoredLanguages, setFavoredLanguages] = useState<string[]>(DEFAULT_LANGUAGES)

  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    status: "idle" | "success" | "error"
    message?: string
    count?: number
  }>({ status: "idle" })

  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Load settings on open
  useEffect(() => {
    if (!open) return

    setSavedSuccess(false)
    setTestResult({ status: "idle" })

    const loadSettings = async () => {
      // 1. Check local storage first
      try {
        const localLangs = localStorage.getItem("masterdex_favored_languages")
        if (localLangs) {
          const parsed = JSON.parse(localLangs)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavoredLanguages(parsed)
          }
        }
        const localKey = localStorage.getItem("masterdex_gemini_api_key")
        if (localKey) {
          setApiKey(localKey)
          setHasSavedKey(true)
          setMaskedApiKey(
            localKey.length > 8 ? `${localKey.slice(0, 6)}...${localKey.slice(-4)}` : "****"
          )
        }
      } catch {}

      // 2. If authenticated user, fetch from backend
      if (userId && userId !== "guest") {
        try {
          const res = await apiClient.get<{
            settings: {
              maskedGeminiApiKey: string | null
              hasGeminiApiKey: boolean
              favoredLanguages: string[]
            }
          }>(`/api/collector/settings?userId=${encodeURIComponent(userId)}`)

          if (res?.settings) {
            if (res.settings.favoredLanguages?.length) {
              setFavoredLanguages(res.settings.favoredLanguages)
              localStorage.setItem(
                "masterdex_favored_languages",
                JSON.stringify(res.settings.favoredLanguages)
              )
            }
            if (res.settings.hasGeminiApiKey) {
              setHasSavedKey(true)
              setMaskedApiKey(res.settings.maskedGeminiApiKey)
            }
          }
        } catch {}
      }
    }

    loadSettings()
  }, [open, userId])

  const handleTestKey = useCallback(async () => {
    const keyToTest = apiKey.trim()
    if (!keyToTest) return

    setIsTesting(true)
    setTestResult({ status: "idle" })

    try {
      const res = await apiClient.post<{
        valid: boolean
        modelCount?: number
        error?: string
      }>("/api/collector/settings/test-key", { apiKey: keyToTest })

      if (res.valid) {
        setTestResult({
          status: "success",
          count: res.modelCount ?? 0,
        })
      } else {
        setTestResult({
          status: "error",
          message: res.error || "Validation failed",
        })
      }
    } catch (err: any) {
      setTestResult({
        status: "error",
        message: err?.message || "Connection error",
      })
    } finally {
      setIsTesting(false)
    }
  }, [apiKey])

  const handleMoveLanguage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= favoredLanguages.length) return

    const updated = [...favoredLanguages]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setFavoredLanguages(updated)
  }

  const handleClearKey = () => {
    setApiKey("")
    setHasSavedKey(false)
    setMaskedApiKey(null)
    setTestResult({ status: "idle" })
    try {
      localStorage.removeItem("masterdex_gemini_api_key")
    } catch {}
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSavedSuccess(false)

    try {
      // Save locally
      localStorage.setItem("masterdex_favored_languages", JSON.stringify(favoredLanguages))
      if (apiKey.trim()) {
        localStorage.setItem("masterdex_gemini_api_key", apiKey.trim())
      } else if (!hasSavedKey) {
        localStorage.removeItem("masterdex_gemini_api_key")
      }

      // Save to server
      if (userId && userId !== "guest") {
        await apiClient.patch("/api/collector/settings", {
          userId,
          geminiApiKey: apiKey.trim() ? apiKey.trim() : hasSavedKey ? undefined : null,
          favoredLanguages,
        })
      }

      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        onClose()
      }, 900)
    } catch (err) {
      console.error("Failed to save settings", err)
    } finally {
      setIsSaving(false)
    }
  }

  const getLanguageLabel = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "pt":
        return t("settings.langPt")
      case "ja":
        return t("settings.langJa")
      case "en":
      default:
        return t("settings.langEn")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
              <Key className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                {t("settings.title")}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {t("settings.description")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Gemini API Key BYOK Section */}
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
                    setTestResult({ status: "idle" })
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
                  onClick={handleClearKey}
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
                onClick={handleTestKey}
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
                <div className="flex items-center gap-1.5 text-[11px] text-red-400 max-w-[240px] truncate" title={testResult.message}>
                  <XCircle className="size-3.5 shrink-0" />
                  <span className="truncate">{t("settings.testFailed", { error: testResult.message ?? "" })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Favored Languages Ordering */}
          <div className="space-y-2 rounded-xl bg-zinc-800/40 border border-zinc-800 p-3.5">
            <div className="flex items-center gap-1.5">
              <Languages className="size-3.5 text-sky-400" />
              <label className="text-xs font-semibold text-zinc-200">
                {t("settings.favoredLanguagesTitle")}
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {t("settings.favoredLanguagesDesc")}
            </p>

            <div className="space-y-1.5 pt-1">
              {favoredLanguages.map((lang, index) => (
                <div
                  key={lang}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-zinc-500 font-bold w-4">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-zinc-200">
                      {getLanguageLabel(lang)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => handleMoveLanguage(index, "up")}
                      className="size-6 p-0 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
                      title={t("settings.moveUp")}
                    >
                      <ArrowUp className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === favoredLanguages.length - 1}
                      onClick={() => handleMoveLanguage(index, "down")}
                      className="size-6 p-0 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 cursor-pointer"
                      title={t("settings.moveDown")}
                    >
                      <ArrowDown className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="border-zinc-700 text-zinc-300 text-xs cursor-pointer"
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs cursor-pointer shadow-md shadow-violet-950/50 flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  {t("settings.savingSettings")}
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="size-3 text-emerald-300" />
                  {t("settings.settingsSaved")}
                </>
              ) : (
                <>
                  <Save className="size-3" />
                  {t("settings.saveSettings")}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
