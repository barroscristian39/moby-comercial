'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PasswordPolicySchema } from '@moby/shared'
import { AlertCircle, Building2, Loader2, Plus, Search, ShieldCheck } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateTenant, useTenants } from '@/hooks/use-tenants'
import { getTenantStatusLabelPtBr } from '@/lib/pt-br-labels'

const tenantSchema = z.object({
  name: z.string().min(2, 'Informe o nome do ambiente'),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minúsculas, números e hífens')
    .optional()
    .or(z.literal('')),
  plan: z.string().min(1, 'Informe o plano'),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED']),
  adminName: z.string().min(2, 'Informe o nome do administrador'),
  adminEmail: z.string().email('Informe um e-mail válido'),
  adminPassword: PasswordPolicySchema,
})

type TenantFormData = z.infer<typeof tenantSchema>

const statusVariantMap = {
  ACTIVE: 'success',
  TRIAL: 'warning',
  SUSPENDED: 'secondary',
  CANCELED: 'destructive',
} as const

export default function TenantsPage() {
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useTenants({ page: 1, perPage: 100 })
  const createTenant = useCreateTenant()

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      slug: '',
      plan: 'manual',
      status: 'TRIAL',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    },
  })

  const tenants = data?.data ?? []
  const tenantsFiltrados = useMemo(() => {
    if (!busca) return tenants
    const termo = busca.toLowerCase()
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(termo) ||
      tenant.slug.toLowerCase().includes(termo) ||
      tenant.plan.toLowerCase().includes(termo),
    )
  }, [busca, tenants])

  function abrirModalNovo() {
    form.reset({
      name: '',
      slug: '',
      plan: 'manual',
      status: 'TRIAL',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    })
    setErroModal(null)
    setModalAberto(true)
  }

  async function salvar(data: TenantFormData) {
    setErroModal(null)
    try {
      await createTenant.mutateAsync({
        name: data.name,
        slug: data.slug || undefined,
        plan: data.plan,
        status: data.status,
        isActive: data.status === 'ACTIVE' || data.status === 'TRIAL',
        startDate: new Date().toISOString(),
        admin: {
          name: data.adminName,
          email: data.adminEmail,
          password: data.adminPassword,
        },
      })

      await refetch()
      setModalAberto(false)
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Erro ao criar ambiente'
      setErroModal(msg)
    }
  }

  const isSaving = createTenant.isPending

  return (
    <>
      <Topbar title="Ambientes" subtitle="Crie o ambiente inicial antes de cadastrar a primeira empresa" />

      <div className="p-6 space-y-4">
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Um ambiente representa a estrutura principal do cliente. Ao criar um ambiente, o MOBY também cria o administrador inicial desse ambiente.
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome, identificador ou plano..."
              className="h-8 pl-8 text-xs"
            />
          </div>

          <Button size="sm" onClick={abrirModalNovo}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo Ambiente
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ambiente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificador</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plano</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situação</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cadastro</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin opacity-50" />
                        Carregando ambientes...
                      </td>
                    </tr>
                  )}

                  {isError && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-destructive">
                        Não foi possível carregar os ambientes.
                      </td>
                    </tr>
                  )}

                  {!isLoading && !isError && tenantsFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        <Building2 className="mx-auto mb-2 h-8 w-8 opacity-30" />
                        Nenhum ambiente cadastrado.
                      </td>
                    </tr>
                  )}

                  {tenantsFiltrados.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{tenant.id}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{tenant.slug}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tenant.plan}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariantMap[tenant.status]}>{getTenantStatusLabelPtBr(tenant.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          {tenantsFiltrados.length} ambiente{tenantsFiltrados.length !== 1 ? 's' : ''} encontrado{tenantsFiltrados.length !== 1 ? 's' : ''}
        </p>
      </div>

      <Dialog open={modalAberto} onOpenChange={(open) => { setModalAberto(open); if (!open) setErroModal(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Ambiente</DialogTitle>
            <DialogDescription>
              Cadastre o ambiente e o administrador inicial que terá acesso à operação do cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(salvar)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-name">Nome do ambiente *</Label>
                <Input id="tenant-name" placeholder="Ex: Acme Industrial" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-slug">Identificador</Label>
                <Input id="tenant-slug" placeholder="acme-industrial" {...form.register('slug')} />
                {form.formState.errors.slug && (
                  <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tenant-plan">Plano *</Label>
                <Input id="tenant-plan" placeholder="manual" {...form.register('plan')} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tenant-status">Situação inicial *</Label>
                <select
                  id="tenant-status"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...form.register('status')}
                >
                  <option value="TRIAL">{getTenantStatusLabelPtBr('TRIAL')}</option>
                  <option value="ACTIVE">{getTenantStatusLabelPtBr('ACTIVE')}</option>
                  <option value="SUSPENDED">{getTenantStatusLabelPtBr('SUSPENDED')}</option>
                  <option value="CANCELED">{getTenantStatusLabelPtBr('CANCELED')}</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Administrador inicial</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-name">Nome *</Label>
                  <Input id="admin-name" placeholder="Nome completo" {...form.register('adminName')} />
                  {form.formState.errors.adminName && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-email">E-mail *</Label>
                  <Input id="admin-email" type="email" placeholder="admin@cliente.com" {...form.register('adminEmail')} />
                  {form.formState.errors.adminEmail && (
                    <p className="text-xs text-destructive">{form.formState.errors.adminEmail.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <Label htmlFor="admin-password">Senha *</Label>
                <Input id="admin-password" type="password" placeholder="Mínimo 8 caracteres" {...form.register('adminPassword')} />
                {form.formState.errors.adminPassword && (
                  <p className="text-xs text-destructive">{form.formState.errors.adminPassword.message}</p>
                )}
              </div>
            </div>

            {erroModal && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{erroModal}</span>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Criar Ambiente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
