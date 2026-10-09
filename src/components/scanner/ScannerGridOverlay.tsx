import React from "react"

interface ScannerGridOverlayProps {
  layout: "2x2" | "3x3" | "4x3" | "4x4"
}

export const ScannerGridOverlay: React.FC<ScannerGridOverlayProps> = ({ layout }) => {
  const rows = layout === "2x2" ? 2 : layout === "4x3" || layout === "4x4" ? 4 : 3
  const cols = layout === "2x2" ? 2 : layout === "4x4" ? 4 : 3

  return (
    <div className="absolute inset-3 sm:inset-4 pointer-events-none border-2 border-violet-500/60 rounded-xl overflow-hidden shadow-2xl">
      <div
        className="w-full h-full grid gap-1.5 sm:gap-2 p-1.5 sm:p-2"
        style={{
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div
            key={i}
            className="border border-dashed border-violet-400/40 rounded-lg flex items-center justify-center bg-violet-950/5"
          >
            <span className="text-[10px] sm:text-xs font-mono font-bold text-violet-400/60">
              #{i + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
