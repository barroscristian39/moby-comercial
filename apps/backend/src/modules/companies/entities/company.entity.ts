export interface CompanyEntity {
  id: string
  tenantId: string
  name: string
  tradeName: string | null
  cnpj: string
  cnae: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
  phone: string | null
  email: string | null
  responsibleName: string | null
  logoUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
