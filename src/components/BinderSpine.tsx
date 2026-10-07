import React from "react"

export const BinderSpine: React.FC = () => (
  <div className="absolute -left-3 top-8 bottom-8 w-1.5 flex flex-col justify-evenly pointer-events-none z-10">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="size-3 rounded-full bg-zinc-600 border border-zinc-500/60 shadow-inner"
      />
    ))}
  </div>
)
