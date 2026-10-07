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

import { BinderScannerModal } from "../src/components/scanner/BinderScannerModal.js"
import { I18nProvider } from "../src/i18n/I18nContext.js"

describe("BinderScannerModal Component (Ticket #30 / Spec #27)", () => {
  it("renders modal with layout selectors and camera controls when open", () => {
    const onProceed = vi.fn()
    const onClose = vi.fn()

    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(BinderScannerModal, {
          open: true,
          onClose,
          onProceedToReview: onProceed,
        })
      )
    )

    // Modal title & layout selectors (default pt locale)
    expect(html).toContain("Scanner Visual de Fichário")
    expect(html).toContain("3x3")
    expect(html).toContain("2x2")
    expect(html).toContain("4x3")

    // Camera and file buttons
    expect(html).toContain("Enviar Fotos")
    expect(html).toContain("Escanear Vídeo")
    expect(html).toContain("Capturar Página")
    expect(html).toContain("Auto-Captura DESATIVADA")
  })

  it("does not render contents when closed", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(BinderScannerModal, {
          open: false,
          onClose: vi.fn(),
          onProceedToReview: vi.fn(),
        })
      )
    )

    expect(html).not.toContain("Scanner Visual de Fichário")
  })
})
