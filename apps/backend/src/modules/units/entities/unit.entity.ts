export interface UnitEntity {
  id: string
  tenantId: string
  companyId: string
  name: string
  cnpj: string | null
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
  phone: string | null
  email: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
