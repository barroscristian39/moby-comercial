'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Pencil, Power, Building2, LogIn, Loader2 } from 'lucide-react'
import { Permission } from '@moby/shared'

import { Topbar } from '@/components/layout/topbar'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore } from '@/store/company.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

import { useCompanies, useCreateCompany, useUpdateCompany } from '@/hooks/use-companies'
import { useTenants } from '@/hooks/use-tenants'
import type { Company } from '@/lib/api/companies.api'

// ─── Schema ──────────────────────────────────────────────────────────────────

const empresaSchema = z.object({
  tenantId: z.string().optional(),
  razaoSocial: z.string().min(2, 'Razão social deve ter pelo menos 2 caracteres'),
  nomeFantasia: z.string().optional(),
  cnpj: z
    .string()
    .min(14, 'CNPJ inválido')
    .max(18, 'CNPJ inválido')
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, 'Formato inválido (ex: 00.000.000/0001-00)'),
})

type EmpresaFormData = z.infer<typeof empresaSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EmpresasPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const accessContext = useAuthStore((state) => state.accessContext)
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany)
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const canManageCompanies = (accessContext?.available_permissions ?? []).includes('companies.write')
  const [busca, setBusca] = useState('')
  const [filtroTenantId, setFiltroTenantId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Company | null>(null)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useCompanies({
    page: 1,
    perPage: 100,
    tenantId: isSuperAdmin && filtroTenantId ? filtroTenantId : undefined,
  })
  const tenantsQuery = useTenants({ page: 1, perPage: 100 }, isSuperAdmin)
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()
  const tenants = tenantsQuery.data?.data ?? []

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { tenantId: '', razaoSocial: '', nomeFantasia: '', cnpj: '' },
  })

  const todasEmpresas = data?.data ?? []
  const empresas = busca
    ? todasEmpresas.filter((e) => {
        const t = busca.toLowerCase()
        return (
          e.name.toLowerCase().includes(t) ||
          (e.tradeName ?? '').toLowerCase().includes(t) ||
          e.cnpj.includes(t.replace(/\D/g, ''))
        )
      })
    : todasEmpresas

  function abrirModalNova() {
    if (!canManageCompanies) return
    setEditando(null)
    setErroModal(null)
    form.reset({ tenantId: filtroTenantId, razaoSocial: '', nomeFantasia: '', cnpj: '' })
    setModalAberto(true)
  }

  function abrirModalEditar(empresa: Company) {
    if (!canManageCompanies) return
    setEditando(empresa)
    setErroModal(null)
    form.reset({
      tenantId: empresa.tenantId,
      razaoSocial: empresa.name,
      nomeFantasia: empresa.tradeName ?? '',
      cnpj: formatCnpj(empresa.cnpj),
    })
    setModalAberto(true)
  }

  async function salvar(data: EmpresaFormData) {
    if (!canManageCompanies) return
    setErroModal(null)
    const cnpjDigits = data.cnpj.replace(/\D/g, '')

    try {
      if (editando) {
        await updateCompany.mutateAsync({
          id: editando.id,
          name: data.razaoSocial,
          tradeName: data.nomeFantasia || undefined,
          cnpj: cnpjDigits,
        })
      } else {
        if (isSuperAdmin && !data.tenantId) {
          setErroModal('Selecione o ambiente para cadastrar a empresa.')
          return
        }

        await createCompany.mutateAsync({
          tenantId: isSuperAdmin ? data.tenantId || undefined : undefined,
          name: data.razaoSocial,
          tradeName: data.nomeFantasia || undefined,
          cnpj: cnpjDigits,
        })
      }
      await refetch()
      setModalAberto(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setErroModal(msg ?? 'Erro ao salvar empresa. Verifique os dados e tente novamente.')
    }
  }

  async function alternarStatus(empresa: Company) {
    if (!canManageCompanies) return
    try {
      await updateCompany.mutateAsync({ id: empresa.id, isActive: !empresa.isActive })
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  function abrirPerfilEmpresa(companyId: string) {
    router.push(`/dashboard/empresas/${companyId}`)
  }

  function selecionarEmpresa(empresa: Company) {
    setActiveCompany({
      id: empresa.id,
      name: empresa.name,
      tradeName: empresa.tradeName,
      cnpj: empresa.cnpj,
    })
    router.push('/dashboard/gro')
  }

  const isSaving = createCompany.isPending || updateCompany.isPending

  return (
    <>
      <Topbar title="Empresas" subtitle="Gerencie as empresas cadastradas no sistema" />

      {/* ══════════════════════════════════════
          LAYOUT MOBILE — cards em lista
      ══════════════════════════════════════ */}
      <div className="md:hidden flex flex-col min-h-[calc(100vh-56px)] bg-[#EDF0F7]">

        {/* Barra de busca */}
        <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 space-y-2.5">
          {isSuperAdmin && tenants.length === 0 && !tenantsQuery.isLoading && (
            <p className="text-xs text-warning bg-warning/10 rounded-xl px-3 py-2">
              Nenhum ambiente cadastrado. Crie o primeiro antes de cadastrar empresas.
            </p>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por nome ou CNPJ..."
              className="pl-9 h-10 text-sm rounded-xl bg-slate-50 border-slate-200"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          {isSuperAdmin && (
            <select
              className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={filtroTenantId}
              onChange={(e) => setFiltroTenantId(e.target.value)}
            >
              <option value="">Todos os ambientes</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Lista de cards */}
        <div className="flex-1 px-4 pt-3 pb-32 space-y-3">

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin opacity-40" />
              <p className="text-sm">Carregando empresas...</p>
            </div>
          )}

          {isError && !isLoading && (
            <div className="text-center py-12 text-sm text-destructive">
              Erro ao carregar. Verifique a conexão.
            </div>
          )}

          {!isLoading && !isError && empresas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Building2 className="h-7 w-7 opacity-30" />
              </div>
              <p className="text-sm">Nenhuma empresa encontrada</p>
            </div>
          )}

          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.07)] transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.12)]"
              onClick={() => abrirPerfilEmpresa(empresa.id)}
            >
              {/* Corpo do card */}
              <div className="flex items-start gap-3 p-4">
                <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-800 leading-snug">
                      {empresa.tradeName ?? empresa.name}
                    </p>
                    <Badge variant={empresa.isActive ? 'success' : 'secondary'} className="shrink-0 text-[0.65rem]">
                      {empresa.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                  {empresa.tradeName && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{empresa.name}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 font-mono">{formatCnpj(empresa.cnpj)}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-0.5">
                    Cadastro: {new Date(empresa.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 px-4 pb-3">
                {empresa.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs gap-1.5 rounded-xl"
                    onClick={(event) => {
                      event.stopPropagation()
                      selecionarEmpresa(empresa)
                    }}
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Acessar
                  </Button>
                )}
                {canManageCompanies && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-xl"
                      onClick={(event) => {
                        event.stopPropagation()
                        abrirModalEditar(empresa)
                      }}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 rounded-xl"
                      onClick={(event) => {
                        event.stopPropagation()
                        alternarStatus(empresa)
                      }}
                      title={empresa.isActive ? 'Desativar' : 'Ativar'}
                    >
                      <Power className={`h-3.5 w-3.5 ${empresa.isActive ? 'text-destructive' : 'text-success'}`} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}

          {!isLoading && (
            <p className="text-center text-xs text-muted-foreground pt-1">
              {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} encontrada{empresas.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* FAB — Nova Empresa */}
        {canManageCompanies && (
          <button
            type="button"
            onClick={abrirModalNova}
            disabled={isSuperAdmin && tenants.length === 0}
            className="fixed bottom-24 right-5 z-20 h-14 w-14 rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center disabled:opacity-50"
            aria-label="Nova empresa"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════
          LAYOUT DESKTOP — tabela
      ══════════════════════════════════════ */}
      <div className="hidden md:block p-6 space-y-4">
        {isSuperAdmin && tenants.length === 0 && !tenantsQuery.isLoading && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            Nenhum ambiente cadastrado. Crie o primeiro ambiente antes de cadastrar empresas.
          </div>
        )}

        {/* Barra de ações */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex w-full max-w-2xl items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                className="pl-8 h-8 text-xs"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {isSuperAdmin && (
              <select
                className="h-8 min-w-48 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={filtroTenantId}
                onChange={(event) => setFiltroTenantId(event.target.value)}
              >
                <option value="">Todos os ambientes</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            )}
          </div>
          {canManageCompanies && (
            <Button size="sm" onClick={abrirModalNova} disabled={isSuperAdmin && tenants.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nova Empresa
            </Button>
          )}
        </div>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Empresa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">CNPJ</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cadastro</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
                        Carregando empresas...
                      </td>
                    </tr>
                  )}
                  {isError && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-destructive text-sm">
                        Erro ao carregar empresas. Verifique a conexão com o servidor.
                      </td>
                    </tr>
                  )}
                  {!isLoading && !isError && empresas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Nenhuma empresa encontrada
                      </td>
                    </tr>
                  )}
                  {empresas.map((empresa) => (
                    <tr
                      key={empresa.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => abrirPerfilEmpresa(empresa.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{empresa.tradeName ?? empresa.name}</p>
                        <p className="text-xs text-muted-foreground">{empresa.name}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{formatCnpj(empresa.cnpj)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={empresa.isActive ? 'success' : 'secondary'}>
                          {empresa.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(empresa.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {empresa.isActive && (
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); selecionarEmpresa(empresa) }} title="Acessar dashboard">
                              <LogIn className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canManageCompanies && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); abrirModalEditar(empresa) }} title="Editar empresa">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); alternarStatus(empresa) }}
                                title={empresa.isActive ? 'Desativar' : 'Ativar'}>
                                <Power className={`h-3.5 w-3.5 ${empresa.isActive ? 'text-destructive' : 'text-success'}`} />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} encontrada{empresas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {canManageCompanies && (
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
              <DialogDescription>
                {editando
                  ? 'Atualize os dados da empresa abaixo.'
                  : 'Preencha os dados para cadastrar uma nova empresa.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
              {!editando && isSuperAdmin && (
                <div className="space-y-1.5">
                  <Label htmlFor="tenantId">Ambiente *</Label>
                  <select
                    id="tenantId"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...form.register('tenantId')}
                  >
                    <option value="">Selecione o ambiente</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="razaoSocial">Razão Social *</Label>
                <Input
                  id="razaoSocial"
                  placeholder="Ex: Metalúrgica São Paulo Ltda."
                  {...form.register('razaoSocial')}
                />
                {form.formState.errors.razaoSocial && (
                  <p className="text-xs text-destructive">{form.formState.errors.razaoSocial.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                <Input
                  id="nomeFantasia"
                  placeholder="Ex: MetalSP"
                  {...form.register('nomeFantasia')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0001-00"
                  maxLength={18}
                  {...form.register('cnpj')}
                  onChange={(e) => {
                    form.setValue('cnpj', formatCnpj(e.target.value), { shouldValidate: true })
                  }}
                />
                {form.formState.errors.cnpj && (
                  <p className="text-xs text-destructive">{form.formState.errors.cnpj.message}</p>
                )}
              </div>

              {erroModal && (
                <p className="text-xs text-destructive rounded-md bg-destructive/10 px-3 py-2">{erroModal}</p>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                  {editando ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
