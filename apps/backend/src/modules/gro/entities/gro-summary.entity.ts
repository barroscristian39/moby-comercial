import { RiskLevel } from '@moby/shared'

export interface GroSummaryEntity {
  companyId: string | null
  unitId: string | null
  kpis: {
    activeUnits: number
    activeEmployees: number
    activeRisks: number
    criticalRisks: number
    risksWithControls: number
    risksWithoutControls: number
    inactiveRisks: number
    activeEpiItems: number
    expiredCaItems: number
  }
  controlStatus: Array<{
    key: 'WITH_CONTROLS' | 'WITHOUT_CONTROLS' | 'CRITICAL' | 'INACTIVE'
    label: string
    count: number
    percentage: number
  }>
  risksByLevel: Array<{
    level: RiskLevel
    count: number
  }>
  risksByUnit: Array<{
    unitId: string
    unitName: string
    count: number
  }>
}
