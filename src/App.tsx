import { useState, useEffect, useCallback, useRef } from "react"
import {
  POKEMON,
  DEX_REGIONS,
  getPagePokemon,
  getTotalPages,
  getRegionForPage,
  type Pokemon,
} from "@/data/pokemon"
import { CardSelectorModal } from "@/components/CardSelectorModal"
import { BinderSidebar } from "@/components/BinderSidebar"
import { BinderPageView } from "@/components/BinderPageView"
import { BinderSearchBar } from "@/components/BinderSearchBar"
import { ImportBackupModal } from "@/components/ImportBackupModal"
import { AuthModal, type CollectorProfile } from "@/components/auth/AuthModal"
import { AppHeader } from "@/components/AppHeader"
import { BinderLegend } from "@/components/BinderLegend"
import { TcgInvestorDashboard } from "@/components/investor/TcgInvestorDashboard"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { useCollection } from "@/hooks/useCollection"
import { mergeCloudAndLocalCollection } from "@/lib/collectionMerge"

export function App() {
  const [appMode, setAppMode] = useState<"binder" | "investor">(() => {
    if (typeof window !== "undefined" && window.location.hash === "#investor") {
      return "investor"
    }
    return "binder"
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRegionId, setSelectedRegionId] = useState<string>("kanto")
  const [currentUser, setCurrentUser] = useState<CollectorProfile | null>(() => {
    try {
      const saved = localStorage.getItem("masterdex_user")
      if (saved) return JSON.parse(saved)
    } catch {}
    return null
  })

  const {
    collected,
    setCollected,
    markSlotCollected,
    handleSelectCard,
    handleUnmark,
  } = useCollection({ currentUser })

  const [modalPokemon, setModalPokemon] = useState<Pokemon | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [highlightedPokemonId, setHighlightedPokemonId] = useState<number | null>(null)

  const binderSearchInputRef = useRef<HTMLInputElement>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Context-aware Ctrl+K shortcut
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
  }, [appMode])

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  // Persist mode to hash
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.location.hash = appMode === "investor" ? "investor" : "binder"
    }
  }, [appMode])

  // Persist current user to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("masterdex_user", JSON.stringify(currentUser))
    } else {
      localStorage.removeItem("masterdex_user")
    }
  }, [currentUser])

  const handleLogout = useCallback(() => {
    try {
      localStorage.setItem("masterdex_logged_out", "true")
      localStorage.removeItem("masterdex_user")
      localStorage.removeItem("masterdex_collected")
    } catch {}
    setCurrentUser(null)
    setCollected({})
  }, [setCollected])

  const handleLoginSuccess = useCallback(
    async (profile: CollectorProfile) => {
      try {
        localStorage.removeItem("masterdex_logged_out")
        localStorage.setItem("masterdex_user", JSON.stringify(profile))
      } catch {}
      setCurrentUser(profile)

      try {
        const res = await fetch(`/api/collection?userId=${encodeURIComponent(profile.id)}`)
        if (res.ok) {
          const data = (await res.json()) as any
          if (data?.items) {
            setCollected((prevLocal) => {
              const { merged, slotsToSync } = mergeCloudAndLocalCollection(data.items, prevLocal)
              for (const { pokemonId, slot } of slotsToSync) {
                fetch(`/api/collection/${pokemonId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: profile.id,
                    collected: true,
                    cardId: slot.tcgCard?.id ?? null,
                    cardName: slot.tcgCard?.name ?? null,
                    cardImageUrl: slot.tcgCard?.imageUrl ?? null,
                    cardLanguage: slot.cardLanguage ?? slot.tcgCard?.language ?? null,
                  }),
                }).catch(() => {})
              }
              return merged
            })
          }
        }
      } catch {}
    },
    [setCollected]
  )

  const {
    isGsiLoaded,
    isAuthenticating,
    triggerGoogleSignIn,
    renderGoogleButton,
  } = useGoogleAuth({
    onLoginSuccess: handleLoginSuccess,
  })

  const totalPages = getTotalPages()
  const pagePokemon = getPagePokemon(currentPage)

  const totalCollected = POKEMON.filter((p) => collected[p.id]).length
  const totalCards = Object.values(collected).filter((s) => s?.tcgCard != null).length
  const rawPct = (totalCollected / POKEMON.length) * 100
  const totalPct =
    totalCollected === 0 ? "0" : totalCollected === POKEMON.length ? "100" : rawPct.toFixed(1)

  const activeRegion = DEX_REGIONS.find((r) => r.id === selectedRegionId)
  const currentRegion =
    activeRegion && currentPage >= activeRegion.pageStart && currentPage <= activeRegion.pageEnd
      ? activeRegion
      : getRegionForPage(currentPage)

  const jumpToPage = useCallback(
    (page: number, regionId?: string) => {
      const targetPage = Math.min(totalPages, Math.max(1, page))
      setCurrentPage(targetPage)
      if (regionId) {
        setSelectedRegionId(regionId)
      } else {
        const reg = DEX_REGIONS.find((r) => r.id === selectedRegionId)
        if (!reg || targetPage < reg.pageStart || targetPage > reg.pageEnd) {
          setSelectedRegionId(getRegionForPage(targetPage).id)
        }
      }
    },
    [totalPages, selectedRegionId]
  )

  const handleSearchSelectPokemon = useCallback(
    (pokemon: Pokemon) => {
      const targetPage = Math.floor((pokemon.id - 1) / 16) + 1
      jumpToPage(targetPage)
      setHighlightedPokemonId(pokemon.id)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedPokemonId(null)
      }, 2500)
    },
    [jumpToPage]
  )

  const handleSlotClick = useCallback(
    (pokemon: Pokemon) => {
      setHighlightedPokemonId(null)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      if (!collected[pokemon.id]) {
        markSlotCollected(pokemon.id)
      }
      setModalPokemon(pokemon)
      setModalOpen(true)
    },
    [collected, markSlotCollected]
  )

  return (
    <SidebarProvider defaultOpen={appMode === "binder"}>
      {appMode === "binder" && (
        <BinderSidebar
          currentPage={currentPage}
          currentRegion={currentRegion}
          onJumpToPage={jumpToPage}
        />
      )}

      <SidebarInset className="bg-zinc-950 text-zinc-100">
        <div className="min-h-svh">
          <AppHeader
            appMode={appMode}
            onSetAppMode={setAppMode}
            currentRegionName={currentRegion.name}
            totalCollected={totalCollected}
            totalCards={totalCards}
            totalPokemonCount={POKEMON.length}
            totalPct={totalPct}
            onOpenImportModal={() => setImportModalOpen(true)}
            currentUser={currentUser}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onSignInWithGoogle={triggerGoogleSignIn}
            isAuthenticating={isAuthenticating}
            renderGoogleButton={renderGoogleButton}
            isGsiLoaded={isGsiLoaded}
          />

          {/* Active Mode View */}
          {appMode === "investor" ? (
            <TcgInvestorDashboard userId={currentUser?.id} />
          ) : (

            <main className="max-w-5xl mx-auto px-4 py-6">
              {/* Binder Search Bar Toolbar */}
              <div className="mb-4">
                <BinderSearchBar
                  inputRef={binderSearchInputRef}
                  collected={collected}
                  onSelectPokemon={handleSearchSelectPokemon}
                />
              </div>

              <div className="relative">
                <div className="absolute -left-3 top-8 bottom-8 w-1.5 flex flex-col justify-evenly pointer-events-none z-10">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="size-3 rounded-full bg-zinc-600 border border-zinc-500/60 shadow-inner"
                    />
                  ))}
                </div>

                <BinderPageView
                  currentPage={currentPage}
                  totalPages={totalPages}
                  currentRegion={currentRegion}
                  pagePokemon={pagePokemon}
                  collected={collected}
                  highlightedPokemonId={highlightedPokemonId}
                  onSlotClick={handleSlotClick}
                  onJumpToPage={jumpToPage}
                />
              </div>

              <BinderLegend />
            </main>
          )}
        </div>
      </SidebarInset>

      <CardSelectorModal
        pokemon={modalPokemon}
        slot={modalPokemon ? collected[modalPokemon.id] ?? null : null}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelectCard={handleSelectCard}
        onUnmark={handleUnmark}
      />

      <ImportBackupModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        collected={collected}
        onUpdateCollection={setCollected}
        userId={currentUser?.id}
      />


      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSignInWithGoogle={triggerGoogleSignIn}
        isAuthenticating={isAuthenticating}
      />
    </SidebarProvider>
  )
}

export default App
