'use client'

// Página de Configurações do Sistema (Fase 6 — Sistema)
// Organizada em seções: Perfil do usuário, Notificações e Preferências.

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Bell, Settings, Save, Shield } from 'lucide-react'
import { Topbar } from '@/components/layout/topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/store/auth.store'

// ─── Validação ───────────────────────────────────────────────────────────────

// Schema para atualização do perfil do usuário
const perfilSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
})

// Schema para alteração de senha
const senhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: z.string().min(8, 'A nova senha deve ter pelo menos 8 caracteres'),
  confirmarSenha: z.string().min(1, 'Confirme a nova senha'),
}).refine((d) => d.novaSenha === d.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

type PerfilFormData = z.infer<typeof perfilSchema>
type SenhaFormData  = z.infer<typeof senhaSchema>

// ─── Componente: Toggle de notificação ───────────────────────────────────────

// Componente reutilizável para cada opção de notificação com toggle on/off
function NotificacaoToggle({ label, descricao, checked, onChange }: {
  label: string; descricao: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
      {/* Toggle visual — substituir por componente Switch quando disponível */}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-muted'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  // Dados do usuário logado vindo do store de autenticação
  const user = useAuthStore((s) => s.user)

  // Controla qual seção está ativa (perfil, notificações, preferências)
  const [secaoAtiva, setSecaoAtiva] = useState<'perfil' | 'notificacoes' | 'preferencias'>('perfil')

  // Estado das preferências de notificação
  const [notificacoes, setNotificacoes] = useState({
    epiVencendo:        true,
    exameVencendo:      true,
    treinamentoVencendo:true,
    planoAtrasado:      true,
    novosRiscos:        false,
    relatorioSemanal:   false,
  })

  // Formulário de edição de perfil
  const perfilForm = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })

  // Formulário de troca de senha
  const senhaForm = useForm<SenhaFormData>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmarSenha: '' },
  })

  // TODO: integrar com PATCH /api/users/:id para salvar perfil
  function salvarPerfil(data: PerfilFormData) {
    console.log('Salvando perfil:', data)
    alert('Perfil atualizado com sucesso! (integração com API pendente)')
  }

  // TODO: integrar com POST /api/auth/change-password para trocar senha
  function trocarSenha(data: SenhaFormData) {
    console.log('Trocando senha:', data)
    senhaForm.reset()
    alert('Senha alterada com sucesso! (integração com API pendente)')
  }

  // Menu de navegação lateral das seções de configuração
  const secoes = [
    { id: 'perfil' as const,         label: 'Perfil',          icon: User },
    { id: 'notificacoes' as const,   label: 'Notificações',    icon: Bell },
    { id: 'preferencias' as const,   label: 'Preferências',    icon: Settings },
  ]

  return (
    <>
      <Topbar title="Configurações" subtitle="Gerencie seu perfil, notificações e preferências" />
      <div className="p-6">
        <div className="flex gap-6 max-w-4xl">

          {/* Menu lateral de navegação entre seções */}
          <nav className="w-48 shrink-0 space-y-1">
            {secoes.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  onClick={() => setSecaoAtiva(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${secaoAtiva === s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {s.label}
                </button>
              )
            })}
          </nav>

          {/* Conteúdo da seção ativa */}
          <div className="flex-1 space-y-4">

            {/* ── Seção: Perfil ── */}
            {secaoAtiva === 'perfil' && (
              <>
                {/* Card de informações do perfil */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Dados do Perfil</CardTitle>
                    <CardDescription>Atualize seu nome e e-mail de acesso ao sistema.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Avatar com iniciais do usuário */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white text-lg font-bold">
                        {user?.name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{user?.name ?? 'Usuário'}</p>
                        <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
                        {/* Badge do perfil de acesso */}
                        <span className="inline-flex items-center gap-1 mt-1 text-xs text-primary">
                          <Shield className="h-3 w-3" />{user?.role ?? 'USER'}
                        </span>
                      </div>
                    </div>
                    <form onSubmit={perfilForm.handleSubmit(salvarPerfil)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Nome Completo *</Label>
                          <Input {...perfilForm.register('name')} />
                          {perfilForm.formState.errors.name && <p className="text-xs text-destructive">{perfilForm.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>E-mail *</Label>
                          <Input type="email" {...perfilForm.register('email')} />
                          {perfilForm.formState.errors.email && <p className="text-xs text-destructive">{perfilForm.formState.errors.email.message}</p>}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm">
                          <Save className="h-3.5 w-3.5 mr-1.5" />Salvar Perfil
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Card de troca de senha */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Alterar Senha</CardTitle>
                    <CardDescription>Use uma senha forte com pelo menos 8 caracteres.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={senhaForm.handleSubmit(trocarSenha)} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Senha Atual *</Label>
                        <Input type="password" placeholder="••••••••" {...senhaForm.register('senhaAtual')} />
                        {senhaForm.formState.errors.senhaAtual && <p className="text-xs text-destructive">{senhaForm.formState.errors.senhaAtual.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>Nova Senha *</Label>
                          <Input type="password" placeholder="••••••••" {...senhaForm.register('novaSenha')} />
                          {senhaForm.formState.errors.novaSenha && <p className="text-xs text-destructive">{senhaForm.formState.errors.novaSenha.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Confirmar Nova Senha *</Label>
                          <Input type="password" placeholder="••••••••" {...senhaForm.register('confirmarSenha')} />
                          {senhaForm.formState.errors.confirmarSenha && <p className="text-xs text-destructive">{senhaForm.formState.errors.confirmarSenha.message}</p>}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" size="sm" variant="outline">Alterar Senha</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Seção: Notificações ── */}
            {secaoAtiva === 'notificacoes' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Preferências de Notificação</CardTitle>
                  <CardDescription>Escolha quais alertas deseja receber por e-mail e no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 divide-y divide-border">
                    <NotificacaoToggle
                      label="EPI com CA a vencer" descricao="Alerta 90 dias antes do vencimento do CA"
                      checked={notificacoes.epiVencendo}
                      onChange={(v) => setNotificacoes((p) => ({ ...p, epiVencendo: v }))}
                    />
                    <NotificacaoToggle
                      label="Exame periódico a vencer" descricao="Alerta 60 dias antes do vencimento do exame"
                      checked={notificacoes.exameVencendo}
                      onChange={(v) => setNotificacoes((p) => ({ ...p, exameVencendo: v }))}
                    />
                    <NotificacaoToggle
                      label="Treinamento a vencer" descricao="Alerta 90 dias antes do vencimento do treinamento"
                      checked={notificacoes.treinamentoVencendo}
                      onChange={(v) => setNotificacoes((p) => ({ ...p, treinamentoVencendo: v }))}
                    />
                    <NotificacaoToggle
                      label="Plano de ação atrasado" descricao="Notifica quando um controle passa da data limite"
                      checked={notificacoes.planoAtrasado}
                      onChange={(v) => setNotificacoes((p) => ({ ...p, planoAtrasado: v }))}
                    />
                    <NotificacaoToggle
                      label="Novos riscos identificados" descricao="Notifica quando um novo risco é cadastrado"
                      checked={notificacoes.novosRiscos}
                      onChange={(v) => setNotificacoes((p) => ({ ...p, novosRiscos: v }))}
                    />
                    <NotificacaoToggle
                      label="Relatório semanal de conformidade" descricao="Resumo semanal por e-mail toda segunda-feira"
                      checked={notificacoes.relatorioSemanal}
                      onChange={(v) => setNotificacoes((p) => ({ ...p, relatorioSemanal: v }))}
                    />
                  </div>
                  <Separator className="my-4" />
                  <div className="flex justify-end">
                    {/* TODO: integrar com PATCH /api/users/:id/notifications */}
                    <Button size="sm" onClick={() => alert('Preferências salvas! (integração pendente)')}>
                      <Save className="h-3.5 w-3.5 mr-1.5" />Salvar Preferências
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Seção: Preferências ── */}
            {secaoAtiva === 'preferencias' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Preferências do Sistema</CardTitle>
                  <CardDescription>Configurações gerais de exibição e comportamento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Configuração de antecedência dos alertas */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Antecedência dos Alertas</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">EPI — dias antes do vencimento do CA</Label>
                        <Input type="number" defaultValue={90} min={7} max={365} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Exames — dias de antecedência</Label>
                        <Input type="number" defaultValue={60} min={7} max={365} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Treinamentos — dias de antecedência</Label>
                        <Input type="number" defaultValue={90} min={7} max={365} className="h-8 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Planos de Ação — dias de antecedência</Label>
                        <Input type="number" defaultValue={15} min={1} max={90} className="h-8 text-xs" />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  {/* Informações da versão do sistema */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Sobre o Sistema</p>
                    <div className="rounded-md bg-muted p-3 space-y-1">
                      <p className="text-xs text-muted-foreground">Versão: <span className="text-foreground font-mono">0.1.0-dev</span></p>
                      <p className="text-xs text-muted-foreground">Ambiente: <span className="text-foreground">Desenvolvimento</span></p>
                      <p className="text-xs text-muted-foreground">Stack: <span className="text-foreground">Next.js 14 + NestJS + PostgreSQL</span></p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => alert('Preferências salvas! (integração pendente)')}>
                      <Save className="h-3.5 w-3.5 mr-1.5" />Salvar Preferências
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
