'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarClock, Loader2, Pencil, Plus, Search, Stethoscope, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Topbar } from '@/components/layout/topbar'
import { useEmployees } from '@/hooks/use-employees'
import {
  useCreateOccupationalExam,
  useOccupationalExams,
  useUpdateOccupationalExam,
} from '@/hooks/use-occupational-exams'
import type { OccupationalExam, OccupationalExamResult, OccupationalExamType } from '@/lib/api/occupational-exams.api'

const EXAM_TYPE_LABELS: Record<OccupationalExamType, string> = {
  ADMISSIONAL: 'Admissional',
  PERIODIC: 'Periódico',
  RETURN_TO_WORK: 'Retorno ao trabalho',
  ROLE_CHANGE: 'Mudança de função',
  DISMISSAL: 'Demissional',
  COMPLEMENTARY: 'Complementar',
}

const RESULT_LABELS: Record<OccupationalExamResult, string> = {
  FIT: 'Apto',
  UNFIT: 'Inapto',
  FIT_WITH_RESTRICTIONS: 'Apto com restrições',
  PENDING: 'Pendente',
}

const examSchema = z.object({
  employeeId: z.string().uuid('Selecione o colaborador'),
  examType: z.enum(['ADMISSIONAL', 'PERIODIC', 'RETURN_TO_WORK', 'ROLE_CHANGE', 'DISMISSAL', 'COMPLEMENTARY']),
  name: z.string().min(2, 'Informe o exame'),
  provider: z.string().optional(),
  performedAt: z.string().optional(),
  dueDate: z.string().min(1, 'Informe o vencimento'),
  result: z.enum(['FIT', 'UNFIT', 'FIT_WITH_RESTRICTIONS', 'PENDING']),
  asoIssued: z.coerce.boolean().default(false),
  asoNumber: z.string().optional(),
  notes: z.string().optional(),
})

type ExamFormData = z.infer<typeof examSchema>
type StatusFilter = 'all' | 'expired' | 'expiring' | 'valid'

