import { useState, useEffect, useCallback, useRef } from "react"
import { type CollectorProfile } from "@/components/auth/AuthModal"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          prompt: (notification?: (notification: any) => void) => void
          renderButton: (parent: HTMLElement, options: any) => void
          cancel: () => void
        }
      }
    }
  }
}

export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "8010736190-ni98j51d06uo3n48kp31ia5atbk9iln5.apps.googleusercontent.com"

export interface UseGoogleAuthOptions {
  onLoginSuccess?: (profile: CollectorProfile, meta?: { seeded: boolean; seededCount: number }) => void
  onError?: (error: string) => void
}

export function useGoogleAuth(options: UseGoogleAuthOptions = {}) {
  const [isGsiLoaded, setIsGsiLoaded] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const optionsRef = useRef(options)
  optionsRef.current = options
  const initializedRef = useRef(false)

  const handleCredentialResponse = useCallback(
    async (response: { credential?: string }) => {
      if (!response.credential) {
        setAuthError("No credential returned by Google")
        optionsRef.current.onError?.("No credential returned by Google")
        return
      }

      setIsAuthenticating(true)
      setAuthError(null)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || `Authentication failed (${res.status})`)
        }

        const data = (await res.json()) as {
          profile: CollectorProfile
          seeded: boolean
          seededCount: number
        }

        optionsRef.current.onLoginSuccess?.(data.profile, {
          seeded: data.seeded,
          seededCount: data.seededCount,
        })
      } catch (err: any) {
        clearTimeout(timeoutId)
        const msg =
          err?.name === "AbortError"
            ? "Tempo limite esgotado ao autenticar. Tente novamente."
            : err?.message || "Failed to authenticate with Google"
        setAuthError(msg)
        optionsRef.current.onError?.(msg)
      } finally {
        setIsAuthenticating(false)
      }
    },
    []
  )

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    const checkAndInit = () => {
      if (typeof window !== "undefined" && window.google?.accounts?.id) {
        if (!initializedRef.current) {
          try {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: handleCredentialResponse,
              auto_select: false,
              cancel_on_tap_outside: true,
            })
            initializedRef.current = true
            setIsGsiLoaded(true)
            if (interval) clearInterval(interval)
            return true
          } catch (e) {
            console.error("[GIS] Init failed:", e)
          }
        } else {
          setIsGsiLoaded(true)
          if (interval) clearInterval(interval)
          return true
        }
      }
      return false
    }

    if (!checkAndInit()) {
      interval = setInterval(() => {
        checkAndInit()
      }, 250)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [handleCredentialResponse])

  const triggerGoogleSignIn = useCallback(() => {
    setAuthError(null)
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("[GIS] Prompt notification:", notification.getNotDisplayedReason?.() || notification.getSkippedReason?.())
          }
        })
      } catch (e: any) {
        setAuthError(e?.message || "Failed to trigger Google prompt")
      }
    } else {
      setAuthError("Google Identity Services script is still loading...")
    }
  }, [])

  const renderGoogleButton = useCallback(
    (element: HTMLElement, customOptions: Record<string, any> = {}) => {
      if (typeof window !== "undefined" && window.google?.accounts?.id && element) {
        window.google.accounts.id.renderButton(element, {
          theme: "filled_blue",
          size: "medium",
          shape: "pill",
          text: "signin_with",
          locale: "en",
          ...customOptions,
        })
      }
    },
    []
  )

  return {
    isGsiLoaded,
    isAuthenticating,
    authError,
    triggerGoogleSignIn,
    renderGoogleButton,
    handleCredentialResponse,
  }
}
