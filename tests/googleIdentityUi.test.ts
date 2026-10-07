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

vi.mock("../src/components/ui/sidebar.js", () => ({
  SidebarTrigger: ({ children, className }: any) => React.createElement("button", { className }, children),
}))

import { UserMenu } from "../src/components/auth/UserMenu.js"
import { AuthModal } from "../src/components/auth/AuthModal.js"
import { AppHeader } from "../src/components/AppHeader.js"

describe("Google Identity UI & Profile Management (Tickets #12 & #13)", () => {
  const mockPedroProfile = {
    id: "pedro-user-id",
    googleId: "google-123456",
    email: "pfabrino@gmail.com",
    name: "Pedro Fabrino",
    avatarUrl: "https://example.com/pedro-avatar.png",
    seededFromSheet: true,
  }

  it("renders 'Sign in with Google' button when unauthenticated", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserMenu, {
        currentUser: null,
        onOpenProfileModal: vi.fn(),
      })
    )

    expect(html).toContain("Sign in with Google")
    expect(html).not.toContain("Pedro")
  })

  it("renders user avatar, name, and online pulse when authenticated", () => {
    const html = renderToStaticMarkup(
      React.createElement(UserMenu, {
        currentUser: mockPedroProfile,
        onOpenProfileModal: vi.fn(),
      })
    )

    expect(html).toContain("Pedro")
    expect(html).toContain("https://example.com/pedro-avatar.png")
    expect(html).not.toContain("Sign in with Google")
  })

  it("AuthModal completely excludes mock test artifacts and displays real Google Auth / profile", () => {
    // 1. Unauthenticated modal state
    const unauthHtml = renderToStaticMarkup(
      React.createElement(AuthModal, {
        open: true,
        onClose: vi.fn(),
        currentUser: null,
        onLogout: vi.fn(),
      })
    )

    // MUST NOT contain developer mock test fixtures
    expect(unauthHtml).not.toContain("PERFIL OFICIAL DO PEDRO")
    expect(unauthHtml).not.toContain("Entrar como Pedro Fabrino (Recomendado)")
    expect(unauthHtml).not.toContain("Nome de Treinador")
    expect(unauthHtml).toContain("Sign in with Google")

    // 2. Authenticated profile state
    const authHtml = renderToStaticMarkup(
      React.createElement(AuthModal, {
        open: true,
        onClose: vi.fn(),
        currentUser: mockPedroProfile,
        onLogout: vi.fn(),
      })
    )

    expect(authHtml).toContain("Perfil do Colecionador")
    expect(authHtml).toContain("Pedro Fabrino")
    expect(authHtml).toContain("pfabrino@gmail.com")
    expect(authHtml).toContain("Sincronização em Nuvem Ativa")
    expect(authHtml).toContain("Sair da Conta (Sign Out)")
  })

  it("renders live reactive counters and 1-decimal percentage in AppHeader", () => {
    const html = renderToStaticMarkup(
      React.createElement(AppHeader, {
        appMode: "binder",
        onSetAppMode: vi.fn(),
        currentRegionName: "Kanto",
        totalCollected: 629,
        totalCards: 2,
        totalPokemonCount: 1025,
        totalPct: "61.4",
        onOpenImportModal: vi.fn(),
        currentUser: mockPedroProfile,
        onOpenAuthModal: vi.fn(),
      })
    )

    // Species count
    expect(html).toContain("629/1025")
    // Dedicated physical TCG cards count
    expect(html).toContain("2 Cartas")
    // 1-decimal percentage badge
    expect(html).toContain("61.4%")
  })
})
