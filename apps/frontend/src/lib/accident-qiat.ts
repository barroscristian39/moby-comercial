import {
  AccidentActivityType,
  AccidentBodyPart,
  AccidentCommuteSubtype,
  AccidentEvidenceType,
  AccidentInjuredSide,
  AccidentSeverity,
  AccidentStatus,
  AccidentType,
  AccidentTypicalSubtype,
  AccidentWorkJourneyType,
} from '@moby/shared'

export const NOT_APPLICABLE_INJURED_SIDE = 'NOT_APPLICABLE' as const
export type AccidentInjuredSideOption = AccidentInjuredSide | typeof NOT_APPLICABLE_INJURED_SIDE
export const ACCIDENT_INJURED_SIDE_OPTIONS = [
  AccidentInjuredSide.LEFT,
  AccidentInjuredSide.RIGHT,
  AccidentInjuredSide.BOTH,
  NOT_APPLICABLE_INJURED_SIDE,
] as const

export const ACCIDENT_STATUS_LABELS: Record<AccidentStatus, string> = {
  REPORTED: 'Registrado',
  UNDER_INVESTIGATION: 'Em investigação',
  ACTION_PLAN_DEFINED: 'Plano de ação',
  CLOSED: 'Encerrado',
}

export const ACCIDENT_SEVERITY_LABELS: Record<AccidentSeverity, string> = {
  MINOR: 'Leve',
  MODERATE: 'Moderado',
  SERIOUS: 'Grave',
  FATAL: 'Fatal',
}

export const ACCIDENT_TYPE_LABELS: Record<AccidentType, string> = {
  TYPICAL: 'Típico',
  COMMUTE: 'Trajeto',
  OCCUPATIONAL_DISEASE: 'Doença ocupacional',
  NEAR_MISS: 'Quase acidente',
}

export const ACCIDENT_ACTIVITY_TYPE_LABELS: Record<AccidentActivityType, string> = {
  HABITUAL: 'Habitual',
  EVENTUAL: 'Eventual',
  NEW: 'Nova',
  FUNCTION_REPLACEMENT: 'Substituição de Função',
}

export const ACCIDENT_TYPICAL_SUBTYPE_LABELS: Record<AccidentTypicalSubtype, string> = {
  BATIDA_CONTRA: 'Batida Contra',
  QUEDA_MESMO_NIVEL: 'Queda do Mesmo Nível',
  QUEDA_NIVEL_DIFERENTE: 'Queda de Nível Diferente',
  PERFUROCORTANTE: 'Perfurocortante',
  PRENSAMENTO: 'Prensamento',
  AGRESSAO: 'Agressão',
  QUEIMADURA: 'Queimadura',
  CONTATO_MATERIAL_BIOLOGICO: 'Contato c/ Material Biológico',
  CONTATO_PRODUTO_QUIMICO: 'Contato c/ Produto Químico',
  OTHER: 'Outros',
}

export const ACCIDENT_COMMUTE_SUBTYPE_LABELS: Record<AccidentCommuteSubtype, string> = {
  BATIDA_CONTRA: 'Batida Contra',
  COLISAO_VEICULOS: 'Colisão de Veículos',
  ATROPELAMENTO: 'Atropelamento',
  QUEDA_NIVEL: 'Queda em Nível',
  ASSALTO: 'Assalto',
  AGRESSAO: 'Agressão',
  ATAQUE_ANIMAIS: 'Ataque de Animais',
  OTHER: 'Outros',
}

export const ACCIDENT_WORK_JOURNEY_TYPE_LABELS: Record<AccidentWorkJourneyType, string> = {
  REGULAR_HOURS: 'Durante horário normal',
  OVERTIME: 'Durante horas extras',
  CHANGED_SCHEDULE: 'Colaborador trocou horário',
}

export const ACCIDENT_INJURED_SIDE_LABELS: Record<AccidentInjuredSide, string> = {
  LEFT: 'Esquerdo',
  RIGHT: 'Direito',
  BOTH: 'Ambos',
}

