'use client'

// Tela de seleção de empresa — exibida após todo login antes de entrar no ambiente.
// A empresa selecionada define o contexto ativo usado pelas telas operacionais.

import Image from 'next/image'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, LogOut, Building2, Loader2, CheckCircle2,
  MapPin, Check, LogIn, User, Plus,
} from 'lucide-react'
import companySelectLogoHorizontal from '@/assets/brand/company-select-logo-horizontal.png'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { useCompanyStore, ActiveCompany } from '@/store/company.store'
import { useCompanies } from '@/hooks/use-companies'
import { useTenants } from '@/hooks/use-tenants'

// Deriva Matriz/Filial pelo número do estabelecimento no CNPJ (dígitos 9-12).
// CNPJ "0001" = Matriz (sede), demais = Filial. Segue a regra da Receita Federal.
function getTipoEmpresa(cnpj: string): 'Matriz' | 'Filial' {
  const digits = cnpj.replace(/\D/g, '')
  return digits.slice(8, 12) === '0001' ? 'Matriz' : 'Filial'
}

// Componente interno que usa useSearchParams (requer Suspense no Next.js)
function SelecionarEmpresaContent() {
  const router           = useRouter()
  const searchParams     = useSearchParams()
  const user             = useAuthStore((s) => s.user)
  const hasHydrated      = useAuthStore((s) => s.hasHydrated)
  const isAuthenticated  = useAuthStore((s) => s.isAuthenticated)
  const logout           = useAuthStore((s) => s.logout)
  const setActiveCompany = useCompanyStore((s) => s.setActiveCompany)

  const [search, setSearch]             = useState('')
  const [searchDebounced, setDebounced] = useState('')
  const [empresaSelecionada, setEmpresaSelecionada] = useState<ActiveCompany | null>(null)
  const [confirmando, setConfirmando]               = useState(false)
  const [successMsg, setSuccessMsg]                 = useState<string | null>(null)
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lê a mensagem de sucesso da URL e limpa o parâmetro após exibir
  useEffect(() => {
    const msg = searchParams.get('msg')
    if (msg) {
      setSuccessMsg(decodeURIComponent(msg))
      const redirect = searchParams.get('redirect')
      const params = new URLSearchParams()
      if (redirect) params.set('redirect', redirect)
      router.replace(`/selecionar-empresa${params.toString() ? `?${params.toString()}` : ''}`)
    }
  }, [searchParams, router])

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [hasHydrated, isAuthenticated, router])

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const { data: empresasResponse, isLoading, isError, refetch } = useCompanies(
    {
      page: 1,
      perPage: 100,
      search: searchDebounced || undefined,
    },
    Boolean(user),
  )
  const { data: tenantsResponse } = useTenants({ page: 1, perPage: 100 }, isSuperAdmin)
  const empresas = empresasResponse?.data ?? []
  const tenants = tenantsResponse?.data ?? []

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebounced(v), 300)
  }

  // Clique na linha — marca empresa como selecionada mas NÃO navega ainda
  function handleMarcar(empresa: ActiveCompany) {
    setEmpresaSelecionada(empresa)
  }

  // Clique no botão "Continuar" — confirma e navega
  function handleConfirmar() {
    if (!empresaSelecionada) return
    setConfirmando(true)
    setActiveCompany(empresaSelecionada)
    router.push(resolveSafeRedirect(searchParams.get('redirect')))
  }

  async function handleSair() {
    await logout()
    router.push('/login')
  }

  const vazia = !isLoading && !isError && empresas.length === 0

  function handlePrimeiroCadastro() {
    if (isSuperAdmin && tenants.length === 0) {
      router.push('/dashboard/tenants')
      return
    }
    router.push('/dashboard/empresas')
  }

  return (
    <>
      {/* ─────────────────────────────────────────
          Layout MOBILE — visível apenas em telas < sm
      ───────────────────────────────────────── */}
      <div className="sm:hidden min-h-screen bg-[#F5F7FA] flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-border">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>

          <Image
            src={companySelectLogoHorizontal}
            alt="MOBY Gestão em Segurança do Trabalho"
            priority
            className="h-7 w-auto"
          />

          <button
            onClick={handleSair}
            className="h-10 w-10 rounded-xl border border-red-200 flex items-center justify-center bg-white"
          >
            <LogOut className="h-5 w-5 text-red-400" />
          </button>
        </header>

        {/* Banner de sucesso */}
        {successMsg && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-medium text-white">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Conteúdo principal com scroll */}
        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-28 space-y-5">

          {/* Título da página */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Selecionar empresa</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Escolha a empresa ou filial para continuar.
              </p>
            </div>
          </div>

          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Razão social, CNPJ ou nome fantasia"
              value={search}
              onChange={handleSearchChange}
              className="w-full h-13 rounded-2xl border-2 border-primary/40 bg-white pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Heading da lista */}
          {!isLoading && !isError && empresas.length > 0 && (
            <p className="text-sm font-semibold text-foreground">Empresas encontradas</p>
          )}

          {/* Estado de loading */}
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Estado de erro */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
              <p className="text-sm">Não foi possível carregar as empresas.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          )}

          {/* Cards de empresa */}
          {!isLoading && !isError && empresas.map((empresa) => {
            const marcada = empresaSelecionada?.id === empresa.id
            const tipo = getTipoEmpresa(empresa.cnpj)

            return (
              <button
                key={empresa.id}
                onClick={() => handleMarcar(empresa)}
                className="w-full text-left"
              >
                <div className={cn(
                  'rounded-2xl border-2 p-4 bg-white transition-all',
                  marcada
                    ? 'border-primary bg-primary/5'
                    : 'border-border',
                )}>
                  <div className="flex items-start gap-3">
                    {/* Ícone da empresa */}
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Building2 className="h-6 w-6 text-blue-400" />
                    </div>

                    {/* Dados da empresa */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground uppercase leading-tight">
                        {empresa.name}
                        {empresa.tradeName ? ` (${empresa.tradeName})` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        CNPJ: {empresa.cnpj}
                      </p>

                      {/* Tags: Matriz/Filial + Unidades */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-600 font-medium">
                          <Building2 className="h-3 w-3" />
                          {tipo}
                        </span>
                        <span className="text-muted-foreground/40 text-xs">|</span>
                        <span className="inline-flex items-center gap-1 text-xs text-blue-500">
                          <MapPin className="h-3 w-3" />
                          {empresa.unitCount ?? 0} unidades vinculadas
                        </span>
                      </div>
                    </div>

                    {/* Radio button */}
                    <div className={cn(
                      'h-6 w-6 rounded-full border-2 shrink-0 flex items-center justify-center mt-1 transition-colors',
                      marcada
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground/30',
                    )}>
                      {marcada && <Check className="h-3.5 w-3.5 text-white" />}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          {/* Estado vazio */}
          {vazia && (
            <p className="text-center text-sm text-muted-foreground py-6">
              {isSuperAdmin && tenants.length === 0
                ? 'Nenhum ambiente ou empresa encontrado.'
                : 'Nenhuma empresa encontrada.'}
            </p>
          )}

          {/* Card "Não encontrou sua empresa?" */}
          <button
            onClick={handlePrimeiroCadastro}
            className="w-full text-left rounded-2xl border border-dashed border-border bg-gray-50 p-4"
          >
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0 relative">
                <Building2 className="h-6 w-6 text-gray-400" />
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <Plus className="h-2.5 w-2.5 text-gray-500" />
                </div>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Não encontrou sua empresa?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cadastre uma empresa para que a lista esteja disponível.
                </p>
                <p className="text-xs text-primary font-semibold mt-2">
                  Cadastrar empresa ›
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Botão "Continuar" fixo na base */}
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-border sm:hidden">
          <Button
            onClick={handleConfirmar}
            disabled={!empresaSelecionada || confirmando}
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
          >
            {confirmando
              ? <><Loader2 className="h-5 w-5 animate-spin" /> Entrando...</>
              : <><LogIn className="h-5 w-5" /> Continuar</>
            }
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────
          Layout DESKTOP — visível apenas em telas >= sm
      ───────────────────────────────────────── */}
      <div className="hidden sm:flex min-h-screen bg-background flex-col items-center justify-start pt-10 px-4">

        {/* Logo centralizado */}
        <div className="mb-8 flex justify-center">
          <Image
            src={companySelectLogoHorizontal}
            alt="MOBY Gestão em Segurança do Trabalho"
            priority
            className="h-auto w-full max-w-[320px] sm:max-w-[420px]"
          />
        </div>

        {/* Banner de sucesso */}
        {successMsg && (
          <div className="w-full max-w-2xl mb-4 flex items-center gap-2 rounded-md bg-green-500 px-4 py-3 text-sm font-medium text-white shadow-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Painel central */}
        <div className="w-full max-w-2xl">

          {/* Busca + botão Sair */}
          <div className="mb-1">
            <p className="text-sm font-medium text-muted-foreground mb-1.5">Buscar Empresa / Filial</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  autoFocus
                  type="text"
                  placeholder="Razão social, nome fantasia ou CNPJ"
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full h-10 rounded-md border border-input bg-card px-3 pr-10 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <Button variant="destructive" size="sm" onClick={handleSair} className="h-10 px-4 gap-1.5">
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </Button>
            </div>
          </div>

          {/* Seção da lista */}
          <div className="mt-4 rounded-md border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold text-foreground">Empresa Matriz / Filiais</p>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando empresas...</span>
              </div>
            )}

            {isError && !isLoading && (
              <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
                <p className="text-sm">Não foi possível carregar as empresas.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}

            {!isLoading && !isError && empresas.length > 0 && (
              <div className="divide-y divide-border">
                {empresas.map((empresa) => {
                  const marcada = empresaSelecionada?.id === empresa.id
                  return (
                    <button
                      key={empresa.id}
                      onClick={() => handleMarcar(empresa)}
                      className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${marcada ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary shrink-0" />
                        <span className="text-sm text-foreground">
                          <span className="font-mono text-muted-foreground">{empresa.cnpj}</span>
                          {' — '}
                          <span className="font-medium">
                            {empresa.name}
                            {empresa.tradeName ? ` (${empresa.tradeName})` : ''}
                          </span>
                        </span>
                      </div>
                      {/* Radio button visual */}
                      <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${marcada ? 'border-primary' : 'border-muted-foreground/40'}`}>
                        {marcada && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {vazia && (
              <div className="py-6 px-4 text-center text-sm text-muted-foreground">
                {isSuperAdmin && tenants.length === 0
                  ? 'Nenhum ambiente ou empresa encontrado.'
                  : 'Nenhuma empresa encontrada.'}
              </div>
            )}
          </div>

          {/* Rodapé com link de cadastro */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSuperAdmin && tenants.length === 0
              ? 'Crie o primeiro ambiente para começar e depois cadastre a primeira empresa. '
              : 'Selecione acima uma empresa para trabalhar ou '}
            <button
              onClick={handlePrimeiroCadastro}
              className="text-primary font-medium hover:underline"
            >
              {isSuperAdmin && tenants.length === 0
                ? 'Ir para ambientes.'
                : 'Cadastre uma empresa caso a lista esteja vazia.'}
            </button>
          </p>

          {/* Botão Selecionar */}
          <div className="mt-4 flex justify-center">
            <Button
              onClick={handleConfirmar}
              disabled={!empresaSelecionada || confirmando}
              className="min-w-[140px]"
            >
              {confirmando
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...</>
                : 'Selecionar'
              }
            </Button>
          </div>

          {user && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Conectado como <span className="font-medium text-foreground">{user.name}</span>
            </p>
          )}
        </div>
      </div>
    </>
  )
}

// Envolve em Suspense pois useSearchParams requer boundary no Next.js App Router
export default function SelecionarEmpresaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <SelecionarEmpresaContent />
    </Suspense>
  )
}

function resolveSafeRedirect(redirect: string | null) {
  if (!redirect || redirect === '/') return '/dashboard'
  if (!redirect.startsWith('/') || redirect.startsWith('//')) return '/dashboard'
  if (redirect.startsWith('/login') || redirect.startsWith('/selecionar-empresa')) return '/dashboard'
  return redirect
}
