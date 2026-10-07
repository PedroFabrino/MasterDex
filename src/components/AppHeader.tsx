import React from "react"
import { BookOpen, Sparkles, PanelLeft, TrendingUp, Database, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserMenu } from "@/components/auth/UserMenu"
import { type CollectorProfile } from "@/components/auth/AuthModal"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

interface AppHeaderProps {
  appMode: "binder" | "investor"
  onSetAppMode: (mode: "binder" | "investor") => void
  currentRegionName: string
  totalCollected: number
  totalCards: number
  totalPokemonCount: number
  totalPct: string | number
  onOpenImportModal: () => void
  currentUser: CollectorProfile | null
  onOpenAuthModal: () => void
  onSignInWithGoogle?: () => void
  isAuthenticating?: boolean
  renderGoogleButton?: (el: HTMLElement) => void
  isGsiLoaded?: boolean
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  appMode,
  onSetAppMode,
  currentRegionName,
  totalCollected,
  totalCards,
  totalPokemonCount,
  totalPct,
  onOpenImportModal,
  currentUser,
  onOpenAuthModal,
  onSignInWithGoogle,
  isAuthenticating,
  renderGoogleButton,
  isGsiLoaded,
}) => {
  const { t, locale, toggleLocale } = useTranslation()

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {appMode === "binder" && (
            <SidebarTrigger
              className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              aria-label={t("header.toggleBinderNav")}
            >
              <PanelLeft className="size-4" />
            </SidebarTrigger>
          )}
          <div className="relative size-8 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 to-red-600 shadow-lg shadow-red-950/50" />
            <div className="absolute inset-0 rounded-full border-2 border-zinc-900/60" />
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-900/70 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-zinc-100 border-2 border-zinc-900/50 shadow-sm" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-zinc-100 leading-none">
              {t("common.appName")}
            </h1>
            <p className="text-[11px] text-zinc-500 leading-none mt-0.5">
              {appMode === "binder"
                ? t("header.binderSubtitle", { region: currentRegionName })
                : t("header.investorSubtitle")}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
          <button
            onClick={() => onSetAppMode("binder")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              appMode === "binder"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <BookOpen className="size-3.5" />
            <span className="hidden sm:inline">{t("header.pokeBinder")}</span>
          </button>
          <button
            onClick={() => onSetAppMode("investor")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
              appMode === "investor"
                ? "bg-violet-950/70 border border-violet-800/60 text-violet-200 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <TrendingUp className="size-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{t("header.tcgInvestor")}</span>
          </button>
        </div>

        {/* Stats, Language, Backup & User Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Language Switcher */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLocale}
            className="h-8 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs px-2.5 flex items-center gap-1.5 cursor-pointer font-mono font-semibold"
            title={t("header.switchToLang")}
          >
            <Globe className="size-3.5 text-sky-400" />
            <span>{locale.toUpperCase()}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenImportModal}
            className="h-8 border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 text-xs px-2.5 flex items-center gap-1.5 cursor-pointer"
            title={t("header.backupTooltip")}
          >
            <Database className="size-3.5 text-violet-400" />
            <span className="hidden md:inline">{t("header.backup")}</span>
          </Button>

          {/* Species Progress */}
          <div
            className="hidden sm:flex items-center gap-1.5 bg-zinc-900/80 rounded-lg px-2.5 py-1.5 border border-zinc-800/60"
            title={`Coleção: ${totalCollected}/${totalPokemonCount} Pokémon (${totalPct}%)`}
          >
            <span className="text-xs text-zinc-300 font-medium font-mono">
              {totalCollected}/{totalPokemonCount}
            </span>
          </div>

          {/* Dedicated TCG Card Counter */}
          <div
            className="hidden md:flex items-center gap-1.5 bg-violet-950/40 rounded-lg px-2.5 py-1.5 border border-violet-800/60"
            title={`${totalCards} cartas TCG atribuídas`}
          >
            <Sparkles className="size-3.5 text-amber-400 shrink-0" />
            <span className="text-xs text-violet-200 font-medium">
              {totalCards} Cartas
            </span>
          </div>

          <Badge
            variant="outline"
            className="border-violet-700/60 text-violet-300 bg-violet-950/30 text-xs px-2"
          >
            {totalPct}%
          </Badge>

          {/* User Menu / Sign in with Google */}
          <UserMenu
            currentUser={currentUser}
            onOpenProfileModal={onOpenAuthModal}
            onSignInWithGoogle={onSignInWithGoogle}
            isAuthenticating={isAuthenticating}
            renderGoogleButton={renderGoogleButton}
            isGsiLoaded={isGsiLoaded}
          />
        </div>
      </div>
    </header>
  )
}