export default function ExamesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OccupationalExam | null>(null)

  const { data: examsData, isLoading } = useOccupationalExams({
    page: 1,
    perPage: 100,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
  })
  const { data: employeesData } = useEmployees({ page: 1, perPage: 100, isActive: true })
  const createExam = useCreateOccupationalExam()
  const updateExam = useUpdateOccupationalExam()

  const exams = examsData?.data ?? []
  const employees = employeesData?.data ?? []
  const expiredCount = exams.filter((exam) => exam.isExpired).length
  const expiringCount = exams.filter((exam) => exam.isExpiring).length
  const pendingCount = exams.filter((exam) => exam.result === 'PENDING').length

  const employeeOptions = useMemo(
    () => employees.map((employee) => ({ id: employee.id, label: employee.name })),
    [employees],
  )

  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      employeeId: '',
      examType: 'PERIODIC',
      name: '',
      provider: '',
      performedAt: '',
      dueDate: new Date().toISOString().split('T')[0],
      result: 'PENDING',
      asoIssued: false,
      asoNumber: '',
      notes: '',
    },
  })

  function openCreateDialog() {
    setEditing(null)
    form.reset({
      employeeId: '',
      examType: 'PERIODIC',
      name: '',
      provider: '',
      performedAt: '',
      dueDate: new Date().toISOString().split('T')[0],
      result: 'PENDING',
      asoIssued: false,
      asoNumber: '',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(exam: OccupationalExam) {
    setEditing(exam)
    form.reset({
      employeeId: exam.employeeId,
      examType: exam.examType,
      name: exam.name,
      provider: exam.provider ?? '',
      performedAt: exam.performedAt ? exam.performedAt.split('T')[0] : '',
      dueDate: exam.dueDate.split('T')[0],
      result: exam.result,
      asoIssued: exam.asoIssued,
      asoNumber: exam.asoNumber ?? '',
      notes: exam.notes ?? '',
    })
    setIsDialogOpen(true)
  }

  async function saveExam(values: ExamFormData) {
    const payload = {
      ...values,
      provider: values.provider || undefined,
      performedAt: values.performedAt || undefined,
      asoNumber: values.asoNumber || undefined,
      notes: values.notes || undefined,
    }

    if (editing) {
      await updateExam.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createExam.mutateAsync(payload)
    }
    setIsDialogOpen(false)
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
  const isSaving = createExam.isPending || updateExam.isPending

  return (
    <>
      <Topbar title="Exames Ocupacionais" subtitle="Controle real de exames, ASO e vencimentos" />
      <div className="space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <HealthMetric icon={Stethoscope} label="Exames registrados" value={examsData?.meta.total ?? 0} />
          <HealthMetric icon={CalendarClock} label="A vencer em 30 dias" value={expiringCount} tone="warning" />
          <HealthMetric icon={CalendarClock} label="Vencidos" value={expiredCount} tone="danger" />
        </div>

        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-96">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por exame, clínica, ASO ou colaborador..." className="pl-9" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className={selectClass}>
              <option value="all">Todos</option>
              <option value="expired">Vencidos</option>
              <option value="expiring">A vencer</option>
              <option value="valid">Válidos</option>
            </select>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo exame
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : exams.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Stethoscope className="h-8 w-8" />
                <p className="text-sm">Nenhum exame encontrado.</p>
              </div>
            ) : (
              <div className="divide-y">
                {exams.map((exam) => (
                  <div key={exam.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{exam.name}</p>
                        <Badge variant={exam.isExpired ? 'destructive' : exam.isExpiring ? 'secondary' : 'outline'}>
                          {exam.isExpired ? 'Vencido' : exam.isExpiring ? 'A vencer' : 'Válido'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{exam.employeeName ?? 'Colaborador'} · {EXAM_TYPE_LABELS[exam.examType]}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{exam.provider ?? 'Clínica não informada'}</p>
                      <p>{exam.unitName ?? 'Unidade'}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{formatDate(exam.dueDate)}</p>
                      <p className="text-muted-foreground">{RESULT_LABELS[exam.result]}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(exam)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {pendingCount > 0 && (
          <p className="text-xs text-muted-foreground">{pendingCount} exame(s) ainda aguardam resultado.</p>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar exame' : 'Novo exame ocupacional'}</DialogTitle>
            <DialogDescription>O vínculo de empresa, unidade e função será derivado do colaborador selecionado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(saveExam)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <select disabled={!!editing} className={selectClass} {...form.register('employeeId')}>
                  <option value="">Selecione</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className={selectClass} {...form.register('examType')}>
                  {Object.entries(EXAM_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Exame</Label>
                <Input {...form.register('name')} placeholder="Ex: Hemograma completo" />
              </div>
              <div className="space-y-2">
                <Label>Clínica / fornecedor</Label>
                <Input {...form.register('provider')} placeholder="Ex: Clínica ocupacional" />
              </div>
              <div className="space-y-2">
                <Label>Realizado em</Label>
                <Input type="date" {...form.register('performedAt')} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" {...form.register('dueDate')} />
              </div>
              <div className="space-y-2">
                <Label>Resultado</Label>
                <select className={selectClass} {...form.register('result')}>
                  {Object.entries(RESULT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Número do ASO</Label>
                <Input {...form.register('asoNumber')} placeholder="Opcional" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('asoIssued')} />
              ASO emitido
            </label>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea {...form.register('notes')} placeholder="Observações clínicas/administrativas permitidas no contexto ocupacional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HealthMetric({ icon: Icon, label, value, tone = 'default' }: {
  icon: LucideIcon
  label: string
  value: number
  tone?: 'default' | 'warning' | 'danger'
}) {
  const toneClass = tone === 'danger' ? 'text-destructive' : tone === 'warning' ? 'text-amber-600' : 'text-primary'
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${toneClass}`} />
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value))
}
