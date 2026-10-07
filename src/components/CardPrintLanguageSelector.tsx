import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Globe } from "lucide-react"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

export interface CardPrintLanguageSelectorProps {
  selectedLanguage: string
  onSelectLanguage: (lang: string) => void
}

const PRIMARY_LANGUAGES = ["pt", "en", "ja"] as const

const OTHER_LANGUAGES = [
  { code: "ko", labelKey: "cardSelector.langKo" },
  { code: "zh-tw", labelKey: "cardSelector.langZhTw" },
  { code: "zh-cn", labelKey: "cardSelector.langZhCn" },
  { code: "es", labelKey: "cardSelector.langEs" },
  { code: "fr", labelKey: "cardSelector.langFr" },
  { code: "de", labelKey: "cardSelector.langDe" },
  { code: "it", labelKey: "cardSelector.langIt" },
] as const

export function CardPrintLanguageSelector({
  selectedLanguage,
  onSelectLanguage,
}: CardPrintLanguageSelectorProps) {
  const { t } = useTranslation()
  const isOther = !PRIMARY_LANGUAGES.includes(selectedLanguage as any)

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <Globe className="size-3.5 text-zinc-400 shrink-0" />
        <span>{t("cardSelector.printLanguageLabel")}:</span>
      </div>

      {/* Primary quick pills */}
      <div className="flex items-center gap-1">
        {PRIMARY_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage.toLowerCase() === lang
          return (
            <Button
              key={lang}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectLanguage(lang)}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold uppercase tracking-wider transition-all",
                isSelected
                  ? "border-violet-500 bg-violet-950/60 text-violet-200 shadow-sm shadow-violet-900/40"
                  : "border-zinc-700 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              {lang}
            </Button>
          )
        })}
      </div>

      {/* Dropdown for other international releases */}
      <div className="flex items-center">
        <Select
          value={isOther ? selectedLanguage : ""}
          onValueChange={(val) => {
            if (val) onSelectLanguage(val)
          }}
        >
          <SelectTrigger
            className={cn(
              "h-7 text-xs border-zinc-700 min-w-[100px]",
              isOther
                ? "border-violet-500 bg-violet-950/60 text-violet-200"
                : "bg-zinc-800/40 text-zinc-400"
            )}
          >
            <SelectValue placeholder={t("cardSelector.otherLanguages")} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-800 border-zinc-700">
            {OTHER_LANGUAGES.map(({ code, labelKey }) => (
              <SelectItem key={code} value={code} className="text-zinc-200 text-xs">
                {t(labelKey as any)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
