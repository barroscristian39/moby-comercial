'use client'

// Página de cadastro de nova empresa — formulário completo em página dedicada.
// Campos mapeados diretamente ao schema do backend (CreateCompanyDto).

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, Loader2, Search } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateCompany } from '@/hooks/use-companies'

// ─── UFs brasileiras ──────────────────────────────────────────────────────────
const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

// ─── Validação ────────────────────────────────────────────────────────────────
const schema = z.object({
  tipoDocumento:       z.enum(['CNPJ', 'CPF']).default('CNPJ'),
  name:                z.string().min(2, 'Razão social / nome obrigatório'),
  tradeName:           z.string().optional(),
  cnpj:                z.string().min(11, 'Documento inválido').max(18),
  cnae:                z.string().optional(),
  addressZipCode:      z.string().optional(),
  addressStreet:       z.string().optional(),
  addressNumber:       z.string().optional(),
  addressComplement:   z.string().optional(),
  addressNeighborhood: z.string().optional(),
  addressCity:         z.string().optional(),
  addressState:        z.string().length(2).optional().or(z.literal('')),
  phone:               z.string().optional(),
  email:               z.string().email('E-mail inválido').optional().or(z.literal('')),
  responsibleName:     z.string().optional(),
  responsibleCpf:      z.string().optional(),
  isActive:            z.boolean().default(true),
})

type FormData = z.infer<typeof schema>

// ─── Máscaras ─────────────────────────────────────────────────────────────────
function maskCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function maskDoc(v: string, tipo: 'CNPJ' | 'CPF') {
  return tipo === 'CPF' ? maskCpf(v) : maskCnpj(v)
}

