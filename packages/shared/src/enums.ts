export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  TECNICO_SST = 'TECNICO_SST',
  GESTOR = 'GESTOR',
  RH = 'RH',
  CONSULTA = 'CONSULTA',

  // Compatibilidade temporaria com a primeira fundacao do projeto.
  ADMIN_SYSTEM = 'SUPER_ADMIN',
  TECH_SAFETY = 'TECNICO_SST',
  HR_ADMIN = 'RH',
  MANAGER = 'GESTOR',
  UNIT_USER = 'CONSULTA',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  CANCELED = 'CANCELED',
}

export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum NotificationFilter {
  ALL = 'ALL',
  UNREAD = 'UNREAD',
  READ = 'READ',
}

export enum Permission {
  PLATFORM_DASHBOARD_VIEW = 'platform.dashboard.view',
  TENANTS_READ = 'tenants.read',
  TENANTS_WRITE = 'tenants.write',
  TENANT_STATUS_WRITE = 'tenants.status.write',
  USERS_READ = 'users.read',
  USERS_WRITE = 'users.write',
  USER_SCOPE_WRITE = 'users.scope.write',
  COMPANIES_READ = 'companies.read',
  COMPANIES_WRITE = 'companies.write',
  UNITS_READ = 'units.read',
  UNITS_WRITE = 'units.write',
  EMPLOYEES_READ = 'employees.read',
  EMPLOYEES_WRITE = 'employees.write',
  RISKS_READ = 'risks.read',
  RISKS_WRITE = 'risks.write',
  ACCIDENTS_READ = 'accidents.read',
  ACCIDENTS_WRITE = 'accidents.write',
  EPI_READ = 'epi.read',
  EPI_WRITE = 'epi.write',
  EXAMS_READ = 'exams.read',
  EXAMS_WRITE = 'exams.write',
  TRAININGS_READ = 'trainings.read',
  TRAININGS_WRITE = 'trainings.write',
  DOCUMENTS_READ = 'documents.read',
  DOCUMENTS_WRITE = 'documents.write',
  REPORTS_READ = 'reports.read',
  AUDIT_READ = 'audit.read',
  SETTINGS_READ = 'settings.read',
  SETTINGS_WRITE = 'settings.write',
}

export enum RiskType {
  PHYSICAL = 'PHYSICAL',
  CHEMICAL = 'CHEMICAL',
  BIOLOGICAL = 'BIOLOGICAL',
  ERGONOMIC = 'ERGONOMIC',
  ACCIDENT = 'ACCIDENT',
}

export enum RiskLevel {
  NEGLIGIBLE = 'NEGLIGIBLE',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RiskProbability {
  RARE = 'RARE',
  UNLIKELY = 'UNLIKELY',
  POSSIBLE = 'POSSIBLE',
  LIKELY = 'LIKELY',
  ALMOST_CERTAIN = 'ALMOST_CERTAIN',
}

export enum RiskSeverity {
  INSIGNIFICANT = 'INSIGNIFICANT',
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
  CATASTROPHIC = 'CATASTROPHIC',
}

export enum AccidentStatus {
  REPORTED = 'REPORTED',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  ACTION_PLAN_DEFINED = 'ACTION_PLAN_DEFINED',
  CLOSED = 'CLOSED',
}

export enum AccidentSeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  SERIOUS = 'SERIOUS',
  FATAL = 'FATAL',
}

export enum AccidentType {
  TYPICAL = 'TYPICAL',
  COMMUTE = 'COMMUTE',
  OCCUPATIONAL_DISEASE = 'OCCUPATIONAL_DISEASE',
  NEAR_MISS = 'NEAR_MISS',
}

export enum AccidentActivityType {
  HABITUAL = 'HABITUAL',
  EVENTUAL = 'EVENTUAL',
  NEW = 'NEW',
  FUNCTION_REPLACEMENT = 'FUNCTION_REPLACEMENT',
}

export enum AccidentTypicalSubtype {
  BATIDA_CONTRA = 'BATIDA_CONTRA',
  QUEDA_MESMO_NIVEL = 'QUEDA_MESMO_NIVEL',
  QUEDA_NIVEL_DIFERENTE = 'QUEDA_NIVEL_DIFERENTE',
  PERFUROCORTANTE = 'PERFUROCORTANTE',
  PRENSAMENTO = 'PRENSAMENTO',
  AGRESSAO = 'AGRESSAO',
  QUEIMADURA = 'QUEIMADURA',
  CONTATO_MATERIAL_BIOLOGICO = 'CONTATO_MATERIAL_BIOLOGICO',
  CONTATO_PRODUTO_QUIMICO = 'CONTATO_PRODUTO_QUIMICO',
  OTHER = 'OTHER',
}

