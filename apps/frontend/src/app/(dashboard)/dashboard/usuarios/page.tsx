'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Pencil, Plus, Power, Search, ShieldCheck, UserCog } from 'lucide-react'

import { Topbar } from '@/components/layout/topbar'
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
import { useCompanies } from '@/hooks/use-companies'
import { useTenants } from '@/hooks/use-tenants'
import { useUnits } from '@/hooks/use-units'
import { useCreateUser, useUpdateUser, useUsers } from '@/hooks/use-users'
import type { User, UserRole } from '@/lib/api/users.api'
import { ROLE_LABELS_PT_BR } from '@/lib/pt-br-labels'
import { useAuthStore } from '@/store/auth.store'

const ROLE_VALUES = ['SUPER_ADMIN', 'TENANT_ADMIN', 'TECNICO_SST', 'GESTOR', 'RH', 'CONSULTA'] as const
const OPERATIONAL_ROLES: UserRole[] = ['TECNICO_SST', 'GESTOR', 'RH', 'CONSULTA']

const usuarioSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(120),
  email: z.string().email('E-mail inválido'),
  password: z.string().optional(),
  role: z.enum(ROLE_VALUES),
  tenantId: z.string().optional(),
  isActive: z.boolean(),
  companyIds: z.array(z.string()),
  unitIds: z.array(z.string()),
})

type UsuarioFormData = z.infer<typeof usuarioSchema>

const DEFAULT_FORM: UsuarioFormData = {
  name: '',
  email: '',
  password: '',
  role: 'CONSULTA',
  tenantId: '',
  isActive: true,
  companyIds: [],
  unitIds: [],
}

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'

function roleVariant(role: UserRole): 'default' | 'secondary' | 'success' | 'warning' | 'muted' {
  if (role === 'SUPER_ADMIN') return 'default'
  if (role === 'TENANT_ADMIN') return 'warning'
  if (role === 'TECNICO_SST') return 'success'
  if (role === 'CONSULTA') return 'muted'
  return 'secondary'
}

function validatePassword(password: string | undefined): string | null {
  const value = password ?? ''
  if (value.length < 8) return 'Senha deve ter ao menos 8 caracteres'
  if (value.length > 128) return 'Senha deve ter no máximo 128 caracteres'
  if (!/[a-z]/.test(value)) return 'Senha deve conter letra minúscula'
  if (!/[A-Z]/.test(value)) return 'Senha deve conter letra maiúscula'
  if (!/[0-9]/.test(value)) return 'Senha deve conter número'
  if (!/[^A-Za-z0-9]/.test(value)) return 'Senha deve conter caractere especial'
  return null
}

function formatDate(value: string | null) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleDateString('pt-BR')
}

function scopeLabel(user: User) {
  if (user.role === 'SUPER_ADMIN') return 'Plataforma inteira'
  if (user.role === 'TENANT_ADMIN') return 'Ambiente inteiro'

  const companies = user.companyIds.length
  const units = user.unitIds.length
  const companyText = `${companies} empresa${companies !== 1 ? 's' : ''}`
  const unitText = units ? ` / ${units} unidade${units !== 1 ? 's' : ''}` : ''

  return `${companyText}${unitText}`
}

