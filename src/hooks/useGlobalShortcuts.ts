import { useEffect, type RefObject } from "react"

export function useGlobalShortcuts(
  appMode: "binder" | "investor",
  binderSearchInputRef: RefObject<HTMLInputElement | null>
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (appMode === "binder") {
          binderSearchInputRef.current?.focus()
        } else {
          const investorInput = document.querySelector<HTMLInputElement>(
            "input[placeholder*='expansão'], input[placeholder*='expansion'], input[placeholder*='set']"
          )
          investorInput?.focus()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [appMode, binderSearchInputRef])
}
