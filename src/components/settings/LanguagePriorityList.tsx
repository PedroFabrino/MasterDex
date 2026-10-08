import React from "react"
import { Button } from "@/components/ui/button"
import { Languages, ArrowUp, ArrowDown } from "lucide-react"
import { useTranslation } from "@/i18n"

interface LanguagePriorityListProps {
  favoredLanguages: string[]
  onMoveLanguage: (index: number, direction: "up" | "down") => void
}

export const LanguagePriorityList: React.FC<LanguagePriorityListProps> = ({
  favoredLanguages,
  onMoveLanguage,
}) => {
  const { t } = useTranslation()

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case "pt":
        return t("settings.langPt")
      case "en":
        return t("settings.langEn")
      case "ja":
        return t("settings.langJa")
      default:
        return lang.toUpperCase()
    }
  }

  return (
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
              <span className="font-medium text-zinc-200">{getLanguageLabel(lang)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => onMoveLanguage(index, "up")}
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
                onClick={() => onMoveLanguage(index, "down")}
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
  )
}
