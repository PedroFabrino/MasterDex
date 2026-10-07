import React, { useState, useMemo, useRef, useEffect } from "react"
import { Search, X, CheckCircle, Sparkles } from "lucide-react"
import { POKEMON, getRegionForPage, type Pokemon, type CollectedSlot } from "@/data/pokemon"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/i18n"
import { cn } from "@/lib/utils"

export function normalizePokemonName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function filterPokemonByName(list: Pokemon[], query: string): Pokemon[] {
  const trimmed = query.trim()
  if (!trimmed) return []
  const normQuery = normalizePokemonName(trimmed)
  return list.filter((p) => normalizePokemonName(p.name).includes(normQuery)).slice(0, 12)
}

export function getPokemonPageAndRegion(pokemonId: number): {
  page: number
  regionId: string
  regionName: string
} {
  const page = Math.floor((pokemonId - 1) / 16) + 1
  const region = getRegionForPage(page)
  return { page, regionId: region.id, regionName: region.name }
}

export interface BinderSearchBarProps {
  onSelectPokemon: (pokemon: Pokemon) => void
  collected: Record<number, CollectedSlot>
  inputRef?: React.RefObject<HTMLInputElement | null>
  initialQuery?: string
  forceOpen?: boolean
  className?: string
}

export function BinderSearchBar({
  onSelectPokemon,
  collected,
  inputRef: externalInputRef,
  initialQuery = "",
  forceOpen = false,
  className,
}: BinderSearchBarProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState(initialQuery)
  const [isOpen, setIsOpen] = useState(forceOpen)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const internalInputRef = useRef<HTMLInputElement>(null)
  const inputRef = externalInputRef || internalInputRef
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => filterPokemonByName(POKEMON, query), [query])
  const showDropdown = (isOpen || forceOpen) && query.trim().length > 0

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (pokemon: Pokemon) => {
    onSelectPokemon(pokemon)
    setQuery("")
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" && matches.length > 0) {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 < matches.length ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : matches.length - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (matches[selectedIndex]) {
        handleSelect(matches[selectedIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-xl mx-auto", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 size-4 text-zinc-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("binderSearch.placeholder")}
          className="pl-10 pr-24 h-10 bg-zinc-900/90 border-zinc-700/80 hover:border-zinc-600 focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/50 rounded-xl text-sm text-zinc-100 placeholder:text-zinc-500 transition-all shadow-inner"
        />

        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-auto">
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setIsOpen(false)
                inputRef.current?.focus()
              }}
              aria-label={t("binderSearch.clearAria")}
              className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded transition-colors"
            >
              <X className="size-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 rounded shadow-xs select-none pointer-events-none">
            {t("binderSearch.shortcutBadge")}
          </kbd>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 rounded-xl shadow-2xl shadow-black/80 overflow-hidden divide-y divide-zinc-800 max-h-80 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="px-4 py-3 text-center text-xs text-zinc-400">
              {t("binderSearch.noResults")}
            </div>
          ) : (
            matches.map((pokemon, idx) => {
              const { page, regionName } = getPokemonPageAndRegion(pokemon.id)
              const slot = collected[pokemon.id]
              const isCollected = !!slot
              const hasTcgCard = slot?.tcgCard != null
              const isSelected = idx === selectedIndex

              return (
                <div
                  key={pokemon.id}
                  onClick={() => handleSelect(pokemon)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors text-sm",
                    isSelected
                      ? "bg-amber-500/15 text-amber-200"
                      : "text-zinc-200 hover:bg-zinc-800/60"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={pokemon.spriteUrl}
                      alt={pokemon.name}
                      className="size-7 object-contain shrink-0"
                      style={{ imageRendering: "pixelated" }}
                      draggable={false}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{pokemon.name}</span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          #{String(pokemon.id).padStart(3, "0")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {hasTcgCard ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 border-violet-500/60 text-violet-300 bg-violet-950/40"
                      >
                        <Sparkles className="size-2.5 mr-0.5 text-violet-400" />
                        {t("binderSearch.cardAssignedStatus")}
                      </Badge>
                    ) : isCollected ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/60 text-emerald-300 bg-emerald-950/40"
                      >
                        <CheckCircle className="size-2.5 mr-0.5 text-emerald-400" />
                        {t("binderSearch.collectedStatus")}
                      </Badge>
                    ) : null}

                    <span className="text-xs font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700/60">
                      {t("binderSearch.pageIndicator", { page, region: regionName })}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
