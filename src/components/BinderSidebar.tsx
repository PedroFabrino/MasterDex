import { DEX_REGIONS, POKEMON, type DexRegion } from "@/data/pokemon"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Map, BookOpen, Layers3 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BinderSidebarProps {
  currentPage: number
  currentRegion: DexRegion
  onJumpToPage: (page: number) => void
}

export function BinderSidebar({
  currentPage,
  currentRegion,
  onJumpToPage,
}: BinderSidebarProps) {
  return (
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
                    onClick={() => onJumpToPage(region.pageStart)}
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
              {Array.from(
                { length: currentRegion.pageEnd - currentRegion.pageStart + 1 },
                (_, index) => {
                  const page = currentRegion.pageStart + index
                  const start = (page - 1) * 16 + 1
                  const end = Math.min(start + 15, POKEMON.length)
                  return (
                    <SidebarMenuItem key={page}>
                      <SidebarMenuButton
                        isActive={currentPage === page}
                        tooltip={`Page ${page} · #${start}–#${end}`}
                        onClick={() => onJumpToPage(page)}
                        className="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 data-[active=true]:bg-zinc-800 data-[active=true]:text-zinc-100"
                      >
                        <span className="font-mono text-[10px] w-4">
                          {String(page).padStart(2, "0")}
                        </span>
                        <span className="truncate">
                          #{String(start).padStart(3, "0")}–#{String(end).padStart(3, "0")}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
