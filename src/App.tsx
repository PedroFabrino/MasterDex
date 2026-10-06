import { useState, useCallback } from "react"
import {
  POKEMON,
  TCG_CARDS,
  getPagePokemon,
  getTotalPages,
  getRegionForPage,
  DEX_REGIONS,
  type Pokemon,
  type TcgCard,
  type CollectedSlot,
} from "@/data/pokemon"
import { CardSlot } from "@/components/CardSlot"
import { CardSelectorModal } from "@/components/CardSelectorModal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
  Map,
  Layers3,
  PanelLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const INITIAL_COLLECTED: Record<number, CollectedSlot> = {
  6: { pokemonId: 6, tcgCard: TCG_CARDS[6][0] },
  9: { pokemonId: 9, tcgCard: TCG_CARDS[9][0] },
  25: { pokemonId: 25, tcgCard: TCG_CARDS[25][0] },
  1: { pokemonId: 1, tcgCard: null },
  4: { pokemonId: 4, tcgCard: null },
  7: { pokemonId: 7, tcgCard: null },
}

export function App() {
  const [currentPage, setCurrentPage] = useState(1)
  const [collected, setCollected] = useState<Record<number, CollectedSlot>>(INITIAL_COLLECTED)
  const [modalPokemon, setModalPokemon] = useState<Pokemon | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const totalPages = getTotalPages()
  const pagePokemon = getPagePokemon(currentPage)

  const pageCollectedCount = pagePokemon.filter((p) => collected[p.id]).length
  const progressPct = Math.round((pageCollectedCount / 16) * 100)

  const totalCollected = POKEMON.filter((p) => collected[p.id]).length
  const totalPct = Math.round((totalCollected / POKEMON.length) * 100)

  const firstId = pagePokemon[0]?.id ?? 0
  const lastId = pagePokemon[pagePokemon.length - 1]?.id ?? 0
  const firstName = pagePokemon[0]?.name ?? ""
  const lastName = pagePokemon[pagePokemon.length - 1]?.name ?? ""
  const currentRegion = getRegionForPage(currentPage)

  const jumpToPage = (page: number) => {
    setCurrentPage(Math.min(totalPages, Math.max(1, page)))
  }

  const handleSlotClick = useCallback(
    (pokemon: Pokemon) => {
      if (!collected[pokemon.id]) {
        setCollected((prev) => ({
          ...prev,
          [pokemon.id]: { pokemonId: pokemon.id, tcgCard: null },
        }))
      }
      setModalPokemon(pokemon)
      setModalOpen(true)
    },
    [collected]
  )

  const handleSelectCard = useCallback((pokemonId: number, card: TcgCard | null) => {
    setCollected((prev) => ({
      ...prev,
      [pokemonId]: { pokemonId, tcgCard: card },
    }))
  }, [])

  const handleUnmark = useCallback((pokemonId: number) => {
    setCollected((prev) => {
      const next = { ...prev }
      delete next[pokemonId]
      return next
    })
  }, [])

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-zinc-800/60">
        <SidebarHeader className="border-b border-zinc-800/60 p-3">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative size-8 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 to-red-600 shadow-lg shadow-red-950/50" />
              <div className="absolute inset-0 rounded-full border-2 border-zinc-950/70" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-950/70 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2 rounded-full bg-zinc-100 border-2 border-zinc-950/50" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="text-sm font-bold text-zinc-100 truncate">Binder index</p>
              <p className="text-[10px] text-zinc-500 truncate">Jump by region or Dex range</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-zinc-900 text-zinc-200">
          <SidebarGroup className="p-2">
            <SidebarGroupLabel className="text-zinc-500 group-data-[collapsible=icon]:justify-center">
              <Map className="size-3.5" />
              <span>Regions</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {DEX_REGIONS.map((region) => (
                  <SidebarMenuItem key={region.id}>
                    <SidebarMenuButton
                      isActive={currentRegion.id === region.id}
                      tooltip={`${region.name} · #${region.dexStart}–#${region.dexEnd}`}
                      onClick={() => jumpToPage(region.pageStart)}
                      className="text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 data-[active=true]:bg-violet-950/50 data-[active=true]:text-violet-200"
                    >
                      <Layers3 className={cn("size-4", region.accent)} />
                      <span className="truncate">{region.name}</span>
                      <span className="ml-auto text-[10px] text-zinc-500 group-data-[collapsible=icon]:hidden">
                        #{region.dexStart}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="p-2 pt-0">
            <SidebarGroupLabel className="text-zinc-500 group-data-[collapsible=icon]:justify-center">
              <BookOpen className="size-3.5" />
              <span>{currentRegion.name} pages</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: currentRegion.pageEnd - currentRegion.pageStart + 1 }, (_, index) => {
                  const page = currentRegion.pageStart + index
                  const start = (page - 1) * 16 + 1
                  const end = Math.min(start + 15, POKEMON.length)
                  return (
                    <SidebarMenuItem key={page}>
                      <SidebarMenuButton
                        isActive={currentPage === page}
                        tooltip={`Page ${page} · #${start}–#${end}`}
                        onClick={() => jumpToPage(page)}
                        className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 data-[active=true]:bg-zinc-800 data-[active=true]:text-zinc-100"
                      >
                        <span className="font-mono text-[10px] w-4">{String(page).padStart(2, "0")}</span>
                        <span className="truncate">#{String(start).padStart(3, "0")}–#{String(end).padStart(3, "0")}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-zinc-950 text-zinc-100">
        <div className="min-h-svh">
          {/* Global top bar */}
          <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100" aria-label="Toggle binder navigation">
                  <PanelLeft className="size-4" />
                </SidebarTrigger>
                <div className="hidden sm:block h-5 w-px bg-zinc-800" />
            {/* Pokéball accent */}
            <div className="relative size-9 shrink-0">
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-red-500 to-red-600 shadow-lg shadow-red-950/50" />
              <div className="absolute inset-0 rounded-full border-2 border-zinc-900/60" />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-900/70 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-2.5 rounded-full bg-zinc-100 border-2 border-zinc-900/50 shadow-sm" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-zinc-100 leading-none">
                PokéBinder
              </h1>
              <p className="text-xs text-zinc-500 leading-none mt-0.5">
                {currentRegion.name} Collection Tracker
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-zinc-900/80 rounded-lg px-3 py-1.5 border border-zinc-800/60">
              <Sparkles className="size-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-zinc-300 font-medium">
                {totalCollected}/{POKEMON.length}
              </span>
              <span className="text-xs text-zinc-500">collected</span>
            </div>
            <Badge
              variant="outline"
              className="border-violet-700/60 text-violet-300 bg-violet-950/30 text-xs"
            >
              {totalPct}% complete
            </Badge>
                </div>
              </div>
          </header>

          <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Binder wrapper */}
        <div className="relative">
          {/* Spine rings effect */}
          <div className="absolute -left-3 top-8 bottom-8 w-1.5 flex flex-col justify-evenly pointer-events-none z-10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="size-3 rounded-full bg-zinc-600 border border-zinc-500/60 shadow-inner"
              />
            ))}
          </div>

          {/* Binder body */}
          <div className="rounded-2xl border border-zinc-700/60 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 shadow-2xl shadow-black/60 overflow-hidden">
            {/* Page header */}
            <div className="bg-zinc-800/60 border-b border-zinc-700/50 px-6 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 leading-tight">
                    Page {currentPage}: {currentRegion.name} ({firstName} – {lastName})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    #{String(firstId).padStart(3, "0")} – #{String(lastId).padStart(3, "0")}
                  </p>
                </div>
                <div className="flex items-center gap-3 min-w-0 sm:min-w-[200px]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">
                        {pageCollectedCount}/16 Collected
                      </span>
                      <span
                        className={cn(
                          "text-xs font-bold",
                          progressPct === 100
                            ? "text-emerald-400"
                            : progressPct >= 50
                            ? "text-amber-400"
                            : "text-zinc-400"
                        )}
                      >
                        {progressPct}%
                      </span>
                    </div>
                    <Progress
                      value={progressPct}
                      className="h-1.5 bg-zinc-700/60 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-violet-500 [&>[data-slot=progress-indicator]]:to-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4x4 grid */}
            <div className="p-5 sm:p-6">
              <div className="grid grid-cols-4 gap-3 sm:gap-3.5">
                {pagePokemon.map((pokemon) => (
                  <CardSlot
                    key={pokemon.id}
                    pokemon={pokemon}
                    slot={collected[pokemon.id]}
                    onClick={() => handleSlotClick(pokemon)}
                  />
                ))}
              </div>
            </div>

            <Separator className="bg-zinc-700/40" />

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between gap-4 bg-zinc-800/30">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-zinc-500 shrink-0" />
                <Select
                  value={String(currentPage)}
                  onValueChange={(v) => setCurrentPage(Number(v))}
                >
                  <SelectTrigger className="w-28 h-8 bg-zinc-800/60 border-zinc-700 text-zinc-300 text-sm focus:ring-zinc-500/30 focus:border-zinc-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {pageNumbers.map((n) => {
                      const pp = getPagePokemon(n)
                      const f = pp[0]?.name ?? ""
                      return (
                        <SelectItem
                          key={n}
                          value={String(n)}
                          className="text-zinc-300 focus:bg-zinc-700 focus:text-zinc-100"
                        >
                          Page {n} — {f}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
                <span className="text-xs text-zinc-500">of {totalPages}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-4 justify-center text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded border border-zinc-700 bg-zinc-800" />
            <span>Empty Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded border-2 border-emerald-600/50 bg-zinc-800" />
            <span>Collected (Sprite)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-3 rounded bg-gradient-to-br from-violet-500 to-pink-500" />
            <span>TCG Card</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-amber-400" />
            <span>Holo / Rare</span>
          </div>
        </div>
          </main>
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
    </SidebarProvider>
  )
}

export default App
