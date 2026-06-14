'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CalendarClock, GraduationCap, Loader2, Pencil, Plus, Search, type LucideIcon } from 'lucide-react'
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
import { useCreateTraining, useTrainings, useUpdateTraining } from '@/hooks/use-trainings'
import type { Training, TrainingStatus } from '@/lib/api/trainings.api'

const STATUS_LABELS: Record<TrainingStatus, string> = {
  SCHEDULED: 'Agendado',
  COMPLETED: 'Concluído',
  EXPIRED: 'Vencido',
  CANCELED: 'Cancelado',
}

const trainingSchema = z.object({
  employeeId: z.string().uuid('Selecione o colaborador'),
  name: z.string().min(2, 'Informe o treinamento'),
  provider: z.string().optional(),
  workloadHours: z.coerce.number().optional(),
  completedAt: z.string().optional(),
  dueDate: z.string().min(1, 'Informe o vencimento'),
  certificateUrl: z.string().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'EXPIRED', 'CANCELED']),
  notes: z.string().optional(),
})

type TrainingFormData = z.infer<typeof trainingSchema>
type StatusFilter = 'all' | 'expired' | 'expiring' | 'valid'

export default function TreinamentosPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Training | null>(null)

  const { data: trainingsData, isLoading } = useTrainings({
    page: 1,
    perPage: 200,
    search: search || undefined,
    status: status === 'all' ? undefined : status,
  })
  const { data: employeesData } = useEmployees({ page: 1, perPage: 200, isActive: true })
  const createTraining = useCreateTraining()
  const updateTraining = useUpdateTraining()

  const trainings = trainingsData?.data ?? []
  const employees = employeesData?.data ?? []
  const expiredCount = trainings.filter((training) => training.isExpired).length
  const expiringCount = trainings.filter((training) => training.isExpiring).length
  const completedCount = trainings.filter((training) => training.status === 'COMPLETED').length

  const employeeOptions = useMemo(
    () => employees.map((employee) => ({ id: employee.id, label: employee.name })),
    [employees],
  )

  const form = useForm<TrainingFormData>({
    resolver: zodResolver(trainingSchema),
    defaultValues: {
      employeeId: '',
      name: '',
      provider: '',
      workloadHours: undefined,
      completedAt: '',
      dueDate: new Date().toISOString().split('T')[0],
      certificateUrl: '',
      status: 'SCHEDULED',
      notes: '',
    },
  })

  function openCreateDialog() {
    setEditing(null)
    form.reset({
      employeeId: '',
      name: '',
      provider: '',
      workloadHours: undefined,
      completedAt: '',
      dueDate: new Date().toISOString().split('T')[0],
      certificateUrl: '',
      status: 'SCHEDULED',
      notes: '',
    })
    setIsDialogOpen(true)
  }

  function openEditDialog(training: Training) {
    setEditing(training)
    form.reset({
      employeeId: training.employeeId,
      name: training.name,
      provider: training.provider ?? '',
      workloadHours: training.workloadHours ?? undefined,
      completedAt: training.completedAt ? training.completedAt.split('T')[0] : '',
      dueDate: training.dueDate.split('T')[0],
      certificateUrl: training.certificateUrl ?? '',
      status: training.status,
      notes: training.notes ?? '',
    })
    setIsDialogOpen(true)
  }

  async function saveTraining(values: TrainingFormData) {
    const payload = {
      ...values,
      provider: values.provider || undefined,
      workloadHours: values.workloadHours || undefined,
      completedAt: values.completedAt || undefined,
      certificateUrl: values.certificateUrl || undefined,
      notes: values.notes || undefined,
    }

    if (editing) {
      await updateTraining.mutateAsync({ id: editing.id, ...payload })
    } else {
      await createTraining.mutateAsync(payload)
    }
    setIsDialogOpen(false)
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
  const isSaving = createTraining.isPending || updateTraining.isPending

  return (
    <>
      <Topbar title="Treinamentos" subtitle="Controle real de capacitações obrigatórias e vencimentos" />
      <div className="space-y-5 p-6">
        <div className="grid gap-3 md:grid-cols-3">
          <TrainingMetric icon={GraduationCap} label="Treinamentos registrados" value={trainingsData?.meta.total ?? 0} />
          <TrainingMetric icon={CalendarClock} label="A vencer em 30 dias" value={expiringCount} tone="warning" />
          <TrainingMetric icon={GraduationCap} label="Concluídos" value={completedCount} />
        </div>

        <div className="flex flex-col gap-3 rounded-md border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-96">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por treinamento, fornecedor ou colaborador..." className="pl-9" />
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
              Novo treinamento
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : trainings.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <GraduationCap className="h-8 w-8" />
                <p className="text-sm">Nenhum treinamento encontrado.</p>
              </div>
            ) : (
              <div className="divide-y">
                {trainings.map((training) => (
                  <div key={training.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_150px_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{training.name}</p>
                        <Badge variant={training.isExpired ? 'destructive' : training.isExpiring ? 'secondary' : 'outline'}>
                          {training.isExpired ? 'Vencido' : training.isExpiring ? 'A vencer' : 'Válido'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{training.employeeName ?? 'Colaborador'} · {training.jobFunctionName ?? 'Função'}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>{training.provider ?? 'Fornecedor não informado'}</p>
                      <p>{training.workloadHours ? `${training.workloadHours}h` : 'Carga horária não informada'}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{formatDate(training.dueDate)}</p>
                      <p className="text-muted-foreground">{STATUS_LABELS[training.status]}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(training)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {expiredCount > 0 && (
          <p className="text-xs text-muted-foreground">{expiredCount} treinamento(s) exigem reciclagem ou regularização.</p>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar treinamento' : 'Novo treinamento'}</DialogTitle>
            <DialogDescription>O vínculo de empresa, unidade e função será derivado do colaborador selecionado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(saveTraining)} className="space-y-4">
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
                <Label>Status</Label>
                <select className={selectClass} {...form.register('status')}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Treinamento</Label>
                <Input {...form.register('name')} placeholder="Ex: NR-35 Trabalho em Altura" />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor / instrutor</Label>
                <Input {...form.register('provider')} placeholder="Ex: Consultoria SST" />
              </div>
              <div className="space-y-2">
                <Label>Carga horária</Label>
                <Input type="number" min={1} {...form.register('workloadHours')} />
              </div>
              <div className="space-y-2">
                <Label>Concluído em</Label>
                <Input type="date" {...form.register('completedAt')} />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input type="date" {...form.register('dueDate')} />
              </div>
              <div className="space-y-2">
                <Label>URL do certificado</Label>
                <Input {...form.register('certificateUrl')} placeholder="Opcional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea {...form.register('notes')} placeholder="Observações sobre turma, reciclagem ou pendências" />
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

function TrainingMetric({ icon: Icon, label, value, tone = 'default' }: {
  icon: LucideIcon
  label: string
  value: number
  tone?: 'default' | 'warning'
}) {
  const toneClass = tone === 'warning' ? 'text-amber-600' : 'text-primary'
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
