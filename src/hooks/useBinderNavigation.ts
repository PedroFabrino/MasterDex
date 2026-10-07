import { useState, useCallback } from "react"
import { DEX_REGIONS, getPagePokemon, getTotalPages, getRegionForPage } from "@/data/pokemon"

export function useBinderNavigation() {
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRegionId, setSelectedRegionId] = useState<string>("kanto")

  const totalPages = getTotalPages()
  const pagePokemon = getPagePokemon(currentPage)

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

  return {
    currentPage,
    setCurrentPage,
    selectedRegionId,
    setSelectedRegionId,
    totalPages,
    pagePokemon,
    currentRegion,
    jumpToPage,
  }
}
