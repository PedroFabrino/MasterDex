import { useState, useEffect, useCallback } from "react"
import { POKEMON, type CollectedSlot, type TcgCard } from "@/data/pokemon"
import { type CollectorProfile } from "@/components/auth/AuthModal"
import { mergeCloudAndLocalCollection } from "@/lib/collectionMerge"
import { apiClient } from "@/lib/apiClient"
import { toBatchSyncEntry, toCollectedSlot } from "@/lib/cardMapping"
import type { PortfolioSummary } from "../../shared/types"

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

  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary | null>(null)

  const refreshPortfolio = useCallback(async () => {
    const userId = currentUser?.id || "guest"
    try {
      const data = await apiClient.getPortfolioSummary(userId)
      if (data?.portfolio) {
        setPortfolioSummary(data.portfolio)
      }
    } catch {
      // ignore
    }
  }, [currentUser?.id])

  useEffect(() => {
    refreshPortfolio()
  }, [refreshPortfolio, currentUser?.id])

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

    apiClient
      .getCollection(currentUser.id)
      .then((data) => {
        if (!data?.items) return
        setCollected((prev) => {
          const { merged, slotsToSync } = mergeCloudAndLocalCollection(data.items, prev)
          if (slotsToSync.length > 0 && currentUser.sessionToken) {
            const entries = slotsToSync.map(({ pokemonId, slot }) => toBatchSyncEntry(pokemonId, slot))
            apiClient.batchSyncCollection(currentUser.id, entries, currentUser.sessionToken).catch(() => {})
          }
          return merged
        })
      })
      .catch(() => {})
  }, [currentUser?.id, currentUser?.sessionToken])

  const syncSlotToBackend = useCallback(
    async (
      pokemonId: number,
      opts: {
        collected: boolean
        cardId?: string | null
        cardName?: string | null
        cardImageUrl?: string | null
        cardLanguage?: string | null
        cardCondition?: string | null
      }
    ) => {
      if (!currentUser) return
      let token = currentUser.sessionToken
      if (!token) {
        try {
          const res = await apiClient.getProfile(currentUser.id)
          token = res?.sessionToken
        } catch {}
      }

      apiClient
        .patchSlot(
          pokemonId,
          {
            userId: currentUser.id,
            collected: opts.collected,
            cardId: opts.cardId ?? null,
            cardName: opts.cardName ?? null,
            cardImageUrl: opts.cardImageUrl ?? null,
            cardLanguage: opts.cardLanguage ?? null,
            cardCondition: opts.cardCondition ?? null,
          },
          token
        )
        .then(() => refreshPortfolio())
        .catch(() => {})
    },
    [currentUser, refreshPortfolio]
  )

  const mergeAndSyncUser = useCallback(
    async (profile: CollectorProfile) => {
      try {
        const data = await apiClient.getCollection(profile.id)
        if (!data?.items) return

        let slotsToBatchSync: Array<{ pokemonId: number; slot: CollectedSlot }> = []
        setCollected((prevLocal) => {
          const { merged, slotsToSync } = mergeCloudAndLocalCollection(data.items, prevLocal)
          slotsToBatchSync = slotsToSync
          return merged
        })

        if (slotsToBatchSync.length > 0) {
          const entries = slotsToBatchSync.map(({ pokemonId, slot }) => toBatchSyncEntry(pokemonId, slot))
          await apiClient.batchSyncCollection(profile.id, entries, profile.sessionToken).catch(() => {})
        }
        await refreshPortfolio()
      } catch {}
    },
    [refreshPortfolio]
  )

  const markSlotCollected = useCallback(
    (pokemonId: number) => {
      setCollected((prev) => ({
        ...prev,
        [pokemonId]: toCollectedSlot(pokemonId, null),
      }))
      syncSlotToBackend(pokemonId, { collected: true })
    },
    [syncSlotToBackend]
  )

  const handleSelectCard = useCallback(
    (pokemonId: number, card: TcgCard | null, cardLanguage?: string, cardCondition?: string) => {
      const finalLang = cardLanguage ?? card?.language ?? "en"
      const finalCondition = cardCondition ?? "NM"
      setCollected((prev) => ({
        ...prev,
        [pokemonId]: toCollectedSlot(pokemonId, card, card ? finalLang : undefined, card ? finalCondition : undefined),
      }))
      syncSlotToBackend(pokemonId, {
        collected: true,
        cardId: card?.id ?? null,
        cardName: card?.name ?? null,
        cardImageUrl: card?.imageUrl ?? null,
        cardLanguage: card ? finalLang : null,
        cardCondition: card ? finalCondition : null,
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
  const totalCards = Object.values(collected).filter((s) => s.tcgCard).length
  const totalPct = Math.round((totalCollected / POKEMON.length) * 100)

  return {
    collected,
    setCollected,
    totalCollected,
    totalCards,
    totalPct,
    portfolioSummary,
    refreshPortfolio,
    markSlotCollected,
    handleSelectCard,
    handleUnmark,
    mergeAndSyncUser,
  }
}
