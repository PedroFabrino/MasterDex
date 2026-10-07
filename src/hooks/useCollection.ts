import { useState, useEffect, useCallback } from "react"
import { POKEMON, type CollectedSlot, type TcgCard } from "@/data/pokemon"
import { type CollectorProfile } from "@/components/auth/AuthModal"
import { mergeCloudAndLocalCollection } from "@/lib/collectionMerge"

export interface UseCollectionOptions {
  currentUser: CollectorProfile | null
}

export function useCollection({ currentUser }: UseCollectionOptions) {
  const [collected, setCollected] = useState<Record<number, CollectedSlot>>(() => {
    try {
      const saved = localStorage.getItem("masterdex_collected")
      if (saved) return JSON.parse(saved)
    } catch {}
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
        headers: {
          "Content-Type": "application/json",
          ...(currentUser.sessionToken ? { Authorization: `Bearer ${currentUser.sessionToken}` } : {}),
        },
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

  const mergeAndSyncUser = useCallback(
    async (profile: CollectorProfile) => {
      try {
        const res = await fetch(`/api/collection?userId=${encodeURIComponent(profile.id)}`)
        if (!res.ok) return
        const data = (await res.json()) as any
        if (!data?.items) return

        let slotsToBatchSync: Array<{ pokemonId: number; slot: CollectedSlot }> = []
        setCollected((prevLocal) => {
          const { merged, slotsToSync } = mergeCloudAndLocalCollection(data.items, prevLocal)
          slotsToBatchSync = slotsToSync
          return merged
        })

        if (slotsToBatchSync.length > 0) {
          const entries = slotsToBatchSync.map(({ pokemonId, slot }) => ({
            pokedexId: pokemonId,
            collected: true,
            cardId: slot.tcgCard?.id ?? null,
            cardName: slot.tcgCard?.name ?? null,
            cardImageUrl: slot.tcgCard?.imageUrl ?? null,
            cardLanguage: slot.cardLanguage ?? slot.tcgCard?.language ?? null,
          }))

          await fetch("/api/collection/batch", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(profile.sessionToken ? { Authorization: `Bearer ${profile.sessionToken}` } : {}),
            },
            body: JSON.stringify({
              userId: profile.id,
              entries,
            }),
          }).catch(() => {})
        }
      } catch {}
    },
    []
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

  const totalCollected = POKEMON.filter((p) => collected[p.id]).length
  const totalCards = Object.values(collected).filter((s) => s?.tcgCard != null).length
  const rawPct = (totalCollected / POKEMON.length) * 100
  const totalPct =
    totalCollected === 0 ? "0" : totalCollected === POKEMON.length ? "100" : rawPct.toFixed(1)

  return {
    collected,
    setCollected,
    markSlotCollected,
    handleSelectCard,
    handleUnmark,
    syncSlotToBackend,
    mergeAndSyncUser,
    totalCollected,
    totalCards,
    totalPct,
  }
}
