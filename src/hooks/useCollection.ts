import { useState, useEffect, useCallback } from "react"
import { type CollectedSlot, type TcgCard } from "@/data/pokemon"
import { type CollectorProfile } from "@/components/auth/AuthModal"

export interface UseCollectionOptions {
  currentUser: CollectorProfile | null
}

export function useCollection({ currentUser }: UseCollectionOptions) {
  const [collected, setCollected] = useState<Record<number, CollectedSlot>>(() => {
    try {
      const saved = localStorage.getItem("masterdex_collected")
      if (saved) return JSON.parse(saved)
    } catch {
      // Ignore parse errors
    }
    return {}
  })

  // Persist collection updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("masterdex_collected", JSON.stringify(collected))
    } catch {}
  }, [collected])

  // Hydrate collection from backend when logged in
  useEffect(() => {
    const isLoggedOut = typeof window !== "undefined" && localStorage.getItem("masterdex_logged_out") === "true"
    if (isLoggedOut || !currentUser) {
      return
    }

    fetch(`/api/collection?userId=${encodeURIComponent(currentUser.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.items && Object.keys(data.items).length > 0) {
          setCollected((prev) => {
            if (Object.keys(prev).length >= Object.keys(data.items).length) return prev
            const loaded: Record<number, CollectedSlot> = {}
            for (const [idStr, item] of Object.entries<any>(data.items)) {
              const id = Number(idStr)
              if (item.collected) {
                loaded[id] = {
                  pokemonId: id,
                  tcgCard: item.cardId
                    ? {
                        id: item.cardId,
                        name: item.cardName || "",
                        setName: item.cardId.split("-")[0]?.toUpperCase() || "TCG",
                        number: item.cardId.split("-")[1] || "1",
                        imageUrl: item.cardImageUrl || "",
                        language: item.cardLanguage || "en",
                      }
                    : null,
                  cardLanguage: item.cardLanguage || undefined,
                }
              }
            }
            return loaded
          })
        }
      })
      .catch(() => {})
  }, [currentUser?.id])

  const syncSlotToBackend = useCallback(
    (
      pokemonId: number,
      opts: {
        collected: boolean
        cardId?: string | null
        cardName?: string | null
        cardImageUrl?: string | null
        cardLanguage?: string | null
      }
    ) => {
      if (!currentUser) return
      fetch(`/api/collection/${pokemonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          collected: opts.collected,
          cardId: opts.cardId ?? null,
          cardName: opts.cardName ?? null,
          cardImageUrl: opts.cardImageUrl ?? null,
          cardLanguage: opts.cardLanguage ?? null,
        }),
      }).catch(() => {})
    },
    [currentUser]
  )

  const markSlotCollected = useCallback(
    (pokemonId: number) => {
      setCollected((prev) => ({
        ...prev,
        [pokemonId]: { pokemonId, tcgCard: null },
      }))
      syncSlotToBackend(pokemonId, { collected: true })
    },
    [syncSlotToBackend]
  )

  const handleSelectCard = useCallback(
    (pokemonId: number, card: TcgCard | null, cardLanguage?: string) => {
      const finalLang = cardLanguage ?? card?.language ?? "en"
      setCollected((prev) => ({
        ...prev,
        [pokemonId]: { pokemonId, tcgCard: card, cardLanguage: card ? finalLang : undefined },
      }))
      syncSlotToBackend(pokemonId, {
        collected: true,
        cardId: card?.id ?? null,
        cardName: card?.name ?? null,
        cardImageUrl: card?.imageUrl ?? null,
        cardLanguage: card ? finalLang : null,
      })
    },
    [syncSlotToBackend]
  )

  const handleUnmark = useCallback(
    (pokemonId: number) => {
      setCollected((prev) => {
        const next = { ...prev }
        delete next[pokemonId]
        return next
      })
      syncSlotToBackend(pokemonId, { collected: false })
    },
    [syncSlotToBackend]
  )

  return {
    collected,
    setCollected,
    markSlotCollected,
    handleSelectCard,
    handleUnmark,
    syncSlotToBackend,
  }
}
