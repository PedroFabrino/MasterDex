import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog.js"
import { Button } from "../ui/button.js"
import { Badge } from "../ui/badge.js"
import {
  CheckCircle2,
  Database,
  LogOut,
  Mail,
  User,
} from "lucide-react"
import { useTranslation } from "@/i18n"

export interface CollectorProfile {
  id: string
  googleId?: string | null
  email: string
  name: string
  avatarUrl?: string | null
  seededFromSheet?: boolean
}

interface AuthModalProps {
  open: boolean
  onClose: () => void
  currentUser: CollectorProfile | null
  onLogout: () => void
  onSignInWithGoogle?: () => void
  isAuthenticating?: boolean
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  currentUser,
  onLogout,
  onSignInWithGoogle,
  isAuthenticating = false,
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
              {currentUser ? <User className="size-4" /> : <Mail className="size-4" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                {currentUser ? t("auth.profileTitle") : t("auth.signInTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                {currentUser
                  ? t("auth.syncedDesc")
                  : t("auth.connectDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {currentUser ? (
          <div className="space-y-4 pt-2">
            {/* Authenticated User Details */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/60">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="size-12 rounded-full border-2 border-violet-500 object-cover"
                />
              ) : (
                <div className="size-12 rounded-full bg-violet-700 text-white font-bold text-base flex items-center justify-center">
                  {currentUser.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-zinc-100 truncate">{currentUser.name}</h4>
                  <Badge variant="outline" className="border-emerald-700 text-emerald-300 text-[10px]">
                    {t("auth.activeBadge")}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 truncate">{currentUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-zinc-500">
                  <Database className="size-3 text-violet-400" />
                  <span className="truncate">ID: {currentUser.id}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <CheckCircle2 className="size-3.5 text-emerald-400" />
                <span>{t("auth.syncActiveTitle")}</span>
              </div>
              <p>{t("auth.syncActiveDesc")}</p>
            </div>

            <Button
              onClick={() => {
                onLogout()
                onClose()
              }}
              variant="outline"
              size="sm"
              className="w-full border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-red-400 hover:text-red-300 text-xs cursor-pointer"
            >
              <LogOut className="size-3.5 mr-1.5" />
              {t("auth.signOutButton")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-zinc-300 leading-relaxed">
              {t("auth.guestSignInPrompt")}
            </p>
            <Button
              onClick={() => {
                onSignInWithGoogle?.()
                onClose()
              }}
              disabled={isAuthenticating}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-md shadow-violet-950/50 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="size-3.5" viewBox="0 0 24 24">
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
              {t("auth.signInGoogle")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const ProfileModal = AuthModal