export const ACCIDENT_INJURED_SIDE_OPTION_LABELS: Record<AccidentInjuredSideOption, string> = {
  LEFT: 'Esquerdo',
  RIGHT: 'Direito',
  BOTH: 'Ambos',
  NOT_APPLICABLE: 'Não se aplica',
}

export const ACCIDENT_BODY_PART_LABELS: Record<AccidentBodyPart, string> = {
  HEAD: 'Cabeça',
  FACE: 'Face',
  EYE: 'Olho',
  NOSE: 'Nariz',
  MOUTH: 'Boca',
  NECK: 'Pescoço',
  SHOULDER: 'Ombro',
  ARM: 'Braço',
  ELBOW: 'Cotovelo',
  WRIST: 'Punho',
  HAND: 'Mão',
  FINGER: 'Dedo',
  THORAX: 'Tórax',
  ABDOMEN: 'Abdome',
  BACK: 'Costas',
  COCCYX: 'Cóccix',
  THIGH: 'Coxa',
  LEG: 'Perna',
  KNEE: 'Joelho',
  ANKLE: 'Tornozelo',
  FOOT: 'Pé',
  OTHER: 'Outros',
}

export const ACCIDENT_EVIDENCE_TYPE_LABELS: Record<AccidentEvidenceType, string> = {
  INJURY_PHOTO: 'Foto da lesão',
  PROCEDURE_EXECUTED: 'Procedimento feito',
  PPE_CORRECT_USE: 'Uso correto de EPI',
  POLICE_REPORT: 'Boletim de ocorrência',
  MEDICAL_CERTIFICATE_WITH_CID: 'Atestado médico com CID',
  MEDICAL_ATTENDANCE_DECLARATION: 'Declaração médica de comparecimento',
  OTHER: 'Outro',
}

export function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function toDateTimeLocalInput(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function toDateTimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return toDateTimeLocalInput(date)
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

export function calculateAge(value?: string | null) {
  if (!value) return null
  const birthDate = new Date(value)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  const beforeBirthday = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
  if (beforeBirthday) age -= 1
  return age
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatBodyPartSummary(parts: AccidentBodyPart[], otherText?: string | null, side?: AccidentInjuredSide | null) {
  const labels = parts
    .filter((part) => part !== AccidentBodyPart.OTHER)
    .map((part) => ACCIDENT_BODY_PART_LABELS[part])

  if (otherText) labels.push(otherText)
  const summary = labels.join(', ')
  if (!summary) return side ? ACCIDENT_INJURED_SIDE_LABELS[side] : ''
  return side ? `${summary} (${ACCIDENT_INJURED_SIDE_LABELS[side].toLowerCase()})` : summary
}

export function toInjuredSideOption(value?: AccidentInjuredSide | null): AccidentInjuredSideOption {
  return value ?? NOT_APPLICABLE_INJURED_SIDE
}

export function toStoredInjuredSide(value?: AccidentInjuredSideOption | null): AccidentInjuredSide | null {
  if (!value || value === NOT_APPLICABLE_INJURED_SIDE) return null
  return value
}

function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

function nextBusinessDay(date: Date) {
  const next = new Date(date)
  do {
    next.setDate(next.getDate() + 1)
  } while (isWeekend(next))
  next.setHours(18, 0, 0, 0)
  return next
}

export function getQiatDeadline(occurredAt?: string | null) {
  if (!occurredAt) return null
  const occurred = new Date(occurredAt)
  if (Number.isNaN(occurred.getTime())) return null

  const deadline = new Date(occurred.getTime() + 12 * 60 * 60 * 1000)
  if (isWeekend(occurred) || isWeekend(deadline)) {
    return nextBusinessDay(occurred)
  }

  return deadline
}

export function getQiatDeadlineStatus(occurredAt?: string | null, referenceDate?: string | null) {
  const deadline = getQiatDeadline(occurredAt)
  if (!deadline) return null

  const reference = referenceDate ? new Date(referenceDate) : new Date()
  if (Number.isNaN(reference.getTime())) return null

  return {
    deadline,
    isLate: reference.getTime() > deadline.getTime(),
  }
}
