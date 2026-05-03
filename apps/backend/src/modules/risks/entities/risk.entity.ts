import { RiskLevel, RiskProbability, RiskSeverity, RiskType } from '@moby/shared'

export interface RiskEntity {
  id: string
  tenantId: string
  companyId: string
  companyName: string | null
  unitId: string
  unitName: string
  jobFunctionId: string | null
  jobFunctionName: string | null
  name: string
  type: RiskType
  level: RiskLevel
  probability: RiskProbability
  severity: RiskSeverity
  description: string | null
  controlMeasures: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
