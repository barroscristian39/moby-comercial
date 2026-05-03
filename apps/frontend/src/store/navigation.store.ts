// Store de navegação — controla o estado de loading entre páginas
// Usado pela Sidebar (ativa) e pelo NavigationProgress (consome)

import { create } from 'zustand'

interface NavigationState {
  isLoading: boolean
  setLoading: (value: boolean) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  isLoading: false,
  setLoading: (value) => set({ isLoading: value }),
}))
