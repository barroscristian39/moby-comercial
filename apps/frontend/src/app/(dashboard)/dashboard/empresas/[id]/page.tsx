'use client'

import { useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCompany } from '@/hooks/use-companies'
import { useCompanyStore } from '@/store/company.store'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

function formatText(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized ? normalized : '—'
}

function formatAddress(company: {
  addressStreet: string | null
  addressNumber: string | null
  addressComplement: string | null
  addressNeighborhood: string | null
  addressCity: string | null
  addressState: string | null
  addressZipCode: string | null
}) {
  const lines = [
    [company.addressStreet, company.addressNumber].filter(Boolean).join(', '),
    [company.addressNeighborhood, company.addressComplement].filter(Boolean).join(' • '),
    [company.addressCity, company.addressState].filter(Boolean).join(' / '),
    company.addressZipCode ?? '',
  ].filter((line) => line && line.trim().length > 0)

  return lines.length > 0 ? lines.join('\n') : '—'
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">{value}</p>
    </div>
  )
}

export default function EmpresaPerfilPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany)
  const companyId = typeof params?.id === 'string' ? params.id : undefined

  const { data: company, isLoading, isError } = useCompany(companyId)

  const companyAddress = useMemo(() => {
    if (!company) return '—'
    return formatAddress(company)
  }, [company])

  function acessarEmpresa() {
    if (!company || !company.isActive) return

    setActiveCompany({
      id: company.id,
      name: company.name,
      tradeName: company.tradeName,
      cnpj: company.cnpj,
    })

    router.push('/dashboard/gro')
  }

  return (
    <>
      <Topbar
        title="Perfil da Empresa"
        subtitle={company ? company.tradeName ?? company.name : 'Dados cadastrais e contexto operacional'}
      />

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/empresas')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar para empresas
          </Button>

          <Button onClick={acessarEmpresa} disabled={!company || !company.isActive}>
            <LogIn className="h-4 w-4" />
            Entrar na empresa
          </Button>
        </div>

        {isLoading && (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando dados da empresa...
            </CardContent>
          </Card>
        )}

        {isError && (
          <Card>
            <CardContent className="py-16 text-center text-sm text-destructive">
              Não foi possível carregar o perfil da empresa.
            </CardContent>
          </Card>
        )}

        {company && (
          <>
            <Card className="border-border/70">
              <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <h1 className="text-2xl font-semibold text-foreground">
                        {company.tradeName ?? company.name}
                      </h1>
                      {company.tradeName && (
                        <p className="text-sm text-muted-foreground">{company.name}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={company.isActive ? 'success' : 'secondary'}>
                        {company.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Badge variant="muted">CNPJ {company.cnpj}</Badge>
                      <Badge variant="muted">{company.unitCount} unidade{company.unitCount !== 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span>Criada em {formatDate(company.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span>Atualizada em {formatDate(company.updatedAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader>
                  <CardTitle>Dados cadastrais</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-5 md:grid-cols-2">
                  <InfoItem label="Razão social" value={formatText(company.name)} />
                  <InfoItem label="Nome fantasia" value={formatText(company.tradeName)} />
                  <InfoItem label="CNPJ" value={formatText(company.cnpj)} />
                  <InfoItem label="CNAE" value={formatText(company.cnae)} />
                  <InfoItem label="Endereço" value={companyAddress} />
                  <InfoItem
                    label="Situação"
                    value={company.isActive ? 'Empresa ativa no sistema' : 'Empresa inativa no sistema'}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contato e responsável</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex items-start gap-3">
                    <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Responsável</p>
                      <p className="text-sm text-foreground">{formatText(company.responsibleName)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">E-mail</p>
                      <p className="text-sm text-foreground break-all">{formatText(company.email)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Telefone</p>
                      <p className="text-sm text-foreground">{formatText(company.phone)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Localização</p>
                      <p className="text-sm whitespace-pre-line text-foreground">{companyAddress}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}
