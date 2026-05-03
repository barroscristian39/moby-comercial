// Shape de retorno da API para uma entrega de EPI

export interface EpiDeliveryEntity {
  id:                 string
  companyId:          string
  employeeId:         string
  employeeName:       string        // Desnormalizado para leitura
  epiItemId:          string
  epiItemName:        string        // Desnormalizado para leitura
  caNumberSnapshot:   string | null // CA no momento da entrega
  quantity:           number
  deliveredAt:        Date
  reason:             string
  condition:          string
  deliveredBy:        string | null
  returnedAt:         Date | null
  notes:              string | null
  isActive:           boolean
  createdAt:          Date
  updatedAt:          Date
}
