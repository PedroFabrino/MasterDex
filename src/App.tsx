import { useState, useEffect, useCallback, useRef } from "react"
import { POKEMON, type Pokemon } from "@/data/pokemon"
import { BinderSidebar } from "@/components/BinderSidebar"
import { BinderPageView } from "@/components/BinderPageView"
import { BinderSearchBar } from "@/components/BinderSearchBar"
import { BinderSpine } from "@/components/BinderSpine"
import { type CollectorProfile } from "@/components/auth/AuthModal"
import { type CapturedBinderPage } from "@/components/scanner/BinderScannerModal"
import { AppHeader } from "@/components/AppHeader"
import { BinderLegend } from "@/components/BinderLegend"
import { TcgInvestorDashboard } from "@/components/investor/TcgInvestorDashboard"
import { AppModals } from "@/components/AppModals"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"
import { useCollection } from "@/hooks/useCollection"
import { useBinderNavigation } from "@/hooks/useBinderNavigation"
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts"
import { apiClient } from "@/lib/apiClient"

export function App() {
  const [appMode, setAppMode] = useState<"binder" | "investor">(() =>
    typeof window !== "undefined" && window.location.hash === "#investor" ? "investor" : "binder"
  )
  const [currentUser, setCurrentUser] = useState<CollectorProfile | null>(() => {
    try {
      const saved = localStorage.getItem("masterdex_user")
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const {
    collected,
    setCollected,
    markSlotCollected,
    handleSelectCard,
    handleUnmark,
    mergeAndSyncUser,
    totalCollected,
    totalCards,
    totalPct,
    portfolioSummary,
  } = useCollection({ currentUser })

  const { currentPage, totalPages, pagePokemon, currentRegion, jumpToPage } = useBinderNavigation()

  const [modalPokemon, setModalPokemon] = useState<Pokemon | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [portfolioModalOpen, setPortfolioModalOpen] = useState(false)
  const [scannerModalOpen, setScannerModalOpen] = useState(false)
  const [stagingModalOpen, setStagingModalOpen] = useState(false)
  const [stagedPages, setStagedPages] = useState<CapturedBinderPage[]>([])
  const [highlightedPokemonId, setHighlightedPokemonId] = useState<number | null>(null)

  const binderSearchInputRef = useRef<HTMLInputElement>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useGlobalShortcuts(appMode, binderSearchInputRef)

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") window.location.hash = appMode === "investor" ? "investor" : "binder"
  }, [appMode])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("masterdex_user", JSON.stringify(currentUser))
    } else {
      localStorage.removeItem("masterdex_user")
    }
  }, [currentUser])

  // Rehydrate sessionToken if currentUser exists in localStorage without a valid sessionToken
  useEffect(() => {
    if (currentUser && !currentUser.sessionToken) {
      apiClient
        .getProfile(currentUser.id)
        .then((res) => {
          if (res?.profile?.sessionToken) {
            setCurrentUser(res.profile)
          }
        })
        .catch(() => {})
    }
  }, [currentUser?.id, currentUser?.sessionToken])

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
      await mergeAndSyncUser(profile)
    },
    [mergeAndSyncUser]
  )

  const { isGsiLoaded, isAuthenticating, triggerGoogleSignIn, renderGoogleButton } = useGoogleAuth({
    onLoginSuccess: handleLoginSuccess,
  })

  const handleSearchSelectPokemon = useCallback(
    (pokemon: Pokemon) => {
      jumpToPage(Math.floor((pokemon.id - 1) / 16) + 1)
      setHighlightedPokemonId(pokemon.id)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => setHighlightedPokemonId(null), 2500)
    },
    [jumpToPage]
  )

  const handleSlotClick = useCallback(
    (pokemon: Pokemon) => {
      setHighlightedPokemonId(null)
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current)
      if (!collected[pokemon.id]) markSlotCollected(pokemon.id)
      setModalPokemon(pokemon)
      setModalOpen(true)
    },
    [collected, markSlotCollected]
  )

  return (
    <SidebarProvider defaultOpen={appMode === "binder"}>
      {appMode === "binder" && (
        <BinderSidebar currentPage={currentPage} currentRegion={currentRegion} onJumpToPage={jumpToPage} />
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
            portfolio={portfolioSummary}
            onOpenPortfolioModal={() => setPortfolioModalOpen(true)}
            onOpenImportModal={() => setImportModalOpen(true)}
            onOpenSettingsModal={() => setSettingsModalOpen(true)}
            onOpenScannerModal={() => setScannerModalOpen(true)}
            currentUser={currentUser}
            onOpenAuthModal={() => setAuthModalOpen(true)}
            onSignInWithGoogle={triggerGoogleSignIn}
            isAuthenticating={isAuthenticating}
            renderGoogleButton={renderGoogleButton}
            isGsiLoaded={isGsiLoaded}
          />

          {appMode === "investor" ? (
            <TcgInvestorDashboard userId={currentUser?.id} />
          ) : (
            <main className="max-w-5xl mx-auto px-4 py-6">
              <div className="mb-4">
                <BinderSearchBar
                  inputRef={binderSearchInputRef}
                  collected={collected}
                  onSelectPokemon={handleSearchSelectPokemon}
                />
              </div>

              <div className="relative">
                <BinderSpine />
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

      <AppModals
        modalPokemon={modalPokemon}
        collected={collected}
        modalOpen={modalOpen}
        onCloseModal={() => setModalOpen(false)}
        onSelectCard={handleSelectCard}
        onUnmark={handleUnmark}
        importModalOpen={importModalOpen}
        onCloseImportModal={() => setImportModalOpen(false)}
        onUpdateCollection={setCollected}
        currentUser={currentUser}
        authModalOpen={authModalOpen}
        onCloseAuthModal={() => setAuthModalOpen(false)}
        onLogout={handleLogout}
        onSignInWithGoogle={triggerGoogleSignIn}
        isAuthenticating={isAuthenticating}
        settingsModalOpen={settingsModalOpen}
        onCloseSettingsModal={() => setSettingsModalOpen(false)}
        onOpenSettingsModal={() => setSettingsModalOpen(true)}
        portfolioModalOpen={portfolioModalOpen}
        onClosePortfolioModal={() => setPortfolioModalOpen(false)}
        portfolio={portfolioSummary}
        scannerModalOpen={scannerModalOpen}
        onCloseScannerModal={() => setScannerModalOpen(false)}
        onProceedToReview={(pages) => {
          setStagedPages(pages)
          setStagingModalOpen(true)
        }}
        stagingModalOpen={stagingModalOpen}
        onCloseStagingModal={() => setStagingModalOpen(false)}
        stagedPages={stagedPages}
        onSyncComplete={() => {
          try {
            const stored = localStorage.getItem("masterdex_collected")
            if (stored) {
              setCollected(JSON.parse(stored))
            }
          } catch {}
        }}
      />
    </SidebarProvider>
  )
}

export default App
