import { create } from 'zustand'

// Empresa ativa no contexto da sessão — selecionada na tela de seleção de empresa
export interface ActiveCompany {
  id: string
  name: string
  tradeName: string | null
  cnpj: string
}

interface CompanyState {
  activeCompany: ActiveCompany | null
  setActiveCompany: (company: ActiveCompany) => void
  clearActiveCompany: () => void
  hydrate: () => void
}

const STORAGE_KEY = 'active_company'

export const useCompanyStore = create<CompanyState>((set) => ({
  activeCompany: null,

  hydrate() {
    if (typeof window === 'undefined') return
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      set({ activeCompany: JSON.parse(raw) })
    }
  },

  setActiveCompany(company) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(company))
    set({ activeCompany: company })
  },

  clearActiveCompany() {
    sessionStorage.removeItem(STORAGE_KEY)
    set({ activeCompany: null })
  },
}))
