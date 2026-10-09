import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("../src/components/ui/dialog.js", () => ({
  Dialog: ({ children, open }: any) => (open ? React.createElement("div", null, children) : null),
  DialogContent: ({ children, className }: any) => React.createElement("div", { className }, children),
  DialogHeader: ({ children }: any) => React.createElement("div", null, children),
  DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
  DialogDescription: ({ children }: any) => React.createElement("p", null, children),
}))

import { StagingReviewModal } from "../src/components/scanner/StagingReviewModal.js"
import { StagingSlotCard } from "../src/components/scanner/StagingSlotCard.js"
import { I18nProvider } from "../src/i18n/I18nContext.js"

describe("StagingReviewModal Component (Ticket #31 / Spec #27)", () => {
  const dummyPages = [
    {
      id: "page-1",
      image: "data:image/jpeg;base64,dummy1",
      layout: "3x3" as const,
    },
    {
      id: "page-2",
      image: "data:image/jpeg;base64,dummy2",
      layout: "3x3" as const,
    },
  ]

  it("renders staging review interface with pager and confirm button when open", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(StagingReviewModal, {
          open: true,
          onClose: vi.fn(),
          pages: dummyPages,
          userId: "test-user",
          onSyncComplete: vi.fn(),
        })
      )
    )

    // Staging title & description (default pt locale)
    expect(html).toContain("Área de Revisão")
    expect(html).toContain("Confirmação")
    // Pager indicator
    expect(html).toContain("Página 1 de 2")
    // Confirm button
    expect(html).toContain("Confirmar")
    expect(html).toContain("Adicionar ao Fichário")
  })

  it("does not render when closed", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(StagingReviewModal, {
          open: false,
          onClose: vi.fn(),
          pages: dummyPages,
        })
      )
    )

    expect(html).toBe("")
  })

  it("renders StagingSlotCard with artwork image and change artwork button", () => {
    const slot = {
      slotIndex: 0,
      pokedexId: 34,
      pokemonName: "Nidoking",
      cardName: "Nidoking",
      collectorNumber: "174/165",
      setName: "151",
      confidence: 0.96,
      empty: false,
      matchedCard: {
        id: "sv03.5-174",
        name: "Nidoking",
        imageUrl: "https://assets.tcgdex.net/pt/sv/sv03.5/174/high.webp",
        expansionId: "sv03.5",
        rarity: "Secret Rare",
      },
    }

    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(StagingSlotCard, {
          slot,
          onOpenArtworkSelector: vi.fn(),
          onOpenSpeciesModal: vi.fn(),
        })
      )
    )

    expect(html).toContain("Nidoking")
    expect(html).toContain("#034")
    expect(html).toContain("https://assets.tcgdex.net/pt/sv/sv03.5/174/high.webp")
    expect(html).toContain("Alterar Carta")
    expect(html).toContain("Alterar Pokémon")
  })
})
