import React from "react"
import { type Pokemon, type CollectedSlot, type TcgCard } from "@/data/pokemon"
import { CardSelectorModal } from "@/components/CardSelectorModal"
import { ImportBackupModal } from "@/components/ImportBackupModal"
import { AuthModal, type CollectorProfile } from "@/components/auth/AuthModal"
import { CollectorSettingsModal } from "@/components/settings/CollectorSettingsModal"

interface AppModalsProps {
  modalPokemon: Pokemon | null
  collected: Record<number, CollectedSlot>
  modalOpen: boolean
  onCloseModal: () => void
  onSelectCard: (pokemonId: number, card: TcgCard | null, cardLanguage?: string) => void
  onUnmark: (pokemonId: number) => void
  importModalOpen: boolean
  onCloseImportModal: () => void
  onUpdateCollection: (newCollected: Record<number, CollectedSlot>) => void
  currentUser: CollectorProfile | null
  authModalOpen: boolean
  onCloseAuthModal: () => void
  onLogout: () => void
  onSignInWithGoogle?: () => void
  isAuthenticating?: boolean
  settingsModalOpen: boolean
  onCloseSettingsModal: () => void
  onOpenSettingsModal?: () => void
}

export const AppModals: React.FC<AppModalsProps> = ({
  modalPokemon,
  collected,
  modalOpen,
  onCloseModal,
  onSelectCard,
  onUnmark,
  importModalOpen,
  onCloseImportModal,
  onUpdateCollection,
  currentUser,
  authModalOpen,
  onCloseAuthModal,
  onLogout,
  onSignInWithGoogle,
  isAuthenticating,
  settingsModalOpen,
  onCloseSettingsModal,
  onOpenSettingsModal,
}) => (
  <>
    <CardSelectorModal
      pokemon={modalPokemon}
      slot={modalPokemon ? collected[modalPokemon.id] ?? null : null}
      open={modalOpen}
      onClose={onCloseModal}
      onSelectCard={onSelectCard}
      onUnmark={onUnmark}
    />
    <ImportBackupModal
      open={importModalOpen}
      onClose={onCloseImportModal}
      collected={collected}
      onUpdateCollection={onUpdateCollection}
      userId={currentUser?.id}
    />
    <AuthModal
      open={authModalOpen}
      onClose={onCloseAuthModal}
      currentUser={currentUser}
      onLogout={onLogout}
      onSignInWithGoogle={onSignInWithGoogle}
      isAuthenticating={isAuthenticating}
      onOpenSettings={onOpenSettingsModal}
    />
    <CollectorSettingsModal
      open={settingsModalOpen}
      onClose={onCloseSettingsModal}
      userId={currentUser?.id}
    />
  </>
)

