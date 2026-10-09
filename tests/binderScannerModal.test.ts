import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import fs from "fs"

vi.mock("../src/components/ui/dialog.js", () => ({
  Dialog: ({ children, open }: any) => (open ? React.createElement("div", null, children) : null),
  DialogContent: ({ children, className }: any) => React.createElement("div", { className }, children),
  DialogHeader: ({ children }: any) => React.createElement("div", null, children),
  DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
  DialogDescription: ({ children }: any) => React.createElement("p", null, children),
}))

import { BinderScannerModal } from "../src/components/scanner/BinderScannerModal.js"
import { ScannerCameraSelector } from "../src/components/scanner/ScannerCameraSelector.js"
import { I18nProvider } from "../src/i18n/I18nContext.js"

describe("BinderScannerModal Component (Ticket #30 / Spec #27)", () => {
  it("renders modal with layout selectors, camera dropdown, and camera controls when open", () => {
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

    // Camera selector dropdown container
    expect(html).toContain('data-testid="camera-selector"')

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

describe("ScannerCameraSelector Component (Multi-Camera & Phone Virtual Webcam)", () => {
  it("renders default camera when no devices are enumerated yet", () => {
    const onSelectDevice = vi.fn()
    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(ScannerCameraSelector, {
          devices: [],
          selectedDeviceId: "",
          onSelectDevice,
        })
      )
    )

    expect(html).toContain('data-testid="camera-selector"')
  })

  it("renders available devices including virtual phone camera and physical webcam", () => {
    const onSelectDevice = vi.fn()
    const devices = [
      { deviceId: "iriun-cam-1", label: "Iriun Webcam (Phone)" },
      { deviceId: "webcam-integrated", label: "Integrated Webcam" },
    ]

    const html = renderToStaticMarkup(
      React.createElement(
        I18nProvider,
        null,
        React.createElement(ScannerCameraSelector, {
          devices,
          selectedDeviceId: "iriun-cam-1",
          onSelectDevice,
        })
      )
    )

    expect(html).toContain('data-testid="camera-selector"')
    expect(html).toContain("Iriun Webcam (Phone)")
  })

  it("strictly enforces architectural line count limits", () => {
    const modalPath = new URL("../src/components/scanner/BinderScannerModal.tsx", import.meta.url)
    const hookPath = new URL("../src/components/scanner/useBinderScannerCamera.ts", import.meta.url)
    const selectorPath = new URL("../src/components/scanner/ScannerCameraSelector.tsx", import.meta.url)

    const modalLines = fs.readFileSync(modalPath, "utf-8").split("\n").length
    const hookLines = fs.readFileSync(hookPath, "utf-8").split("\n").length
    const selectorLines = fs.readFileSync(selectorPath, "utf-8").split("\n").length

    expect(modalLines).toBeLessThanOrEqual(400)
    expect(hookLines).toBeLessThanOrEqual(300)
    expect(selectorLines).toBeLessThanOrEqual(400)
  })
})
