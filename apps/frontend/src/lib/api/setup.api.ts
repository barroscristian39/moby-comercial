import { api } from '@/lib/api'

export interface SetupStatus {
  requiresBootstrap: boolean
}

export interface BootstrapSetupDto {
  name: string
  email: string
  password: string
}

export interface BootstrapAdmin {
  id: string
  name: string
  email: string
  role: string
}

export const setupApi = {
  getStatus: async () => {
    const { data } = await api.get('/setup/status')
    return data.data as SetupStatus
  },

  bootstrap: async (dto: BootstrapSetupDto) => {
    const { data } = await api.post('/setup/bootstrap', dto)
    return data.data as BootstrapAdmin
  },
}
