'use client'

import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AccidentActivityType,
  AccidentBodyPart,
  AccidentCommuteSubtype,
  AccidentEvidenceType,
  AccidentInjuredSide,
  AccidentSeverity,
  AccidentType,
  AccidentTypicalSubtype,
  AccidentWorkJourneyType,
} from '@moby/shared'
import { Loader2, Paperclip, Trash2 } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAccident } from '@/hooks/use-accidents'
import { useCompanies } from '@/hooks/use-companies'
import { useEmployee, useEmployees } from '@/hooks/use-employees'
import { useJobFunction } from '@/hooks/use-job-functions'
import { useSectors } from '@/hooks/use-sectors'
import { useUnits } from '@/hooks/use-units'
import { accidentEvidencesApi } from '@/lib/api/accident-evidences.api'
import {
  ACCIDENT_ACTIVITY_TYPE_LABELS,
  ACCIDENT_BODY_PART_LABELS,
  ACCIDENT_COMMUTE_SUBTYPE_LABELS,
  ACCIDENT_EVIDENCE_TYPE_LABELS,
  ACCIDENT_INJURED_SIDE_OPTIONS,
  ACCIDENT_INJURED_SIDE_OPTION_LABELS,
  ACCIDENT_SEVERITY_LABELS,
  ACCIDENT_TYPE_LABELS,
  ACCIDENT_TYPICAL_SUBTYPE_LABELS,
  ACCIDENT_WORK_JOURNEY_TYPE_LABELS,
  type AccidentInjuredSideOption,
  calculateAge,
  formatBodyPartSummary,
  formatBytes,
  formatCpf,
  formatDateTime,
  getQiatDeadlineStatus,
  NOT_APPLICABLE_INJURED_SIDE,
  toInjuredSideOption,
  toStoredInjuredSide,
  toDateTimeLocalInput,
} from '@/lib/accident-qiat'
import { triggerToast } from '@/lib/toast-registry'

const createAccidentSchema = z
  .object({
    unitId: z.string().uuid('Selecione a unidade'),
    employeeId: z.string().uuid('Selecione o colaborador'),
    regional: z.string().trim().min(2, 'Informe a regional'),
    unitManagerName: z.string().trim().optional(),
    salary: z.string().trim().optional(),
    employeePhone: z.string().trim().optional(),
    workSchedule: z.string().trim().optional(),
    totalTimeInRole: z.string().trim().optional(),
    activityType: z.nativeEnum(AccidentActivityType).optional(),
    previousAccident: z.boolean().default(false),
    previousAccidentDescription: z.string().trim().optional(),
    occurredAt: z.string().min(1, 'Informe a data e hora'),
    location: z.string().trim().min(3, 'Informe o local do acidente'),
    occurrenceAddress: z.string().trim().optional(),
    accidentType: z.nativeEnum(AccidentType),
    typicalSubtypes: z.array(z.nativeEnum(AccidentTypicalSubtype)).default([]),
    typicalSubtypeOther: z.string().trim().optional(),
    commuteSubtypes: z.array(z.nativeEnum(AccidentCommuteSubtype)).default([]),
    commuteSubtypeOther: z.string().trim().optional(),
    workJourneyType: z.nativeEnum(AccidentWorkJourneyType).optional(),
    scheduleChangeStart: z.string().optional(),
    scheduleChangeEnd: z.string().optional(),
    severity: z.nativeEnum(AccidentSeverity),
    injuredSide: z.enum(ACCIDENT_INJURED_SIDE_OPTIONS, {
      errorMap: () => ({ message: 'Informe o lado atingido' }),
    }),
    injuredBodyParts: z.array(z.nativeEnum(AccidentBodyPart)).min(1, 'Selecione ao menos uma parte do corpo'),
    injuredBodyPartOther: z.string().trim().optional(),
    medicalCareProvided: z.boolean().default(false),
    medicalCareTime: z.string().optional(),
    leaveRequired: z.boolean().default(false),
    leaveDays: z.coerce.number().int().min(0).default(0),
    catIssued: z.boolean().default(false),
    catNumber: z.string().trim().optional(),
    description: z.string().trim().min(10, 'Descreva o acidente'),
    witnesses: z.string().trim().optional(),
    immediateActions: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.previousAccident && !value.previousAccidentDescription?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['previousAccidentDescription'],
        message: 'Descreva o acidente anterior',
      })
    }

    if (value.accidentType === AccidentType.TYPICAL && value.typicalSubtypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalSubtypes'],
        message: 'Selecione ao menos um subtipo típico',
      })
    }

    if (
      value.accidentType === AccidentType.TYPICAL &&
      value.typicalSubtypes.includes(AccidentTypicalSubtype.OTHER) &&
      !value.typicalSubtypeOther?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['typicalSubtypeOther'],
        message: 'Detalhe o subtipo típico em "Outros"',
      })
    }

    if (value.accidentType === AccidentType.COMMUTE && value.commuteSubtypes.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commuteSubtypes'],
        message: 'Selecione ao menos um subtipo de trajeto',
      })
    }

    if (
      value.accidentType === AccidentType.COMMUTE &&
      value.commuteSubtypes.includes(AccidentCommuteSubtype.OTHER) &&
      !value.commuteSubtypeOther?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['commuteSubtypeOther'],
        message: 'Detalhe o subtipo de trajeto em "Outros"',
      })
    }

    if (value.workJourneyType === AccidentWorkJourneyType.CHANGED_SCHEDULE) {
      if (!value.scheduleChangeStart) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduleChangeStart'],
          message: 'Informe o horário inicial da troca',
        })
      }

      if (!value.scheduleChangeEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['scheduleChangeEnd'],
          message: 'Informe o horário final da troca',
        })
      }
    }

    if (value.injuredBodyParts.includes(AccidentBodyPart.OTHER) && !value.injuredBodyPartOther?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['injuredBodyPartOther'],
        message: 'Detalhe a parte do corpo em "Outros"',
      })
    }

    if (value.leaveRequired && value.leaveDays < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['leaveDays'],
        message: 'Informe a quantidade de dias de afastamento',
      })
    }

    if (value.catIssued && !value.catNumber?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['catNumber'],
        message: 'Informe o número da CAT',
      })
    }
  })

