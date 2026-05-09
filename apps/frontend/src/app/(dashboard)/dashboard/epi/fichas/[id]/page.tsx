'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, HardHat, Loader2, Plus, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Topbar } from '@/components/layout/topbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useEmployee } from '@/hooks/use-employees'
import { useCompanies } from '@/hooks/use-companies'
import { useEpiItems } from '@/hooks/use-epi-items'
import { useEmployeeEpiCard, useCreateEpiDelivery } from '@/hooks/use-epi-deliveries'
import type { EpiDeliveryReason, EpiDeliveryCondition } from '@/lib/api/epi-deliveries.api'

// ─── Constantes ───────────────────────────────────────────────────────────────

const REASON_LABELS: Record<EpiDeliveryReason, string> = {
  ADMISSION: 'Admissão',
  PERIODIC: 'Periódica',
  REPLACEMENT: 'Reposição',
  FUNCTION_CHANGE: 'Mudança de função',
  CA_RENEWAL: 'Renovação CA',
  OTHER: 'Outro',
}

const CONDITION_LABELS: Record<EpiDeliveryCondition, string> = {
  NEW: 'Novo',
  USED: 'Usado',
}

// ─── Schema entrega ───────────────────────────────────────────────────────────

const entregaSchema = z.object({
  epiItemId: z.string().uuid('Selecione o EPI'),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
  deliveredAt: z.string().min(1, 'Informe a data'),
  reason: z.enum(['ADMISSION', 'PERIODIC', 'REPLACEMENT', 'FUNCTION_CHANGE', 'CA_RENEWAL', 'OTHER']),
  condition: z.enum(['NEW', 'USED']),
  deliveredBy: z.string().optional(),
  notes: z.string().optional(),
})
type EntregaFormData = z.infer<typeof entregaSchema>

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2')
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value.includes('T') ? value : `${value}T00:00:00`).toLocaleDateString('pt-BR')
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EpiFichaPage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = String(params.id ?? '')

  const [modalAberto, setModalAberto] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const employeeQuery = useEmployee(employeeId)
  const employee = employeeQuery.data

  const { data: companiesData } = useCompanies({ page: 1, perPage: 100 })
  const { data: epiData } = useEpiItems({ page: 1, perPage: 100 })
  const deliveriesQuery = useEmployeeEpiCard(employeeId)
  const createDelivery = useCreateEpiDelivery()

  const companies = companiesData?.data ?? []
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.tradeName ?? c.name]))
  const allEpis = epiData?.data ?? []
  const episDaEmpresa = employee
    ? allEpis.filter((e) => e.isActive && e.companyId === employee.companyId)
    : []
  const deliveries = deliveriesQuery.data ?? []

  const form = useForm<EntregaFormData>({
    resolver: zodResolver(entregaSchema),
    defaultValues: {
      epiItemId: '',
      quantity: 1,
      deliveredAt: new Date().toISOString().split('T')[0],
      reason: 'ADMISSION',
      condition: 'NEW',
      deliveredBy: '',
      notes: '',
    },
  })

  function abrirModal() {
    setErroModal(null)
    form.reset({
      epiItemId: '',
      quantity: 1,
      deliveredAt: new Date().toISOString().split('T')[0],
      reason: 'ADMISSION',
      condition: 'NEW',
      deliveredBy: '',
      notes: '',
    })
    setModalAberto(true)
  }

  async function salvar(data: EntregaFormData) {
    if (!employee) return
    setErroModal(null)
    try {
      await createDelivery.mutateAsync({
        companyId: employee.companyId,
        employeeId: employee.id,
        epiItemId: data.epiItemId,
        quantity: data.quantity,
        deliveredAt: data.deliveredAt,
        reason: data.reason,
        condition: data.condition,
        deliveredBy: data.deliveredBy || undefined,
        notes: data.notes || undefined,
      })
      await deliveriesQuery.refetch()
      setModalAberto(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setErroModal(msg ?? 'Erro ao registrar entrega. Verifique o estoque disponível.')
    }
  }

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'

  return (
    <>
      <Topbar
        title="Ficha de EPI"
        subtitle={employee?.name ?? 'Histórico de entregas do colaborador'}
      />

      <div className="space-y-4 p-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/epi')}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Voltar para EPIs
        </Button>

        {/* Loading / Error do colaborador */}
        {employeeQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando colaborador...
            </CardContent>
          </Card>
        )}
        {employeeQuery.isError && (
          <Card>
            <CardContent className="py-12 text-center text-sm text-destructive">
              Não foi possível carregar o colaborador.
            </CardContent>
          </Card>
        )}

        {employee && (
          <>
            {/* Card do colaborador */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-primary" />
                  {employee.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-medium">{formatCpf(employee.cpf)}</p>
                </div>
                {employee.registration && (
                  <div>
                    <p className="text-xs text-muted-foreground">Matrícula</p>
                    <p className="font-medium">{employee.registration}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Empresa</p>
                  <p className="font-medium">{companyMap[employee.companyId] ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Admissão</p>
                  <p className="font-medium">{formatDate(employee.admissionDate)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de entregas */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardHat className="h-4 w-4 text-primary" />
                  Ficha de EPI — {deliveries.length} entrega{deliveries.length !== 1 ? 's' : ''}
                </CardTitle>
                <Button size="sm" onClick={abrirModal}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nova Entrega
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">EPI</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CA</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qtd.</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Motivo</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entregue por</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Devolvido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveriesQuery.isLoading && (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                            Carregando entregas...
                          </td>
                        </tr>
                      )}
                      {!deliveriesQuery.isLoading && deliveries.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                            <HardHat className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Nenhuma entrega de EPI registrada para este colaborador
                          </td>
                        </tr>
                      )}
                      {deliveries.map((d) => (
                        <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">{d.epiItemName}</td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.caNumberSnapshot}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{d.quantity}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.deliveredAt)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{REASON_LABELS[d.reason]}</td>
                          <td className="px-4 py-3">
                            <Badge variant={d.condition === 'NEW' ? 'success' : 'secondary'}>
                              {CONDITION_LABELS[d.condition]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{d.deliveredBy ?? '—'}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{d.returnedAt ? formatDate(d.returnedAt) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Modal Nova Entrega */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Entrega de EPI</DialogTitle>
            <DialogDescription>
              Entrega para <strong>{employee?.name}</strong>. O estoque será descontado automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="epiItemFicha">EPI *</Label>
              <select id="epiItemFicha" className={selectClass} {...form.register('epiItemId')}>
                <option value="">Selecione o EPI</option>
                {episDaEmpresa.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} (CA {e.caNumber}) — Estoque: {e.stockQuantity}
                  </option>
                ))}
              </select>
              {form.formState.errors.epiItemId && (
                <p className="text-xs text-destructive">{form.formState.errors.epiItemId.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantityFicha">Quantidade *</Label>
                <Input id="quantityFicha" type="number" min="1" {...form.register('quantity')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveredAtFicha">Data *</Label>
                <Input id="deliveredAtFicha" type="date" {...form.register('deliveredAt')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conditionFicha">Estado</Label>
                <select id="conditionFicha" className={selectClass} {...form.register('condition')}>
                  <option value="NEW">Novo</option>
                  <option value="USED">Usado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reasonFicha">Motivo *</Label>
                <select id="reasonFicha" className={selectClass} {...form.register('reason')}>
                  {Object.entries(REASON_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveredByFicha">Entregue por</Label>
                <Input id="deliveredByFicha" placeholder="Nome do responsável" {...form.register('deliveredBy')} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notesFicha">Observações</Label>
              <Input id="notesFicha" placeholder="Observações adicionais..." {...form.register('notes')} />
            </div>

            {erroModal && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{erroModal}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button type="submit" disabled={createDelivery.isPending}>
                {createDelivery.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Registrar Entrega
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