export default function UsuariosPage() {
  const currentUser = useAuthStore((s) => s.user)
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  const [busca, setBusca] = useState('')
  const [filtroTenantId, setFiltroTenantId] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<User | null>(null)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: DEFAULT_FORM,
  })

  const selectedRole = form.watch('role') as UserRole
  const selectedTenantId = form.watch('tenantId')
  const selectedCompanyIds = form.watch('companyIds')
  const selectedUnitIds = form.watch('unitIds')
  const selectedIsActive = form.watch('isActive')
  const isOperationalRole = OPERATIONAL_ROLES.includes(selectedRole)

  const usersQuery = useUsers({
    page: 1,
    perPage: 100,
    tenantId: isSuperAdmin && filtroTenantId ? filtroTenantId : undefined,
  })
  const tenantsQuery = useTenants({ page: 1, perPage: 100 }, isSuperAdmin)
  const tenants = tenantsQuery.data?.data ?? []
  const defaultTenantIdForModal = useMemo(() => {
    if (!isSuperAdmin) return currentUser?.tenantId ?? ''
    if (filtroTenantId) return filtroTenantId
    if (tenants.length === 1) return tenants[0].id
    return ''
  }, [currentUser?.tenantId, filtroTenantId, isSuperAdmin, tenants])
  const effectiveTenantId =
    selectedRole === 'SUPER_ADMIN'
      ? ''
      : ((editando?.tenantId ?? selectedTenantId) || defaultTenantIdForModal)

  const companiesQuery = useCompanies({
    page: 1,
    perPage: 100,
    tenantId: isSuperAdmin && effectiveTenantId ? effectiveTenantId : undefined,
  }, !isSuperAdmin || Boolean(effectiveTenantId))
  const unitsQuery = useUnits({ page: 1, perPage: 100 })
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const tenantMap = useMemo(
    () => Object.fromEntries(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  )

  const companies = useMemo(() => {
    const allCompanies = companiesQuery.data?.data ?? []
    if (!isSuperAdmin) return allCompanies
    if (!effectiveTenantId) return []
    return allCompanies.filter((company) => company.tenantId === effectiveTenantId)
  }, [companiesQuery.data?.data, effectiveTenantId, isSuperAdmin])

  const visibleUnits = useMemo(() => {
    const companyIds = new Set(selectedCompanyIds)
    return (unitsQuery.data?.data ?? []).filter((unit) => {
      const matchesCompany = companyIds.has(unit.companyId)
      const matchesTenant = !effectiveTenantId || unit.tenantId === effectiveTenantId
      return matchesCompany && matchesTenant
    })
  }, [effectiveTenantId, selectedCompanyIds, unitsQuery.data?.data])

  const usuarios = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const allUsers = usersQuery.data?.data ?? []
    if (!termo) return allUsers

    return allUsers.filter((user) => (
      user.name.toLowerCase().includes(termo) ||
      user.email.toLowerCase().includes(termo) ||
      ROLE_LABELS_PT_BR[user.role].toLowerCase().includes(termo)
    ))
  }, [busca, usersQuery.data?.data])

  const roleOptions = isSuperAdmin ? ROLE_VALUES : OPERATIONAL_ROLES
  const isSaving = createUser.isPending || updateUser.isPending

  useEffect(() => {
    if (!modalAberto || !!editando || !isSuperAdmin) return
    if (selectedRole === 'SUPER_ADMIN') return
    if (selectedTenantId || !defaultTenantIdForModal) return

    form.setValue('tenantId', defaultTenantIdForModal, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [defaultTenantIdForModal, editando, form, isSuperAdmin, modalAberto, selectedRole, selectedTenantId])

  function canManage(target: User) {
    if (isSuperAdmin) return true
    return target.role !== 'SUPER_ADMIN' && target.role !== 'TENANT_ADMIN'
  }

  function abrirModalNovo() {
    setEditando(null)
    setErroModal(null)
    form.reset({
      ...DEFAULT_FORM,
      role: isSuperAdmin ? 'TENANT_ADMIN' : 'CONSULTA',
      tenantId: defaultTenantIdForModal,
    })
    setModalAberto(true)
  }

  function abrirModalEditar(user: User) {
    if (!canManage(user)) return
    setEditando(user)
    setErroModal(null)
    form.reset({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      tenantId: user.tenantId ?? '',
      isActive: user.isActive,
      companyIds: user.companyIds,
      unitIds: user.unitIds,
    })
    setModalAberto(true)
  }

  function alterarRole(role: UserRole) {
    form.setValue('role', role, { shouldDirty: true, shouldValidate: true })
    if (role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN') {
      form.setValue('companyIds', [], { shouldDirty: true })
      form.setValue('unitIds', [], { shouldDirty: true })
    }
    if (role === 'SUPER_ADMIN') {
      form.setValue('tenantId', '', { shouldDirty: true })
      return
    }
    if (isSuperAdmin && !form.getValues('tenantId') && defaultTenantIdForModal) {
      form.setValue('tenantId', defaultTenantIdForModal, { shouldDirty: true, shouldValidate: true })
    }
  }

  function alterarTenant(tenantId: string) {
    form.setValue('tenantId', tenantId, { shouldDirty: true, shouldValidate: true })
    form.setValue('companyIds', [], { shouldDirty: true })
    form.setValue('unitIds', [], { shouldDirty: true })
  }

  function alternarEmpresa(companyId: string) {
    const current = form.getValues('companyIds')
    const next = current.includes(companyId)
      ? current.filter((id) => id !== companyId)
      : [...current, companyId]
    const allowedUnits = (unitsQuery.data?.data ?? [])
      .filter((unit) => next.includes(unit.companyId))
      .map((unit) => unit.id)

    form.setValue('companyIds', next, { shouldDirty: true, shouldValidate: true })
    form.setValue(
      'unitIds',
      form.getValues('unitIds').filter((unitId) => allowedUnits.includes(unitId)),
      { shouldDirty: true },
    )
  }

  function alternarUnidade(unitId: string) {
    const current = form.getValues('unitIds')
    const next = current.includes(unitId)
      ? current.filter((id) => id !== unitId)
      : [...current, unitId]
    form.setValue('unitIds', next, { shouldDirty: true })
  }

  async function salvar(data: UsuarioFormData) {
    setErroModal(null)

    const role = data.role as UserRole
    const tenantId = role === 'SUPER_ADMIN' ? null : isSuperAdmin ? data.tenantId : undefined
    const companyIds = role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN' ? [] : data.companyIds
    const unitIds = role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN' ? [] : data.unitIds

    if (!isSuperAdmin && (role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN')) {
      setErroModal('Administrador do ambiente só pode gerenciar usuários operacionais.')
      return
    }

    if (isSuperAdmin && role !== 'SUPER_ADMIN' && !tenantId) {
      setErroModal('Selecione o ambiente do usuário.')
      return
    }

    if (OPERATIONAL_ROLES.includes(role) && companyIds.length === 0) {
      setErroModal('Usuários operacionais precisam de ao menos uma empresa liberada.')
      return
    }

    if (!editando) {
      const passwordError = validatePassword(data.password)
      if (passwordError) {
        setErroModal(passwordError)
        return
      }
    }

    try {
      if (editando) {
        await updateUser.mutateAsync({
          id: editando.id,
          name: data.name,
          role,
          isActive: editando.id === currentUser?.id ? true : data.isActive,
          companyIds,
          unitIds,
        })
      } else {
        await createUser.mutateAsync({
          tenantId,
          name: data.name,
          email: data.email.trim().toLowerCase(),
          password: data.password ?? '',
          role,
          isActive: data.isActive,
          companyIds,
          unitIds,
        })
      }

      await usersQuery.refetch()
      setModalAberto(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      setErroModal(msg ?? 'Erro ao salvar usuário. Verifique os dados e tente novamente.')
    }
  }

  async function alternarStatus(user: User) {
    if (!canManage(user) || user.id === currentUser?.id) return
    try {
      await updateUser.mutateAsync({ id: user.id, isActive: !user.isActive })
      await usersQuery.refetch()
    } catch {
      // Erro já exibido via toast pelo interceptor do Axios
    }
  }

  return (
    <>
      <Topbar title="Usuários" subtitle="Gerencie perfis, status e escopo de acesso" />

      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou perfil..."
                className="h-8 pl-8 text-xs"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>

            {isSuperAdmin && (
              <select
                className="h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={filtroTenantId}
                onChange={(event) => setFiltroTenantId(event.target.value)}
              >
                <option value="">Todos os ambientes</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button size="sm" onClick={abrirModalNovo}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Usuário
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Perfil
                    </th>
                    {isSuperAdmin && (
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Ambiente
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Escopo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Último acesso
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.isLoading && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-sm text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
                        Carregando usuários...
                      </td>
                    </tr>
                  )}

                  {usersQuery.isError && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-sm text-destructive">
                        Erro ao carregar usuários.
                      </td>
                    </tr>
                  )}

                  {!usersQuery.isLoading && !usersQuery.isError && usuarios.length === 0 && (
                    <tr>
                      <td colSpan={isSuperAdmin ? 7 : 6} className="py-12 text-center text-sm text-muted-foreground">
                        <UserCog className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}

                  {usuarios.map((user) => {
                    const manageable = canManage(user)
                    const isSelf = user.id === currentUser?.id

                    return (
                      <tr key={user.id} className="border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={roleVariant(user.role)}>{ROLE_LABELS_PT_BR[user.role]}</Badge>
                        </td>
                        {isSuperAdmin && (
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {user.tenantId ? tenantMap[user.tenantId] ?? user.tenantId : 'Plataforma'}
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {scopeLabel(user)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? 'success' : 'secondary'}>
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(user.lastLoginAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!manageable}
                              onClick={() => abrirModalEditar(user)}
                              title={manageable ? 'Editar usuário' : 'Perfil protegido'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!manageable || isSelf}
                              onClick={() => alternarStatus(user)}
                              title={user.isActive ? 'Inativar' : 'Ativar'}
                            >
                              <Power className={`h-3.5 w-3.5 ${user.isActive ? 'text-destructive' : 'text-success'}`} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} encontrado{usuarios.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editando ? 'Atualize o perfil, status e escopo.' : 'Cadastre o usuário com o menor escopo necessário.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" placeholder="Nome completo" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  disabled={!!editando}
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            {!editando && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha inicial *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...form.register('password')}
                />
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="role">Perfil *</Label>
                <select
                  id="role"
                  className={selectClass}
                  value={selectedRole}
                  onChange={(event) => alterarRole(event.target.value as UserRole)}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS_PT_BR[role]}
                    </option>
                  ))}
                </select>
              </div>

              {isSuperAdmin && selectedRole !== 'SUPER_ADMIN' && (
                <div className="space-y-1.5">
                  <Label htmlFor="tenantId">Ambiente *</Label>
                  <select
                    id="tenantId"
                    className={selectClass}
                    value={selectedTenantId}
                    disabled={!!editando}
                    onChange={(event) => alterarTenant(event.target.value)}
                  >
                    <option value="">Selecione o ambiente</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={selectedIsActive}
                disabled={editando?.id === currentUser?.id}
                onChange={(event) => form.setValue('isActive', event.target.checked, { shouldDirty: true })}
              />
              Usuário ativo
            </label>

            {isOperationalRole && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-border">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Empresas liberadas</p>
                  </div>
                  <div className="max-h-44 space-y-1 overflow-y-auto p-2">
                    {companies.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        {isSuperAdmin && !effectiveTenantId
                          ? 'Selecione o ambiente para carregar as empresas'
                          : companiesQuery.isError
                            ? 'Erro ao carregar empresas do ambiente'
                          : companiesQuery.isLoading
                            ? 'Carregando empresas...'
                            : 'Nenhuma empresa disponível'}
                      </p>
                    )}
                    {companies.map((company) => (
                      <label key={company.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedCompanyIds.includes(company.id)}
                          onChange={() => alternarEmpresa(company.id)}
                        />
                        <span className="truncate">{company.tradeName ?? company.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-border">
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidades liberadas</p>
                  </div>
                  <div className="max-h-44 space-y-1 overflow-y-auto p-2">
                    {selectedCompanyIds.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        Selecione uma empresa
                      </p>
                    )}
                    {selectedCompanyIds.length > 0 && unitsQuery.isError && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        Erro ao carregar unidades
                      </p>
                    )}
                    {selectedCompanyIds.length > 0 && visibleUnits.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        Nenhuma unidade disponível
                      </p>
                    )}
                    {visibleUnits.map((unit) => (
                      <label key={unit.id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={selectedUnitIds.includes(unit.id)}
                          onChange={() => alternarUnidade(unit.id)}
                        />
                        <span className="truncate">{unit.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {erroModal && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {erroModal}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {editando ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