type CreateAccidentForm = z.infer<typeof createAccidentSchema>

const CREATE_ACCIDENT_STEPS = [
  {
    value: 'base',
    label: 'Unidade',
    description: 'Regional, unidade e vínculo',
    fields: ['regional', 'unitId', 'employeeId', 'unitManagerName'],
  },
  {
    value: 'colaborador',
    label: 'Colaborador',
    description: 'Dados existentes e complementares',
    fields: ['salary', 'employeePhone', 'workSchedule', 'totalTimeInRole', 'activityType', 'previousAccident', 'previousAccidentDescription'],
  },
  {
    value: 'classificacao',
    label: 'Classificação',
    description: 'Ocorrência, tipo e jornada',
    fields: [
      'occurredAt',
      'location',
      'occurrenceAddress',
      'accidentType',
      'typicalSubtypes',
      'typicalSubtypeOther',
      'commuteSubtypes',
      'commuteSubtypeOther',
      'workJourneyType',
      'scheduleChangeStart',
      'scheduleChangeEnd',
      'severity',
    ],
  },
  {
    value: 'lesao',
    label: 'Lesão',
    description: 'Lado, corpo e atendimento',
    fields: [
      'injuredSide',
      'injuredBodyParts',
      'injuredBodyPartOther',
      'medicalCareProvided',
      'medicalCareTime',
      'leaveRequired',
      'leaveDays',
      'catIssued',
      'catNumber',
    ],
  },
  {
    value: 'relato',
    label: 'Relato',
    description: 'Descrição, testemunhas e ações',
    fields: ['description', 'witnesses', 'immediateActions'],
  },
  {
    value: 'evidencias',
    label: 'Evidências',
    description: 'Arquivos e documentos',
    fields: [],
  },
] as const satisfies ReadonlyArray<{
  value: string
  label: string
  description: string
  fields: readonly (keyof CreateAccidentForm)[]
}>

type CreateAccidentStep = (typeof CREATE_ACCIDENT_STEPS)[number]['value']

type PendingEvidence = {
  id: string
  file: File
  evidenceType: AccidentEvidenceType
  notes: string
}

