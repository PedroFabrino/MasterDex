import React, { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Key, Save, TrendingUp, CheckCircle2, Loader2 } from "lucide-react"
import { useTranslation } from "@/i18n"
import { apiClient } from "@/lib/apiClient"
import { cn } from "@/lib/utils"
import { LanguagePriorityList } from "./LanguagePriorityList"
import { GeminiApiKeySection } from "./GeminiApiKeySection"

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
  const [maskedApiKey, setMaskedApiKey] = useState<string | null>(null)
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [favoredLanguages, setFavoredLanguages] = useState<string[]>(DEFAULT_LANGUAGES)
  const [valuationPreference, setValuationPreference] = useState<'ligapokemon' | 'tcgplayer'>('ligapokemon')

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
        const localVal = localStorage.getItem("masterdex_valuation_preference")
        if (localVal === "ligapokemon" || localVal === "tcgplayer") {
          setValuationPreference(localVal)
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
          const [settingsRes, prefsRes] = await Promise.all([
            apiClient.get<{
              settings: {
                maskedGeminiApiKey: string | null
                hasGeminiApiKey: boolean
                favoredLanguages: string[]
              }
            }>(`/api/collector/settings?userId=${encodeURIComponent(userId)}`),
            apiClient.getCollectorPreferences(userId),
          ])

          if (settingsRes?.settings) {
            if (settingsRes.settings.favoredLanguages?.length) {
              setFavoredLanguages(settingsRes.settings.favoredLanguages)
              localStorage.setItem(
                "masterdex_favored_languages",
                JSON.stringify(settingsRes.settings.favoredLanguages)
              )
            }
            if (settingsRes.settings.hasGeminiApiKey) {
              setHasSavedKey(true)
              setMaskedApiKey(settingsRes.settings.maskedGeminiApiKey)
            }
          }

          if (prefsRes?.preferences?.valuationPreference) {
            setValuationPreference(prefsRes.preferences.valuationPreference)
            localStorage.setItem(
              "masterdex_valuation_preference",
              prefsRes.preferences.valuationPreference
            )
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
      localStorage.setItem("masterdex_valuation_preference", valuationPreference)
      if (apiKey.trim()) {
        localStorage.setItem("masterdex_gemini_api_key", apiKey.trim())
      } else if (!hasSavedKey) {
        localStorage.removeItem("masterdex_gemini_api_key")
      }

      // Save to server
      if (userId && userId !== "guest") {
        await Promise.all([
          apiClient.patch("/api/collector/settings", {
            userId,
            geminiApiKey: apiKey.trim() ? apiKey.trim() : hasSavedKey ? undefined : null,
            favoredLanguages,
          }),
          apiClient.updateCollectorPreferences({
            userId,
            valuationPreference,
          }),
        ])
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
          <GeminiApiKeySection
            apiKey={apiKey}
            setApiKey={setApiKey}
            hasSavedKey={hasSavedKey}
            maskedApiKey={maskedApiKey}
            isTesting={isTesting}
            testResult={testResult}
            onTestKey={handleTestKey}
            onClearKey={handleClearKey}
            onResetTestResult={() => setTestResult({ status: "idle" })}
          />

          {/* Favored Languages Ordering */}
          <LanguagePriorityList
            favoredLanguages={favoredLanguages}
            onMoveLanguage={handleMoveLanguage}
          />

          {/* Valuation Preference Selection */}
          <div className="space-y-2 rounded-xl bg-zinc-800/40 border border-zinc-800 p-3.5">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="size-3.5 text-amber-400" />
              <label className="text-xs font-semibold text-zinc-200">
                {t("settings.valuationPreferenceTitle")}
              </label>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {t("settings.valuationPreferenceDesc")}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setValuationPreference("ligapokemon")}
                className={cn(
                  "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer",
                  valuationPreference === "ligapokemon"
                    ? "border-amber-500/80 bg-amber-950/30 text-amber-200"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <span className="font-semibold">{t("settings.valuationLigapokemonTitle")}</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">{t("settings.valuationLigapokemonDesc")}</span>
              </button>
              <button
                type="button"
                onClick={() => setValuationPreference("tcgplayer")}
                className={cn(
                  "flex flex-col items-start p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer",
                  valuationPreference === "tcgplayer"
                    ? "border-violet-500/80 bg-violet-950/30 text-violet-200"
                    : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <span className="font-semibold">{t("settings.valuationTcgplayerTitle")}</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">{t("settings.valuationTcgplayerDesc")}</span>
              </button>
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
