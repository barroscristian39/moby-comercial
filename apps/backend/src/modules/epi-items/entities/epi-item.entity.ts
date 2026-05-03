// Shape de retorno da API para um item do catálogo de EPIs

export interface EpiItemEntity {
  id:               string
  companyId:        string
  name:             string
  description:      string | null
  caNumber:         string
  caExpiry:         Date | null
  manufacturer:     string | null
  unitOfMeasure:    string
  stockQuantity:    number
  minStockQuantity: number
  isCaExpired:      boolean   // Calculado: caExpiry < hoje
  isLowStock:       boolean   // Calculado: stockQuantity <= minStockQuantity
  isActive:         boolean
  createdAt:        Date
  updatedAt:        Date
}