export function CreateAccidentQiatDialog({
  open,
  onOpenChange,
  initialCompanyId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialCompanyId?: string
  onCreated?: (accidentId: string) => void
}) {
  const [step, setStep] = useState<CreateAccidentStep>(CREATE_ACCIDENT_STEPS[0].value)
  const [evidenceType, setEvidenceType] = useState<AccidentEvidenceType>(AccidentEvidenceType.INJURY_PHOTO)
  const [evidenceNotes, setEvidenceNotes] = useState('')
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([])
  const [pendingEvidences, setPendingEvidences] = useState<PendingEvidence[]>([])
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false)
  const [injuredBodyPartSlots, setInjuredBodyPartSlots] = useState(1)

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: unitsData } = useUnits({ page: 1, perPage: 100 })
  const form = useForm<CreateAccidentForm>({
    resolver: zodResolver(createAccidentSchema),
    defaultValues: {
      unitId: '',
      employeeId: '',
      regional: '',
      unitManagerName: '',
      salary: '',
      employeePhone: '',
      workSchedule: '',
      totalTimeInRole: '',
      activityType: undefined,
      previousAccident: false,
      previousAccidentDescription: '',
      occurredAt: toDateTimeLocalInput(new Date()),
      location: '',
      occurrenceAddress: '',
      accidentType: AccidentType.TYPICAL,
      typicalSubtypes: [],
      typicalSubtypeOther: '',
      commuteSubtypes: [],
      commuteSubtypeOther: '',
      workJourneyType: undefined,
      scheduleChangeStart: '',
      scheduleChangeEnd: '',
      severity: AccidentSeverity.MODERATE,
      injuredSide: NOT_APPLICABLE_INJURED_SIDE,
      injuredBodyParts: [],
      injuredBodyPartOther: '',
      medicalCareProvided: false,
      medicalCareTime: '',
      leaveRequired: false,
      leaveDays: 0,
      catIssued: false,
      catNumber: '',
      description: '',
      witnesses: '',
      immediateActions: '',
    },
  })

  const createAccident = useCreateAccident()

  const modalUnitId = form.watch('unitId')
  const modalEmployeeId = form.watch('employeeId')
  const accidentType = form.watch('accidentType')
  const workJourneyType = form.watch('workJourneyType')
  const previousAccident = form.watch('previousAccident')
  const leaveRequired = form.watch('leaveRequired')
  const catIssued = form.watch('catIssued')
  const injuredBodyParts = form.watch('injuredBodyParts')
  const occurredAt = form.watch('occurredAt')

  const { data: employeesData } = useEmployees({
    page: 1,
    perPage: 100,
    companyId: initialCompanyId || undefined,
    unitId: modalUnitId || undefined,
  })
  const employeeQuery = useEmployee(modalEmployeeId || undefined)
  const jobFunctionQuery = useJobFunction(employeeQuery.data?.jobFunctionId)
  const sectorsQuery = useSectors({
    page: 1,
    perPage: 100,
    unitId: employeeQuery.data?.unitId || modalUnitId || undefined,
  })

  const companies = companiesData?.data ?? []
  const units = unitsData?.data ?? []
  const employees = modalUnitId ? employeesData?.data ?? [] : []
  const currentStepIndex = CREATE_ACCIDENT_STEPS.findIndex((item) => item.value === step)
  const currentStep = CREATE_ACCIDENT_STEPS[currentStepIndex] ?? CREATE_ACCIDENT_STEPS[0]
  const isFirstStep = currentStepIndex <= 0
  const isLastStep = currentStepIndex === CREATE_ACCIDENT_STEPS.length - 1

  const availableUnits = useMemo(() => {
    if (!initialCompanyId) return units
    return units.filter((unit) => unit.companyId === initialCompanyId)
  }, [initialCompanyId, units])

  const selectedEmployee = employeeQuery.data
  const selectedUnit = units.find((unit) => unit.id === modalUnitId)
  const selectedCompany = companies.find((company) => company.id === selectedUnit?.companyId)
  const selectedSector = (sectorsQuery.data?.data ?? []).find((sector) => sector.id === selectedEmployee?.sectorId)
  const selectedJobFunction = jobFunctionQuery.data
  const deadlineStatus = getQiatDeadlineStatus(occurredAt)

  useEffect(() => {
    if (!open) return
    form.reset({
      unitId: '',
      employeeId: '',
      regional: '',
      unitManagerName: '',
      salary: '',
      employeePhone: '',
      workSchedule: '',
      totalTimeInRole: '',
      activityType: undefined,
      previousAccident: false,
      previousAccidentDescription: '',
      occurredAt: toDateTimeLocalInput(new Date()),
      location: '',
      occurrenceAddress: '',
      accidentType: AccidentType.TYPICAL,
      typicalSubtypes: [],
      typicalSubtypeOther: '',
      commuteSubtypes: [],
      commuteSubtypeOther: '',
      workJourneyType: undefined,
      scheduleChangeStart: '',
      scheduleChangeEnd: '',
      severity: AccidentSeverity.MODERATE,
      injuredSide: NOT_APPLICABLE_INJURED_SIDE,
      injuredBodyParts: [],
      injuredBodyPartOther: '',
      medicalCareProvided: false,
      medicalCareTime: '',
      leaveRequired: false,
      leaveDays: 0,
      catIssued: false,
      catNumber: '',
      description: '',
      witnesses: '',
      immediateActions: '',
    })
    setStep(CREATE_ACCIDENT_STEPS[0].value)
    setEvidenceType(AccidentEvidenceType.INJURY_PHOTO)
    setEvidenceNotes('')
    setSelectedEvidenceFiles([])
    setPendingEvidences([])
    setIsUploadingEvidence(false)
    setInjuredBodyPartSlots(1)
  }, [form, open])

  async function goToNextStep() {
    if (currentStep.fields.length === 0) {
      if (!isLastStep) setStep(CREATE_ACCIDENT_STEPS[currentStepIndex + 1].value)
      return
    }

    const isValid = await form.trigger(currentStep.fields, { shouldFocus: true })
    if (!isValid || isLastStep) return
    setStep(CREATE_ACCIDENT_STEPS[currentStepIndex + 1].value)
  }

  function goToPreviousStep() {
    if (isFirstStep) return
    setStep(CREATE_ACCIDENT_STEPS[currentStepIndex - 1].value)
  }

  function toggleArrayValue<T extends string>(field: keyof CreateAccidentForm, value: T) {
    const current = (form.getValues(field) as T[]) ?? []
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
    form.setValue(field, next as any, { shouldDirty: true, shouldValidate: true })
  }

  function updateInjuredBodyPart(index: number, value: string) {
    const current = [...(form.getValues('injuredBodyParts') ?? [])]

    if (!value) {
      if (index < current.length) current.splice(index, 1)
    } else if (index < current.length) {
      current[index] = value as AccidentBodyPart
    } else {
      current.push(value as AccidentBodyPart)
    }

    form.setValue('injuredBodyParts', current, { shouldDirty: true, shouldValidate: true })

    if (!current.includes(AccidentBodyPart.OTHER)) {
      form.setValue('injuredBodyPartOther', '', { shouldDirty: true, shouldValidate: true })
    }
  }

  function addInjuredBodyPartSlot() {
    setInjuredBodyPartSlots((current) => current + 1)
  }

  function removeInjuredBodyPartSlot(index: number) {
    const current = [...(form.getValues('injuredBodyParts') ?? [])]
    if (index < current.length) {
      current.splice(index, 1)
      form.setValue('injuredBodyParts', current, { shouldDirty: true, shouldValidate: true })
      if (!current.includes(AccidentBodyPart.OTHER)) {
        form.setValue('injuredBodyPartOther', '', { shouldDirty: true, shouldValidate: true })
      }
    }

    setInjuredBodyPartSlots((currentSlots) => Math.max(1, Math.max(current.length, currentSlots - 1)))
  }

  function addEvidenceToQueue() {
    if (selectedEvidenceFiles.length === 0) {
      triggerToast({
        title: 'Selecione arquivos',
        description: 'Escolha ao menos um arquivo para incluir na fila de evidências',
        variant: 'warning',
      })
      return
    }

    setPendingEvidences((current) => [
      ...current,
      ...selectedEvidenceFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        evidenceType,
        notes: evidenceNotes.trim(),
      })),
    ])
    setSelectedEvidenceFiles([])
    setEvidenceNotes('')
  }

  function removeQueuedEvidence(id: string) {
    setPendingEvidences((current) => current.filter((item) => item.id !== id))
  }

  async function handleCreate(values: CreateAccidentForm) {
    const accident = await createAccident.mutateAsync({
      employeeId: values.employeeId,
      regional: values.regional,
      unitManagerName: normalizeOptionalText(values.unitManagerName),
      salary: normalizeOptionalText(values.salary),
      employeePhone: normalizeOptionalText(values.employeePhone),
      workSchedule: normalizeOptionalText(values.workSchedule),
      totalTimeInRole: normalizeOptionalText(values.totalTimeInRole),
      activityType: values.activityType,
      previousAccident: values.previousAccident,
      previousAccidentDescription: values.previousAccident
        ? normalizeOptionalText(values.previousAccidentDescription)
        : undefined,
      occurredAt: values.occurredAt,
      location: values.location,
      occurrenceAddress: normalizeOptionalText(values.occurrenceAddress),
      accidentType: values.accidentType,
      typicalSubtypes: values.accidentType === AccidentType.TYPICAL ? values.typicalSubtypes : [],
      typicalSubtypeOther: values.accidentType === AccidentType.TYPICAL
        ? normalizeOptionalText(values.typicalSubtypeOther)
        : undefined,
      commuteSubtypes: values.accidentType === AccidentType.COMMUTE ? values.commuteSubtypes : [],
      commuteSubtypeOther: values.accidentType === AccidentType.COMMUTE
        ? normalizeOptionalText(values.commuteSubtypeOther)
        : undefined,
      workJourneyType: values.workJourneyType,
      scheduleChangeStart: values.workJourneyType === AccidentWorkJourneyType.CHANGED_SCHEDULE
        ? normalizeOptionalText(values.scheduleChangeStart)
        : undefined,
      scheduleChangeEnd: values.workJourneyType === AccidentWorkJourneyType.CHANGED_SCHEDULE
        ? normalizeOptionalText(values.scheduleChangeEnd)
        : undefined,
      severity: values.severity,
      description: values.description,
      injuredSide: toStoredInjuredSide(values.injuredSide) ?? undefined,
      injuredBodyParts: values.injuredBodyParts,
      injuredBodyPartOther: values.injuredBodyParts.includes(AccidentBodyPart.OTHER)
        ? normalizeOptionalText(values.injuredBodyPartOther)
        : undefined,
      injuredBodyPart: formatBodyPartSummary(
        values.injuredBodyParts,
        values.injuredBodyPartOther,
        toStoredInjuredSide(values.injuredSide),
      ),
      medicalCareProvided: values.medicalCareProvided,
      medicalCareTime: values.medicalCareProvided ? normalizeOptionalText(values.medicalCareTime) : undefined,
      leaveRequired: values.leaveRequired,
      leaveDays: values.leaveRequired ? values.leaveDays : 0,
      catIssued: values.catIssued,
      catNumber: values.catIssued ? normalizeOptionalText(values.catNumber) : undefined,
      witnesses: normalizeOptionalText(values.witnesses),
      immediateActions: normalizeOptionalText(values.immediateActions),
    })

    if (pendingEvidences.length > 0) {
      setIsUploadingEvidence(true)
      try {
        for (const evidence of pendingEvidences) {
          await accidentEvidencesApi.upload(accident.id, {
            evidenceType: evidence.evidenceType,
            notes: evidence.notes || undefined,
            file: evidence.file,
          })
        }
        triggerToast({
          title: '✓ Evidências anexadas',
          description: `${pendingEvidences.length} arquivo(s) foram adicionados ao QIAT`,
          variant: 'success',
        })
      } catch {
        triggerToast({
          title: 'Acidente criado com pendência',
          description: 'O registro foi salvo, mas parte das evidências precisará ser reenviada na tela de gestão',
          variant: 'warning',
        })
      } finally {
        setIsUploadingEvidence(false)
      }
    }

    onOpenChange(false)
    onCreated?.(accident.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>QIAT — Registro inicial do acidente</DialogTitle>
          <DialogDescription>
            Preencha o questionário de investigação com abas por categoria e avance até concluir o registro.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(handleCreate)}>
          <Tabs value={step} onValueChange={(value) => setStep(value as CreateAccidentStep)} className="space-y-4">
            <TabsList className="flex h-auto w-full items-start justify-start overflow-x-auto rounded-[28px] border border-border/70 bg-background px-6 py-6 shadow-sm">
              {CREATE_ACCIDENT_STEPS.map((item, index) => {
                const isActive = step === item.value
                const isCompleted = index < currentStepIndex
                const isConnectorFilled = index < currentStepIndex
                const showConnector = index < CREATE_ACCIDENT_STEPS.length - 1

                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="group flex h-auto min-w-[140px] flex-1 flex-col gap-3 rounded-2xl bg-transparent px-2 py-0 text-left shadow-none transition-none hover:bg-transparent focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-4 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    <div className="flex w-full items-center">
                      <span
                        className={`flex h-12 w-12 items-center justify-center rounded-full border text-base font-semibold transition-all ${
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_0_6px_rgba(59,130,246,0.14)]'
                            : isCompleted
                              ? 'border-primary/15 bg-primary/10 text-primary'
                              : 'border-transparent bg-muted text-muted-foreground'
                        }`}
                      >
                        {index + 1}
                      </span>
                      {showConnector && (
                        <span
                          className={`ml-4 h-1 flex-1 rounded-full transition-colors ${
                            isConnectorFilled ? 'bg-primary' : 'bg-border/70'
                          }`}
                        />
                      )}
                    </div>
                    <span
                      className={`pl-1 text-sm font-medium ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>

            <TabsContent value="base" className="mt-0 space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <SectionHeader
                title="Seção 1 — Dados da unidade da ocorrência"
                description="Selecione a unidade, o colaborador e complemente apenas os campos que ainda não existem no cadastro."
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <Label htmlFor="regional">Regional *</Label>
                  <Input id="regional" placeholder="Ex: Sudeste, Norte, Filial SP..." {...form.register('regional')} />
                  <FieldError message={form.formState.errors.regional?.message} />
                </Field>
                <Field>
                  <Label htmlFor="unitManagerName">Gestor(a) da unidade</Label>
                  <Input id="unitManagerName" placeholder="Nome do gestor responsável" {...form.register('unitManagerName')} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <Label htmlFor="unitId">Unidade *</Label>
                  <select
                    id="unitId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('unitId')}
                    onChange={(event) => {
                      form.setValue('unitId', event.target.value, { shouldValidate: true })
                      form.setValue('employeeId', '')
                    }}
                  >
                    <option value="">Selecione a unidade</option>
                    {availableUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {initialCompanyId
                          ? unit.name
                          : `${unit.name} · ${companies.find((company) => company.id === unit.companyId)?.tradeName
                            ?? companies.find((company) => company.id === unit.companyId)?.name
                            ?? 'Empresa'}`}
                      </option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.unitId?.message} />
                </Field>
                <Field>
                  <Label htmlFor="employeeId">Colaborador *</Label>
                  <select
                    id="employeeId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('employeeId')}
                    disabled={!modalUnitId}
                  >
                    <option value="">{modalUnitId ? 'Selecione o colaborador' : 'Selecione a unidade primeiro'}</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} · {formatCpf(employee.cpf)}
                      </option>
                    ))}
                  </select>
                  <FieldError message={form.formState.errors.employeeId?.message} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <ReadOnlyField
                  label="Unidade / Contrato"
                  value={selectedUnit ? `${selectedUnit.name} · ${selectedCompany?.tradeName ?? selectedCompany?.name ?? '—'}` : 'Selecione a unidade'}
                />
                <ReadOnlyField
                  label="Unidade do Acidentado"
                  value={selectedUnit?.name ?? 'Selecione o colaborador'}
                />
                <ReadOnlyField
                  label="Status do prazo"
                  value={deadlineStatus ? `${deadlineStatus.isLate ? 'Fora do prazo' : 'Dentro do prazo'} · limite ${formatDateTime(deadlineStatus.deadline.toISOString())}` : 'Defina a data da ocorrência'}
                />
              </div>
            </TabsContent>

            <TabsContent value="colaborador" className="mt-0 space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <SectionHeader
                title="Seção 2 — Dados do colaborador acidentado"
                description="Os dados mestres já existentes aparecem em leitura. Complete os complementares do QIAT."
              />

              <div className="grid gap-3 md:grid-cols-3">
                <ReadOnlyField label="Nome completo" value={selectedEmployee?.name ?? 'Selecione o colaborador'} />
                <ReadOnlyField label="CPF" value={selectedEmployee?.cpf ? formatCpf(selectedEmployee.cpf) : '—'} />
                <ReadOnlyField
                  label="Idade"
                  value={calculateAge(selectedEmployee?.birthDate) !== null ? `${calculateAge(selectedEmployee?.birthDate)} anos` : '—'}
                />
                <ReadOnlyField
                  label="Data de admissão"
                  value={selectedEmployee?.admissionDate ? new Date(selectedEmployee.admissionDate).toLocaleDateString('pt-BR') : '—'}
                />
                <ReadOnlyField label="Matrícula" value={selectedEmployee?.registration ?? '—'} />
                <ReadOnlyField label="Unidade do colaborador" value={selectedUnit?.name ?? '—'} />
                <ReadOnlyField label="Área / Setor" value={selectedSector?.name ?? '—'} />
                <ReadOnlyField label="Função" value={selectedJobFunction?.name ?? '—'} />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field>
                  <Label htmlFor="salary">Salário</Label>
                  <Input id="salary" placeholder="Ex: R$ 2.450,00" {...form.register('salary')} />
                </Field>
                <Field>
                  <Label htmlFor="employeePhone">Telefone com DDD</Label>
                  <Input id="employeePhone" placeholder="Ex: (11) 99999-9999" {...form.register('employeePhone')} />
                </Field>
                <Field>
                  <Label htmlFor="workSchedule">Horário de trabalho</Label>
                  <Input id="workSchedule" placeholder="Ex: 08:00 às 17:00" {...form.register('workSchedule')} />
                </Field>
                <Field>
                  <Label htmlFor="totalTimeInRole">Tempo total na função</Label>
                  <Input id="totalTimeInRole" placeholder="Ex: 1 ano e 3 meses" {...form.register('totalTimeInRole')} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <Label htmlFor="activityType">Tipo de atividade</Label>
                  <select
                    id="activityType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={form.watch('activityType') ?? ''}
                    onChange={(event) => {
                      form.setValue('activityType', event.target.value ? event.target.value as AccidentActivityType : undefined)
                    }}
                  >
                    <option value="">Selecione</option>
                    {Object.values(AccidentActivityType).map((value) => (
                      <option key={value} value={value}>{ACCIDENT_ACTIVITY_TYPE_LABELS[value]}</option>
                    ))}
                  </select>
                </Field>
                <BooleanChoiceField
                  label="Já sofreu acidente anteriormente?"
                  value={previousAccident}
                  onChange={(value) => form.setValue('previousAccident', value, { shouldValidate: true })}
                />
              </div>

              {previousAccident && (
                <Field>
                  <Label htmlFor="previousAccidentDescription">Descreva o acidente anterior *</Label>
                  <Textarea
                    id="previousAccidentDescription"
                    placeholder="Informe o histórico anterior relevante para a investigação."
                    {...form.register('previousAccidentDescription')}
                  />
                  <FieldError message={form.formState.errors.previousAccidentDescription?.message} />
                </Field>
              )}
            </TabsContent>

            <TabsContent value="classificacao" className="mt-0 space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <SectionHeader
                title="Seções 3 e 4 — Classificação e dados da ocorrência"
                description="Defina o tipo principal, os subtipos e o contexto da jornada em que a ocorrência aconteceu."
              />

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <Label htmlFor="occurredAt">Data e horário da ocorrência *</Label>
                  <Input id="occurredAt" type="datetime-local" {...form.register('occurredAt')} />
                  <FieldError message={form.formState.errors.occurredAt?.message} />
                </Field>
                <Field>
                  <Label htmlFor="location">Local / Especificação do local *</Label>
                  <Input id="location" placeholder="Ex: cozinha industrial, acesso externo..." {...form.register('location')} />
                  <FieldError message={form.formState.errors.location?.message} />
                </Field>
              </div>

              <Field>
                <Label htmlFor="occurrenceAddress">Endereço completo da ocorrência (com CEP)</Label>
                <Input id="occurrenceAddress" placeholder="Rua, número, bairro, cidade, UF e CEP" {...form.register('occurrenceAddress')} />
              </Field>

              {deadlineStatus && (
                <Alert variant={deadlineStatus.isLate ? 'destructive' : 'default'}>
                  <AlertDescription>
                    {deadlineStatus.isLate
                      ? `Atenção: o QIAT está sendo preenchido após o prazo recomendado. Limite calculado: ${formatDateTime(deadlineStatus.deadline.toISOString())}.`
                      : `Prazo dentro da janela esperada. Limite calculado: ${formatDateTime(deadlineStatus.deadline.toISOString())}.`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <Label htmlFor="accidentType">Tipo principal *</Label>
                  <select
                    id="accidentType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('accidentType')}
                  >
                    {Object.values(AccidentType).map((value) => (
                      <option key={value} value={value}>{ACCIDENT_TYPE_LABELS[value]}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <Label htmlFor="severity">Gravidade *</Label>
                  <select
                    id="severity"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('severity')}
                  >
                    {Object.values(AccidentSeverity).map((value) => (
                      <option key={value} value={value}>{ACCIDENT_SEVERITY_LABELS[value]}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {accidentType === AccidentType.TYPICAL && (
                <Field>
                  <Label>Subtipo Típico *</Label>
                  <MultiSelectGrid
                    values={form.watch('typicalSubtypes')}
                    options={Object.values(AccidentTypicalSubtype).map((value) => ({
                      value,
                      label: ACCIDENT_TYPICAL_SUBTYPE_LABELS[value],
                    }))}
                    onToggle={(value) => toggleArrayValue('typicalSubtypes', value)}
                  />
                  <FieldError message={form.formState.errors.typicalSubtypes?.message as string | undefined} />
                  {form.watch('typicalSubtypes').includes(AccidentTypicalSubtype.OTHER) && (
                    <div className="mt-3">
                      <Input placeholder="Detalhe o subtipo típico" {...form.register('typicalSubtypeOther')} />
                      <FieldError message={form.formState.errors.typicalSubtypeOther?.message} />
                    </div>
                  )}
                </Field>
              )}

              {accidentType === AccidentType.COMMUTE && (
                <Field>
                  <Label>Subtipo Trajeto *</Label>
                  <MultiSelectGrid
                    values={form.watch('commuteSubtypes')}
                    options={Object.values(AccidentCommuteSubtype).map((value) => ({
                      value,
                      label: ACCIDENT_COMMUTE_SUBTYPE_LABELS[value],
                    }))}
                    onToggle={(value) => toggleArrayValue('commuteSubtypes', value)}
                  />
                  <FieldError message={form.formState.errors.commuteSubtypes?.message as string | undefined} />
                  {form.watch('commuteSubtypes').includes(AccidentCommuteSubtype.OTHER) && (
                    <div className="mt-3">
                      <Input placeholder="Detalhe o subtipo de trajeto" {...form.register('commuteSubtypeOther')} />
                      <FieldError message={form.formState.errors.commuteSubtypeOther?.message} />
                    </div>
                  )}
                </Field>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <Field className="md:col-span-2">
                  <Label htmlFor="workJourneyType">Jornada</Label>
                  <select
                    id="workJourneyType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={workJourneyType ?? ''}
                    onChange={(event) => {
                      form.setValue(
                        'workJourneyType',
                        event.target.value ? event.target.value as AccidentWorkJourneyType : undefined,
                        { shouldValidate: true },
                      )
                    }}
                  >
                    <option value="">Selecione</option>
                    {Object.values(AccidentWorkJourneyType).map((value) => (
                      <option key={value} value={value}>{ACCIDENT_WORK_JOURNEY_TYPE_LABELS[value]}</option>
                    ))}
                  </select>
                </Field>
                {workJourneyType === AccidentWorkJourneyType.CHANGED_SCHEDULE && (
                  <>
                    <Field>
                      <Label htmlFor="scheduleChangeStart">De *</Label>
                      <Input id="scheduleChangeStart" type="time" {...form.register('scheduleChangeStart')} />
                      <FieldError message={form.formState.errors.scheduleChangeStart?.message} />
                    </Field>
                    <Field>
                      <Label htmlFor="scheduleChangeEnd">Até *</Label>
                      <Input id="scheduleChangeEnd" type="time" {...form.register('scheduleChangeEnd')} />
                      <FieldError message={form.formState.errors.scheduleChangeEnd?.message} />
                    </Field>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="lesao" className="mt-0 space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <SectionHeader
                title="Seções 5, 6 e 7 — Lado, parte do corpo e atendimento"
                description="Registre a região atingida, o atendimento recebido e se houve afastamento."
              />

              <Field>
                <Label htmlFor="injuredSide">Lado atingido *</Label>
                <select
                  id="injuredSide"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.watch('injuredSide')}
                  onChange={(event) => {
                    form.setValue('injuredSide', event.target.value as AccidentInjuredSideOption, {
                      shouldValidate: true,
                    })
                  }}
                >
                  {ACCIDENT_INJURED_SIDE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {ACCIDENT_INJURED_SIDE_OPTION_LABELS[value]}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.injuredSide?.message} />
              </Field>

              <Field>
                <Label htmlFor="injuredBodyParts">Parte do corpo atingida *</Label>
                <div className="space-y-2">
                  {Array.from({ length: Math.max(injuredBodyPartSlots, injuredBodyParts.length || 1) }).map((_, index) => {
                    const selectedValue = injuredBodyParts[index] ?? ''

                    return (
                      <div key={`injured-body-part-${index}`} className="flex items-start gap-2">
                        <select
                          id={index === 0 ? 'injuredBodyParts' : undefined}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          value={selectedValue}
                          onChange={(event) => updateInjuredBodyPart(index, event.target.value)}
                        >
                          <option value="">Selecione a parte do corpo</option>
                          {Object.values(AccidentBodyPart).map((value) => (
                            <option
                              key={value}
                              value={value}
                              disabled={injuredBodyParts.some((part, partIndex) => part === value && partIndex !== index)}
                            >
                              {ACCIDENT_BODY_PART_LABELS[value]}
                            </option>
                          ))}
                        </select>
                        {(injuredBodyPartSlots > 1 || injuredBodyParts.length > 1) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 shrink-0"
                            onClick={() => removeInjuredBodyPartSlot(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                  <Button type="button" variant="outline" size="sm" onClick={addInjuredBodyPartSlot}>
                    Adicionar outra parte
                  </Button>
                </div>
                <FieldError message={form.formState.errors.injuredBodyParts?.message as string | undefined} />
                {injuredBodyParts.includes(AccidentBodyPart.OTHER) && (
                  <div className="mt-3">
                    <Input placeholder="Detalhe a parte do corpo em outros" {...form.register('injuredBodyPartOther')} />
                    <FieldError message={form.formState.errors.injuredBodyPartOther?.message} />
                  </div>
                )}
              </Field>

              <Alert>
                <AlertDescription>
                  Resumo que ficará salvo no registro: {formatBodyPartSummary(
                    injuredBodyParts,
                    form.watch('injuredBodyPartOther'),
                    toStoredInjuredSide(form.watch('injuredSide')),
                  ) || 'Selecione as partes do corpo atingidas'}
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 md:grid-cols-3">
                <BooleanChoiceField
                  label="Houve atendimento médico"
                  value={form.watch('medicalCareProvided')}
                  onChange={(value) => form.setValue('medicalCareProvided', value)}
                />
                <Field>
                  <Label htmlFor="medicalCareTime">Hora do atendimento médico</Label>
                  <Input id="medicalCareTime" type="time" {...form.register('medicalCareTime')} />
                </Field>
                <BooleanChoiceField
                  label="CAT emitida"
                  value={form.watch('catIssued')}
                  onChange={(value) => form.setValue('catIssued', value, { shouldValidate: true })}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <BooleanChoiceField
                  label="Teve afastamento"
                  value={leaveRequired}
                  onChange={(value) => form.setValue('leaveRequired', value, { shouldValidate: true })}
                />
                <Field>
                  <Label htmlFor="leaveDays">Dias de atestado</Label>
                  <Input
                    id="leaveDays"
                    type="number"
                    min={0}
                    disabled={!leaveRequired}
                    {...form.register('leaveDays', { valueAsNumber: true })}
                  />
                  <FieldError message={form.formState.errors.leaveDays?.message} />
                </Field>
                <Field>
                  <Label htmlFor="catNumber">Número CAT</Label>
                  <Input id="catNumber" disabled={!catIssued} {...form.register('catNumber')} />
                  <FieldError message={form.formState.errors.catNumber?.message} />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="relato" className="mt-0 space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <SectionHeader
                title="Seções 8 e 9 — Descrição e testemunhas"
                description="A descrição detalhada é obrigatória para submissão do QIAT."
              />

              <Field>
                <Label htmlFor="description">Descrição detalhada da ocorrência *</Label>
                <Textarea
                  id="description"
                  className="min-h-[180px]"
                  placeholder="Descreva a dinâmica completa do acidente, contexto, ações e consequências observadas."
                  {...form.register('description')}
                />
                <FieldError message={form.formState.errors.description?.message} />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field>
                  <Label htmlFor="witnesses">Testemunhas</Label>
                  <Textarea
                    id="witnesses"
                    placeholder="Informe nomes, empresas ou outros dados úteis das testemunhas."
                    {...form.register('witnesses')}
                  />
                </Field>
                <Field>
                  <Label htmlFor="immediateActions">Ações imediatas</Label>
                  <Textarea
                    id="immediateActions"
                    placeholder="Primeiros socorros, comunicação, isolamento da área, etc."
                    {...form.register('immediateActions')}
                  />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="evidencias" className="mt-0 space-y-4 rounded-2xl border border-border/70 bg-background/80 p-4">
              <SectionHeader
                title="Seção 10 — Evidências"
                description="Adicione múltiplos arquivos com imagens ou PDF. O envio é opcional, mas o sistema aceita os documentos mínimos previstos no QIAT."
              />

              <Alert>
                <AlertDescription>
                  Quando aplicável, anexe ao menos: atestado médico com CID, foto da lesão e boletim de ocorrência para acidentes de trajeto.
                </AlertDescription>
              </Alert>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Field>
                  <Label htmlFor="evidenceType">Tipo de evidência</Label>
                  <select
                    id="evidenceType"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={evidenceType}
                    onChange={(event) => setEvidenceType(event.target.value as AccidentEvidenceType)}
                  >
                    {Object.values(AccidentEvidenceType).map((value) => (
                      <option key={value} value={value}>{ACCIDENT_EVIDENCE_TYPE_LABELS[value]}</option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <Label htmlFor="evidenceNotes">Observação</Label>
                  <Input
                    id="evidenceNotes"
                    value={evidenceNotes}
                    onChange={(event) => setEvidenceNotes(event.target.value)}
                    placeholder="Comentário opcional para os arquivos selecionados"
                  />
                </Field>
                <Field>
                  <Label htmlFor="evidenceFiles">Arquivos</Label>
                  <Input
                    id="evidenceFiles"
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    multiple
                    onChange={(event) => setSelectedEvidenceFiles(Array.from(event.target.files ?? []))}
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={addEvidenceToQueue}>
                  <Paperclip className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar à fila
                </Button>
              </div>

              <div className="space-y-2">
                {pendingEvidences.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    Nenhuma evidência adicionada ainda. Você pode concluir o QIAT sem anexos e complementar depois.
                  </div>
                )}

                {pendingEvidences.map((evidence) => (
                  <div key={evidence.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{evidence.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ACCIDENT_EVIDENCE_TYPE_LABELS[evidence.evidenceType]} · {formatBytes(evidence.file.size)}
                        {evidence.notes ? ` · ${evidence.notes}` : ''}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQueuedEvidence(evidence.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button type="button" variant="outline" onClick={goToPreviousStep}>
                  Voltar
                </Button>
              )}

              {isLastStep ? (
                <Button type="submit" disabled={createAccident.isPending || isUploadingEvidence}>
                  {(createAccident.isPending || isUploadingEvidence) && (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  )}
                  Criar e abrir gestão
                </Button>
              ) : (
                <Button type="button" onClick={goToNextStep}>
                  Avançar
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function normalizeOptionalText(value?: string) {
  const normalized = value?.trim() ?? ''
  return normalized ? normalized : undefined
}

function Field({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={className ? `space-y-1.5 ${className}` : 'space-y-1.5'}>{children}</div>
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

function BooleanChoiceField({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 shadow-sm">
      <p className="truncate pr-3 text-sm font-medium leading-none text-foreground">{label}</p>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function MultiSelectGrid<T extends string>({
  values,
  options,
  onToggle,
}: {
  values: T[]
  options: Array<{ value: T; label: string }>
  onToggle: (value: T) => void
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const checked = values.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            className={`flex min-h-9 items-center rounded-md border px-4 py-2 text-left text-sm transition ${
              checked
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-input bg-background text-foreground hover:border-primary/40'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