function maskCep(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function NovaEmpresaPage() {
  const router = useRouter()
  const [buscandoCep, setBuscandoCep] = useState(false)
  const createCompanyMutation = useCreateCompany()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipoDocumento: 'CNPJ', isActive: true },
  })

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form
  const isActive      = watch('isActive')
  const tipoDocumento = watch('tipoDocumento')

  // Limpa o campo de documento ao trocar o tipo
  useEffect(() => { setValue('cnpj', '') }, [tipoDocumento, setValue])

  // ── Auto-preenchimento via ViaCEP ──
  async function buscarCep(cep: string) {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setValue('addressStreet',       data.logradouro || '')
        setValue('addressNeighborhood', data.bairro     || '')
        setValue('addressCity',         data.localidade || '')
        setValue('addressState',        data.uf         || '')
      }
    } catch {
      // falha silenciosa — usuário preenche manualmente
    } finally {
      setBuscandoCep(false)
    }
  }

  // ── Salvar ──
  async function salvar(data: FormData) {
    try {
      await createCompanyMutation.mutateAsync({
        name: data.name,
        tradeName: data.tradeName || undefined,
        cnpj: data.cnpj,
        cnae: data.cnae || undefined,
        addressStreet: data.addressStreet || undefined,
        addressNumber: data.addressNumber || undefined,
        addressComplement: data.addressComplement || undefined,
        addressNeighborhood: data.addressNeighborhood || undefined,
        addressCity: data.addressCity || undefined,
        addressState: data.addressState || undefined,
        addressZipCode: data.addressZipCode || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        responsibleName: data.responsibleName || undefined,
        responsibleCpf: data.responsibleCpf || undefined,
      })
      // Mutação bem-sucedida — invalidateQueries foi chamado automaticamente
      // Aguarde um pouco para o cache ser atualizado
      setTimeout(() => {
        const currentParams = new URLSearchParams(window.location.search)
        const origem = currentParams.get('retorno')
        if (origem === 'selecionar-empresa') {
          const redirect = currentParams.get('redirect')
          const params = new URLSearchParams()
          if (redirect) params.set('redirect', redirect)
          router.push(`/selecionar-empresa${params.toString() ? `?${params.toString()}` : ''}`)
        } else {
          router.push('/dashboard/empresas')
        }
      }, 1000)
    } catch (error: any) {
      // Erro já foi exibido como toast pelo interceptor
      console.error('Erro ao criar empresa:', error)
    }
  }

  return (
    <>
      <Topbar title="Nova Empresa" subtitle="Realizar novo registro" />

      <div className="p-6 max-w-4xl space-y-6">

        {/* Voltar */}
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
          Voltar
        </Button>

        <form onSubmit={handleSubmit(salvar)} className="space-y-6">

          {/* ── Tipo de Empresa ─────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Tipo de Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div
                  onClick={() => setValue('isActive', !isActive)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-foreground">Matriz</span>
              </label>
            </CardContent>
          </Card>

          {/* ── Dados da Empresa ────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Dados da Empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Tipo de Documento + Documento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo do Documento *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...register('tipoDocumento')}
                  >
                    <option value="CNPJ">CNPJ (Pessoa Jurídica)</option>
                    <option value="CPF">CPF (Pessoa Física)</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>{tipoDocumento} *</Label>
                  <Input
                    placeholder={tipoDocumento === 'CNPJ' ? '00.000.000/0001-00' : '000.000.000-00'}
                    maxLength={tipoDocumento === 'CNPJ' ? 18 : 14}
                    {...register('cnpj')}
                    onChange={(e) => setValue('cnpj', maskDoc(e.target.value, tipoDocumento), { shouldValidate: true })}
                  />
                  {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj.message}</p>}
                </div>
              </div>

              {/* Razão Social / Nome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{tipoDocumento === 'CNPJ' ? 'Razão Social' : 'Nome Completo'} *</Label>
                  <Input
                    placeholder={tipoDocumento === 'CNPJ' ? 'Ex: Metalúrgica São Paulo Ltda.' : 'Ex: João da Silva'}
                    {...register('name')}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                {/* Nome Fantasia — apenas para PJ */}
                {tipoDocumento === 'CNPJ' && (
                  <div className="space-y-1.5">
                    <Label>Nome Fantasia</Label>
                    <Input placeholder="Ex: MetalSP" {...register('tradeName')} />
                  </div>
                )}
              </div>

              {/* CNAE — apenas para PJ */}
              {tipoDocumento === 'CNPJ' && (
                <div className="space-y-1.5">
                  <Label>CNAE Principal</Label>
                  <Input placeholder="Ex: 2599-3/99 — Fabricação de outros produtos de metal" {...register('cnae')} />
                </div>
              )}

            </CardContent>
          </Card>

          {/* ── Localização ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Localização</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* CEP com busca automática */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <div className="relative">
                    <Input
                      placeholder="00000-000"
                      maxLength={9}
                      {...register('addressZipCode')}
                      onChange={(e) => {
                        const masked = maskCep(e.target.value)
                        setValue('addressZipCode', masked)
                        if (masked.replace(/\D/g, '').length === 8) buscarCep(masked)
                      }}
                    />
                    {buscandoCep && (
                      <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!buscandoCep && (
                      <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    )}
                  </div>
                </div>

                {/* Logradouro */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Logradouro (Rua/Av/Beco)</Label>
                  <Input placeholder="Ex: Rua das Flores" {...register('addressStreet')} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input placeholder="Ex: 123" {...register('addressNumber')} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Complemento</Label>
                  <Input placeholder="Ex: Sala 4, Bloco B" {...register('addressComplement')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input placeholder="Ex: Centro" {...register('addressNeighborhood')} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Cidade</Label>
                  <Input placeholder="Ex: São Paulo" {...register('addressCity')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    {...register('addressState')}
                  >
                    <option value="">Selecione</option>
                    {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 0000-0000"
                    maxLength={15}
                    {...register('phone')}
                    onChange={(e) => setValue('phone', maskPhone(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* ── Responsável ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Responsável Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nome do Responsável</Label>
                  <Input placeholder="Ex: João da Silva" {...register('responsibleName')} />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF do Responsável</Label>
                  <Input
                    placeholder="000.000.000-00"
                    maxLength={14}
                    {...register('responsibleCpf')}
                    onChange={(e) => setValue('responsibleCpf', maskCpf(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Status da Empresa ───────────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Status da Empresa</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer w-fit">
                <div
                  onClick={() => setValue('isActive', !isActive)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {isActive ? 'Ativo' : 'Inativo'}
                </span>
              </label>
            </CardContent>
          </Card>

          {/* ── Botão Salvar ─────────────────────────────────────── */}
          <div className="flex justify-center pb-6">
            <Button type="submit" size="lg" disabled={createCompanyMutation.isPending} className="min-w-[160px]">
              {createCompanyMutation.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                : <><Save className="h-4 w-4 mr-2" /> Salvar</>
              }
            </Button>
          </div>

        </form>
      </div>
    </>
  )
}
