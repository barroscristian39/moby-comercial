import { SetMetadata } from '@nestjs/common'

export const MANUAL_AUDIT_KEY = 'manualAudit'
export const ManualAudit = () => SetMetadata(MANUAL_AUDIT_KEY, true)
