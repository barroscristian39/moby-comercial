export interface DashboardMetricsEntity {
  companyId: string | null
  unitId: string | null
  activeUnits: number
  employees: number
  reportsIssued: number
  supplementaryExams: number | null
  supplementaryExamsAvailable: boolean
  accidentsWithLeave: number
  accidentsWithoutLeave: number
  expiredEpis: number
  criticalRisks: number
}