export enum AccidentCommuteSubtype {
  BATIDA_CONTRA = 'BATIDA_CONTRA',
  COLISAO_VEICULOS = 'COLISAO_VEICULOS',
  ATROPELAMENTO = 'ATROPELAMENTO',
  QUEDA_NIVEL = 'QUEDA_NIVEL',
  ASSALTO = 'ASSALTO',
  AGRESSAO = 'AGRESSAO',
  ATAQUE_ANIMAIS = 'ATAQUE_ANIMAIS',
  OTHER = 'OTHER',
}

export enum AccidentWorkJourneyType {
  REGULAR_HOURS = 'REGULAR_HOURS',
  OVERTIME = 'OVERTIME',
  CHANGED_SCHEDULE = 'CHANGED_SCHEDULE',
}

export enum AccidentInjuredSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  BOTH = 'BOTH',
}

export enum AccidentBodyPart {
  HEAD = 'HEAD',
  FACE = 'FACE',
  EYE = 'EYE',
  NOSE = 'NOSE',
  MOUTH = 'MOUTH',
  NECK = 'NECK',
  SHOULDER = 'SHOULDER',
  ARM = 'ARM',
  ELBOW = 'ELBOW',
  WRIST = 'WRIST',
  HAND = 'HAND',
  FINGER = 'FINGER',
  THORAX = 'THORAX',
  ABDOMEN = 'ABDOMEN',
  BACK = 'BACK',
  COCCYX = 'COCCYX',
  THIGH = 'THIGH',
  LEG = 'LEG',
  KNEE = 'KNEE',
  ANKLE = 'ANKLE',
  FOOT = 'FOOT',
  OTHER = 'OTHER',
}

export enum AccidentEvidenceType {
  INJURY_PHOTO = 'INJURY_PHOTO',
  PROCEDURE_EXECUTED = 'PROCEDURE_EXECUTED',
  PPE_CORRECT_USE = 'PPE_CORRECT_USE',
  POLICE_REPORT = 'POLICE_REPORT',
  MEDICAL_CERTIFICATE_WITH_CID = 'MEDICAL_CERTIFICATE_WITH_CID',
  MEDICAL_ATTENDANCE_DECLARATION = 'MEDICAL_ATTENDANCE_DECLARATION',
  OTHER = 'OTHER',
}

export enum ControlType {
  EPC = 'EPC',
  EPI = 'EPI',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  PROCEDURE = 'PROCEDURE',
  TRAINING = 'TRAINING',
  EXAM = 'EXAM',
  CORRECTIVE = 'CORRECTIVE',
}

export enum ActionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum ActionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum EpiStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING = 'EXPIRING',
  EXPIRED = 'EXPIRED',
  REPLACED = 'REPLACED',
  DAMAGED = 'DAMAGED',
}

export enum EpiDeliveryReason {
  ADMISSION = 'ADMISSION',
  PERIODIC = 'PERIODIC',
  REPLACEMENT = 'REPLACEMENT',
  FUNCTION_CHANGE = 'FUNCTION_CHANGE',
  CA_RENEWAL = 'CA_RENEWAL',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

export enum SstLegalDocumentType {
  PGR = 'PGR',
  PCMSO = 'PCMSO',
  LTCAT = 'LTCAT',
  LIP = 'LIP',
}

export enum SstLegalDocumentStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  ARCHIVED = 'ARCHIVED',
}

export enum EsocialEventType {
  S2210 = 'S-2210',
  S2220 = 'S-2220',
  S2240 = 'S-2240',
  S3000 = 'S-3000',
}

export enum EsocialEventStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  PENDING_CORRECTION = 'PENDING_CORRECTION',
}

export enum ExamType {
  ADMISSION = 'ADMISSION',
  PERIODIC = 'PERIODIC',
  CHANGE_FUNCTION = 'CHANGE_FUNCTION',
  RETURN_TO_WORK = 'RETURN_TO_WORK',
  DISMISSAL = 'DISMISSAL',
}

export enum OccupationalExamType {
  ADMISSIONAL = 'ADMISSIONAL',
  PERIODIC = 'PERIODIC',
  RETURN_TO_WORK = 'RETURN_TO_WORK',
  ROLE_CHANGE = 'ROLE_CHANGE',
  DISMISSAL = 'DISMISSAL',
  COMPLEMENTARY = 'COMPLEMENTARY',
}

export enum OccupationalExamResult {
  FIT = 'FIT',
  UNFIT = 'UNFIT',
  FIT_WITH_RESTRICTIONS = 'FIT_WITH_RESTRICTIONS',
  PENDING = 'PENDING',
}

export enum TrainingStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}
