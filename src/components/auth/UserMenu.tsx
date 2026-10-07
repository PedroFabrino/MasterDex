import React, { useRef, useEffect } from "react"
import { Button } from "../ui/button.js"
import { Loader2 } from "lucide-react"
import { type CollectorProfile } from "./AuthModal"
import { useTranslation } from "@/i18n"

interface UserMenuProps {
  currentUser: CollectorProfile | null
  onOpenProfileModal: () => void
  onSignInWithGoogle?: () => void
  isAuthenticating?: boolean
  renderGoogleButton?: (el: HTMLElement) => void
  isGsiLoaded?: boolean
}

export const UserMenu: React.FC<UserMenuProps> = ({
  currentUser,
  onOpenProfileModal,
  onSignInWithGoogle,
  isAuthenticating = false,
  renderGoogleButton,
  isGsiLoaded = false,
}) => {
  const { t } = useTranslation()
  const gsiContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentUser && isGsiLoaded && gsiContainerRef.current && renderGoogleButton) {
      try {
        renderGoogleButton(gsiContainerRef.current)
      } catch {}
    }
  }, [currentUser, isGsiLoaded, renderGoogleButton])

  if (!currentUser) {
    return (
      <div className="flex items-center gap-1.5">
        <div ref={gsiContainerRef} className="empty:hidden min-h-[32px] flex items-center" />
        {(!isGsiLoaded || isAuthenticating) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSignInWithGoogle}
            disabled={isAuthenticating}
            className="h-8 border-zinc-700 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 text-xs px-2.5 flex items-center gap-2 cursor-pointer shadow-sm"
            title={t("auth.signInGoogle")}
          >
            {isAuthenticating ? (
              <Loader2 className="size-3.5 shrink-0 animate-spin text-violet-400" />
            ) : (
              <svg className="size-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="hidden sm:inline">
              {isAuthenticating ? t("auth.connecting") : t("auth.signInGoogle")}
            </span>
            <span className="sm:hidden">{t("auth.signInButtonShort")}</span>
          </Button>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onOpenProfileModal}
      className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 hover:border-violet-500/80 transition-all cursor-pointer group shadow-sm"
      title={`${currentUser.name} (${currentUser.email})`}
    >
      {currentUser.avatarUrl ? (
        <img
          src={currentUser.avatarUrl}
          alt={currentUser.name}
          className="size-6 rounded-full border border-violet-500/80 object-cover"
        />
      ) : (
        <div className="size-6 rounded-full bg-violet-700 text-white font-bold text-xs flex items-center justify-center">
          {currentUser.name.charAt(0)}
        </div>
      )}
      <span className="text-xs font-medium text-zinc-200 group-hover:text-white max-w-[100px] truncate hidden sm:inline">
        {currentUser.name.split(" ")[0]}
      </span>
      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
    </button>
  )
}
